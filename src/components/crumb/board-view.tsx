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
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

const COLS: TerminalCol[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

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

  return (
    <div className="relative h-full min-h-0 overflow-auto bg-bench max-lg:h-auto">
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-2 print:hidden">
        <button type="button" className="pointer-events-auto h-10 rounded-md bg-surface px-3 text-sm" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}>
          −
        </button>
        <button type="button" className="pointer-events-auto h-10 rounded-md bg-surface px-3 text-sm" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="pointer-events-auto h-10 rounded-md bg-surface px-3 text-sm" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}>
          +
        </button>
      </div>
      <svg
        viewBox={`0 0 ${geom.width} ${geom.height}`}
        className="mx-auto block w-auto max-lg:h-auto max-lg:w-full"
        style={{ height: `${Math.max(40, zoom * 100)}%`, maxWidth: "none" }}
        role="img"
        aria-label={`${spec.label} breadboard`}
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
          const on = lit.has(id);
          const isFrom = wireFrom === id;
          return (
            <circle
              key={id}
              cx={x}
              cy={y}
              r={HOLE_R}
              opacity={holeOpacity(focus, id)}
              className={
                shorted.has(id)
                  ? "fill-bad"
                  : isFrom
                    ? "fill-hole-active"
                    : on
                      ? "fill-hole-lit"
                      : hole.kind === "rail"
                        ? "fill-hole-rail"
                        : "fill-hole"
              }
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
            const on = lit.has(pin.ref);
            const isFrom = wireFrom === pin.ref;
            return (
              <circle
                key={pin.ref}
                cx={pin.x}
                cy={pin.y}
                r={MODULE_PIN_R}
                opacity={holeOpacity(focus, pin.ref)}
                className={
                  shorted.has(pin.ref)
                    ? "fill-bad"
                    : isFrom
                      ? "fill-hole-active"
                      : on
                        ? "fill-hole-lit"
                        : "fill-hole"
                }
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
      <text x={xP + PITCH * 0.42} y={y - 3} textAnchor="middle" className="fill-ink-soft font-mono" style={{ fontSize: 8 }}>
        +
      </text>
      <text x={xM + PITCH * 0.42} y={y - 3} textAnchor="middle" className="fill-ink-soft font-mono" style={{ fontSize: 8 }}>
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
    <g transform={dRow ? `translate(0 ${dRow * PITCH})` : undefined} onPointerDown={onPointerDown} className="cursor-grab">
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

