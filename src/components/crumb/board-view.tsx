import { BOARD_SPECS } from "@/lib/crumb/board";
import { getPart } from "@/lib/crumb/catalog";
import { focusedHoles, holeOpacity, itemOpacity, selectableIds } from "@/lib/crumb/focus";
import { boardGeom, HOLE_R, MODULE_PIN_R, PITCH, moduleCardGeom, projectGeom } from "@/lib/crumb/geometry";
import { holeId, parseHole } from "@/lib/crumb/holes";
import { dipBounds, dipSilkFontSize, dipSilkX } from "@/lib/crumb/dip-draw";
import { dipPinCaption, dipPinHole, dipMirrorStrips, dipSilkLeftSide, resolveEndpoint } from "@/lib/crumb/layout";
import { computeNets, netForHole } from "@/lib/crumb/nets";
import { detectShorts, shortHoles } from "@/lib/crumb/shorts";
import { useCrumb } from "@/lib/crumb/store";
import type { HoleRef, Project, TerminalCol } from "@/lib/crumb/types";
import { computeWireLanes, jumperPath, wireGeomsFromProject } from "@/lib/crumb/wire-path";
import { leadHoles } from "@/lib/crumb/mutate";
import { leadedMarkup } from "@/lib/crumb/part-draw";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const COLS: TerminalCol[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.4;
const PAN_SLOP = 8;

function clampZoom(value: number): number {
  if (value < MIN_ZOOM) return MIN_ZOOM;
  if (value > MAX_ZOOM) return MAX_ZOOM;
  return value;
}

function holeFill(
  id: string,
  kind: HoleRef["kind"] | "module",
  shorted: Set<string>,
  wireFrom: string | null,
  lit: Set<string>,
): string {
  if (shorted.has(id)) return "fill-bad crumb-hole-short";
  if (wireFrom === id) return "fill-hole-active";
  if (lit.has(id)) return "fill-hole-lit crumb-hole-lit";
  if (kind === "rail") return "fill-hole-rail";
  return "fill-hole";
}

export function BoardView() {
  const project = useCrumb((s) => s.project);
  const hoverHole = useCrumb((s) => s.hoverHole);
  const highlightNet = useCrumb((s) => s.highlightNet);
  const selected = useCrumb((s) => s.selected);
  const wireFrom = useCrumb((s) => s.wireFrom);
  const clickHole = useCrumb((s) => s.clickHole);
  const setHoverHole = useCrumb((s) => s.setHoverHole);
  const setHighlightNet = useCrumb((s) => s.setHighlightNet);
  const setSelected = useCrumb((s) => s.setSelected);

  const geom = useMemo(() => projectGeom(project), [project]);
  const board = useMemo(() => boardGeom(project.board), [project.board]);
  const spec = BOARD_SPECS[project.board];
  const nets = useMemo(() => computeNets(project), [project]);
  const shorts = useMemo(() => detectShorts(project, nets), [project, nets]);
  const shorted = useMemo(() => shortHoles(shorts), [shorts]);
  const selectable = useMemo(() => selectableIds(project), [project]);
  const focus = useMemo(() => focusedHoles(project, selected), [project, selected]);
  const wireGeoms = useMemo(() => wireGeomsFromProject(project, geom, resolveEndpoint), [project, geom]);
  const wireLanes = useMemo(() => computeWireLanes(wireGeoms), [wireGeoms]);
  const activeNet = highlightNet ? nets.find((n) => n.id === highlightNet) : undefined;
  const hoverNet = hoverHole ? netForHole(nets, hoverHole) : undefined;
  const lit = new Set([...(activeNet?.holes ?? []), ...(hoverNet?.holes ?? [])]);
  const [zoom, setZoom] = useState(1);
  const [pane, setPane] = useState({ w: 800, h: 560 });
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const anchorRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{ id: number; x: number; y: number; sl: number; st: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    midX: number;
    midY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const fit = Math.min(pane.w / geom.width, pane.h / geom.height) * 0.96;
  const displayW = Math.max(1, geom.width * fit * zoom);
  const displayH = Math.max(1, geom.height * fit * zoom);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => {
      const rect = frame.getBoundingClientRect();
      setPane({ w: Math.max(1, rect.width), h: Math.max(1, rect.height) });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const el = scrollerRef.current;
    if (!anchor || !el) return;
    anchorRef.current = null;
    el.scrollLeft = anchor.scrollLeft;
    el.scrollTop = anchor.scrollTop;
  }, [zoom]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= el.clientHeight;
      const gain = event.ctrlKey ? 0.01 : 0.0016;
      const prev = zoomRef.current;
      const next = clampZoom(prev * Math.exp(-delta * gain));
      zoomAt(next, event.clientX, event.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomAt = (next: number, clientX: number, clientY: number) => {
    const el = scrollerRef.current;
    const prev = zoomRef.current;
    const clamped = clampZoom(next);
    if (!el || clamped === prev) return;
    const rect = el.getBoundingClientRect();
    const ox = clientX - rect.left;
    const oy = clientY - rect.top;
    const ratio = clamped / prev;
    anchorRef.current = {
      scrollLeft: (ox + el.scrollLeft) * ratio - ox,
      scrollTop: (oy + el.scrollTop) * ratio - oy,
    };
    zoomRef.current = clamped;
    setZoom(clamped);
  };

  const stepZoom = (delta: number) => {
    const el = scrollerRef.current;
    const rect = el?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : 0;
    const y = rect ? rect.top + rect.height / 2 : 0;
    zoomAt(+(zoomRef.current + delta).toFixed(2), x, y);
  };

  const resetZoom = () => {
    zoomRef.current = 1;
    const el = scrollerRef.current;
    if (zoom === 1 && el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
      return;
    }
    anchorRef.current = { scrollLeft: 0, scrollTop: 0 };
    setZoom(1);
  };

  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size < 2) return;
    suppressClick.current = true;
    panRef.current = null;
    const pts = [...pointers.current.values()];
    const el = scrollerRef.current;
    pinchRef.current = {
      dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
      zoom: zoomRef.current,
      midX: (pts[0].x + pts[1].x) / 2,
      midY: (pts[0].y + pts[1].y) / 2,
      scrollLeft: el?.scrollLeft ?? 0,
      scrollTop: el?.scrollTop ?? 0,
    };
    event.stopPropagation();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 1) event.preventDefault();
    if (pointers.current.size !== 1) return;
    const el = scrollerRef.current;
    if (!el) return;
    const mouse = event.pointerType === "mouse";
    if (mouse && event.button !== 0 && event.button !== 1) return;
    if (mouse && event.button === 0) {
      const tag = (event.target as Element | null)?.tagName.toLowerCase();
      if (tag === "circle" || tag === "path" || tag === "text" || tag === "g") return;
    }
    panRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      sl: el.scrollLeft,
      st: el.scrollTop,
      moved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const el = scrollerRef.current;
    if (pointers.current.size >= 2 && pinchRef.current && el) {
      const pts = [...pointers.current.values()];
      const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const pinch = pinchRef.current;
      const next = clampZoom(pinch.zoom * (dist / pinch.dist));
      const rect = el.getBoundingClientRect();
      const ratio = next / pinch.zoom;
      const scrollLeft = (pinch.midX - rect.left + pinch.scrollLeft) * ratio - (midX - rect.left);
      const scrollTop = (pinch.midY - rect.top + pinch.scrollTop) * ratio - (midY - rect.top);
      if (next !== zoomRef.current) {
        anchorRef.current = { scrollLeft, scrollTop };
        zoomRef.current = next;
        setZoom(next);
      } else {
        el.scrollLeft = scrollLeft;
        el.scrollTop = scrollTop;
      }
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.id !== event.pointerId || !el) return;
    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < PAN_SLOP) return;
    if (!pan.moved) {
      pan.moved = true;
      suppressClick.current = true;
      el.setPointerCapture(event.pointerId);
    }
    el.scrollLeft = pan.sl - dx;
    el.scrollTop = pan.st - dy;
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (panRef.current?.id === event.pointerId) {
      if (panRef.current.moved) suppressClick.current = true;
      panRef.current = null;
    }
    if (pointers.current.size < 2) pinchRef.current = null;
  };

  return (
    <div
      ref={frameRef}
      className="relative h-full min-h-[280px] bg-bench"
      role="region"
      aria-label={`${spec.label} solderless breadboard. Columns a to e on a row are one strip, f to j are another.`}
    >
      <p id="board-keyboard-help" className="sr-only">
        Use the catalog to place a part. Choose a part under On the board and press Delete to remove it. The scroll
        wheel zooms. Drag to pan.
      </p>
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-2 print:hidden">
        <button
          type="button"
          className="pointer-events-auto h-10 rounded-md bg-surface px-3 text-sm"
          aria-label="Zoom out"
          onClick={() => stepZoom(-0.2)}
        >
          −
        </button>
        <button
          type="button"
          className="pointer-events-auto h-10 rounded-md bg-surface px-3 text-sm"
          aria-label="Reset zoom"
          title="Reset zoom"
          onClick={resetZoom}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="pointer-events-auto h-10 rounded-md bg-surface px-3 text-sm"
          aria-label="Zoom in"
          onClick={() => stepZoom(0.2)}
        >
          +
        </button>
      </div>
      <div
        ref={scrollerRef}
        className="crumb-board absolute inset-0 overflow-auto"
        style={{ touchAction: "none" }}
        aria-describedby="board-keyboard-help"
        onPointerDownCapture={onPointerDownCapture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onAuxClick={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
      >
        <svg
          viewBox={`0 0 ${geom.width} ${geom.height}`}
          width={displayW}
          height={displayH}
          className="block"
          role="group"
          aria-label={`${spec.label} breadboard, ${spec.rows} rows`}
        >
          <rect width={geom.width} height={geom.height} rx="8" className="fill-bench" />
          <rect x={geom.boardX} y="0" width={geom.boardWidth} height={board.height} rx="14" className="fill-board" />
          <rect
            x={geom.boardX + 10}
            y="10"
            width={geom.boardWidth - 20}
            height={board.height - 20}
            rx="10"
            className="fill-board-inner"
          />

          <RailStrip geom={geom} specRows={spec.rows} side="L" />
          <RailStrip geom={geom} specRows={spec.rows} side="R" />

          {Array.from({ length: spec.rows }, (_, i) => i + 1).map((row) => (
            <text
              key={`rn-${row}`}
              x={(geom.colX("e") + geom.colX("f")) / 2}
              y={geom.rowY(row) + 3}
              textAnchor="middle"
              className="fill-ink-faint font-mono"
              style={{ fontSize: 7 }}
            >
              {row}
            </text>
          ))}

          {COLS.map((col) => (
            <text
              key={`cn-${col}`}
              x={geom.colX(col)}
              y="22"
              textAnchor="middle"
              className="fill-ink-soft font-mono"
              style={{ fontSize: 8 }}
            >
              {col}
            </text>
          ))}

          {allHoles(spec.rows).map((hole) => {
            const id = holeId(hole);
            const { x, y } = geom.holeXY(hole);
            return (
              <circle
                key={id}
                cx={x}
                cy={y}
                r={HOLE_R}
                opacity={holeOpacity(focus, id)}
                className={holeFill(id, hole.kind, shorted, wireFrom, lit)}
                onMouseEnter={() => {
                  setHoverHole(id);
                  const net = netForHole(nets, id);
                  if (net) setHighlightNet(net.id);
                }}
                onMouseLeave={() => {
                  setHoverHole(null);
                  setHighlightNet(null);
                }}
                onClick={() => clickHole(id)}
                style={{ cursor: "pointer" }}
              />
            );
          })}

          {project.parts.map((part) => (
            <g key={part.id} opacity={itemOpacity(selected, part.id, selectable)}>
              {part.kind === "leaded" ? (
                <LeadedBody project={project} partId={part.id} geom={geom} />
              ) : part.kind === "module" ? (
                <ModuleCard project={project} partId={part.id} geom={geom} />
              ) : (
                <DipBody project={project} partId={part.id} geom={geom} />
              )}
            </g>
          ))}

          {project.wires.map((wire) => {
            const w = wireGeoms.find((g) => g.id === wire.id);
            if (!w) return null;
            const lane = wireLanes.get(wire.id) ?? { lane: 0, count: 1 };
            const a = resolveEndpoint(project, wire.from);
            if (!a) return null;
            const selectedWire = selected === wire.id;
            const aId = holeId(a);
            const shortWire = shorted.has(aId);
            return (
              <path
                key={wire.id}
                d={jumperPath(geom, w.ax, w.ay, w.bx, w.by, lane.lane, lane.count)}
                fill="none"
                stroke={shortWire ? "#c9897a" : wire.color}
                strokeWidth={selectedWire || shortWire ? 3.4 : 2.4}
                strokeLinecap="round"
                opacity={itemOpacity(selected, wire.id, selectable)}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(wire.id);
                }}
              />
            );
          })}

          {wireFrom && hoverHole && wireFrom !== hoverHole && (
            <RubberBand project={project} geom={geom} from={wireFrom} to={hoverHole} />
          )}

          {project.parts.map((part) => {
            if (part.kind !== "module") return null;
            const card = moduleCardGeom(project, part, geom);
            return card.pins.map((pin) => {
              return (
                <circle
                  key={pin.ref}
                  cx={pin.x}
                  cy={pin.y}
                  r={MODULE_PIN_R}
                  opacity={holeOpacity(focus, pin.ref)}
                  className={holeFill(pin.ref, "module", shorted, wireFrom, lit)}
                  stroke="#c9b896"
                  strokeWidth="0.8"
                  onMouseEnter={() => {
                    setHoverHole(pin.ref);
                    const net = netForHole(nets, pin.ref);
                    if (net) setHighlightNet(net.id);
                  }}
                  onMouseLeave={() => {
                    setHoverHole(null);
                    setHighlightNet(null);
                  }}
                  onClick={() => clickHole(pin.ref)}
                  style={{ cursor: "pointer" }}
                />
              );
            });
          })}
        </svg>
      </div>
    </div>
  );
}

function RubberBand({
  project,
  geom,
  from,
  to,
}: {
  project: Project;
  geom: ReturnType<typeof boardGeom>;
  from: string;
  to: string;
}) {
  const a = resolveEndpoint(project, from) ?? parseHole(from);
  const b = resolveEndpoint(project, to) ?? parseHole(to);
  if (!a || !b) return null;
  const pa = geom.holeXY(a);
  const pb = geom.holeXY(b);
  return (
    <line
      x1={pa.x}
      y1={pa.y}
      x2={pb.x}
      y2={pb.y}
      className="stroke-hole-active"
      strokeWidth="1.6"
      strokeDasharray="4 3"
      style={{ pointerEvents: "none" }}
    />
  );
}

function usePartDrag(partId: string) {
  const tool = useCrumb((s) => s.tool);
  const moveSelected = useCrumb((s) => s.moveSelected);
  const setSelected = useCrumb((s) => s.setSelected);
  const [dRow, setDRow] = useState(0);

  const onPointerDown = (e: ReactPointerEvent<SVGGElement>) => {
    if (tool !== "select") return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(partId);
    const startY = e.clientY;
    const svg = e.currentTarget.ownerSVGElement;
    const scale = svg?.getScreenCTM()?.a || 1;
    const move = (ev: PointerEvent) => {
      setDRow(Math.round((ev.clientY - startY) / (PITCH * scale)));
    };
    const up = (ev: PointerEvent) => {
      const next = Math.round((ev.clientY - startY) / (PITCH * scale));
      setDRow(0);
      moveSelected(next);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return { dRow, onPointerDown };
}

function allHoles(rows: number): HoleRef[] {
  const holes: HoleRef[] = [];
  for (let row = 1; row <= rows; row++) {
    for (const col of COLS) holes.push({ kind: "terminal", row, col });
    for (const side of ["L", "R"] as const) {
      for (const polarity of ["P", "M"] as const) {
        holes.push({ kind: "rail", side, polarity, row });
      }
    }
  }
  return holes;
}

function RailStrip({
  geom,
  specRows,
  side,
}: {
  geom: ReturnType<typeof boardGeom>;
  specRows: number;
  side: "L" | "R";
}) {
  const xP = geom.railX(side, "P") - PITCH * 0.42;
  const xM = geom.railX(side, "M") - PITCH * 0.42;
  const y = geom.rowY(1) - 10;
  const h = geom.rowY(specRows) - geom.rowY(1) + 20;
  return (
    <g>
      <rect x={xP} y={y} width={PITCH * 0.84} height={h} rx="4" className="fill-rail-plus" />
      <rect x={xM} y={y} width={PITCH * 0.84} height={h} rx="4" className="fill-rail-minus" />
      <text
        x={xP + PITCH * 0.42}
        y={y - 3}
        textAnchor="middle"
        className="fill-ink-soft font-mono"
        style={{ fontSize: 8 }}
      >
        +
      </text>
      <text
        x={xM + PITCH * 0.42}
        y={y - 3}
        textAnchor="middle"
        className="fill-ink-soft font-mono"
        style={{ fontSize: 8 }}
      >
        −
      </text>
    </g>
  );
}

function DipBody({
  project,
  partId,
  geom,
}: {
  project: Project;
  partId: string;
  geom: ReturnType<typeof projectGeom>;
}) {
  const selected = useCrumb((s) => s.selected) === partId;
  const { dRow, onPointerDown } = usePartDrag(partId);
  const setSelected = useCrumb((s) => s.setSelected);
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "dip") return null;
  const def = getPart(part.def);
  const count = def?.dipPins ?? 8;
  const bounds = dipBounds(geom, part, count);
  if (!bounds) return null;
  const { left, right, top, bottom } = bounds;
  const mirror = dipMirrorStrips(def);
  const pin1X = mirror ? right - 7 : left + 7;
  return (
    <g
      className="cursor-grab"
      style={{ touchAction: "none" }}
      transform={dRow ? `translate(0 ${dRow * PITCH})` : undefined}
      onPointerDown={onPointerDown}
      onClick={() => setSelected(partId)}
    >
      <rect
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
        rx="3"
        className={selected ? "fill-dip-body stroke-accent" : "fill-dip-body stroke-dip-edge"}
        strokeWidth="1.2"
      />
      <circle cx={pin1X} cy={top + 8} r="2.2" className="fill-board-inner" />
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const hole = dipPinHole(part, n);
        if (!hole) return null;
        const p = geom.holeXY(hole);
        const leftSide = dipSilkLeftSide(def, n, count);
        const caption = dipPinCaption(def, n);
        return (
          <text
            key={n}
            x={dipSilkX(bounds, leftSide)}
            y={p.y + 2.2}
            textAnchor={leftSide ? "start" : "end"}
            className="fill-board-inner/85 font-mono"
            style={{ fontSize: dipSilkFontSize(caption) }}
          >
            {caption}
          </text>
        );
      })}
      <text
        x={(left + right) / 2}
        y={top + 8}
        textAnchor="middle"
        className="fill-board-inner font-mono"
        style={{ fontSize: 6 }}
      >
        {part.id}
      </text>
    </g>
  );
}

function LeadedBody({
  project,
  partId,
  geom,
}: {
  project: Project;
  partId: string;
  geom: ReturnType<typeof projectGeom>;
}) {
  const selected = useCrumb((s) => s.selected) === partId;
  const setSelected = useCrumb((s) => s.setSelected);
  const { dRow, onPointerDown } = usePartDrag(partId);
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "leaded") return null;
  const def = getPart(part.def);
  const pts = leadHoles(part)
    .map((h) => parseHole(h))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .map((h) => geom.holeXY(h));
  if (pts.length < 2) return null;
  return (
    <g
      className="cursor-grab"
      style={{ touchAction: "none" }}
      transform={dRow ? `translate(0 ${dRow * PITCH})` : undefined}
      onPointerDown={onPointerDown}
      onClick={() => setSelected(partId)}
      dangerouslySetInnerHTML={{
        __html: leadedMarkup({
          defId: part.def,
          partClass: def?.class ?? "passive",
          polar: def?.polar,
          value: part.value,
          id: part.id,
          points: pts,
          selected,
        }),
      }}
    />
  );
}

function ModuleCard({
  project,
  partId,
  geom,
}: {
  project: Project;
  partId: string;
  geom: ReturnType<typeof projectGeom>;
}) {
  const selected = useCrumb((s) => s.selected) === partId;
  const setSelected = useCrumb((s) => s.setSelected);
  const clickHole = useCrumb((s) => s.clickHole);
  const { dRow, onPointerDown } = usePartDrag(partId);
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "module") return null;
  const def = getPart(part.def);
  const card = moduleCardGeom(project, part, geom);
  const labelAnchor = part.slot === 0 ? "end" : "start";
  const labelX = card.pins[0] ? (part.slot === 0 ? card.pins[0].x - 8 : card.pins[0].x + 8) : card.x + 10;
  return (
    <g
      transform={dRow ? `translate(0 ${dRow * PITCH})` : undefined}
      onPointerDown={onPointerDown}
      className="cursor-grab"
      style={{ touchAction: "none" }}
    >
      <rect
        x={card.x}
        y={card.y}
        width={card.w}
        height={card.h}
        rx="6"
        className={selected ? "fill-module stroke-accent" : "fill-module stroke-dip-edge"}
        strokeWidth="1.2"
        onClick={() => setSelected(partId)}
      />
      <text
        x={card.x + card.w / 2}
        y={card.y + 14}
        textAnchor="middle"
        className="fill-board-inner font-display"
        style={{ fontSize: 8 }}
      >
        {part.id} {def?.name ?? part.def}
      </text>
      {card.pins.map((pin) => (
        <text
          key={pin.id}
          x={labelX}
          y={pin.y + 2.5}
          textAnchor={labelAnchor}
          className="fill-board-inner/90 font-mono"
          style={{ fontSize: 6, cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            clickHole(pin.ref);
          }}
        >
          {pin.label}
        </text>
      ))}
    </g>
  );
}
