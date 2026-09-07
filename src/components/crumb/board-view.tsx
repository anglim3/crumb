import { BOARD_SPECS } from "@/lib/crumb/board";
import { getPart } from "@/lib/crumb/catalog";
import { boardGeom, HOLE_R, PITCH } from "@/lib/crumb/geometry";
import { holeId, parseHole } from "@/lib/crumb/holes";
import { dipPinHole, resolveEndpoint } from "@/lib/crumb/layout";
import { computeNets, netForHole } from "@/lib/crumb/nets";
import { detectShorts, shortHoles } from "@/lib/crumb/shorts";
import { useCrumb } from "@/lib/crumb/store";
import type { HoleRef, Project, TerminalCol } from "@/lib/crumb/types";
import { jumperPath } from "@/lib/crumb/wire-path";
import { useMemo, useState } from "react";

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

  const geom = useMemo(() => boardGeom(project.board), [project.board]);
  const spec = BOARD_SPECS[project.board];
  const nets = useMemo(() => computeNets(project), [project]);
  const shorts = useMemo(() => detectShorts(project, nets), [project, nets]);
  const shorted = useMemo(() => shortHoles(shorts), [shorts]);
  const activeNet = highlightNet ? nets.find((n) => n.id === highlightNet) : undefined;
  const hoverNet = hoverHole ? netForHole(nets, hoverHole) : undefined;
  const lit = new Set([...(activeNet?.holes ?? []), ...(hoverNet?.holes ?? [])]);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative h-full min-h-0 overflow-auto bg-bench">
      <div className="sticky top-2 z-10 float-right mr-2 flex gap-2 print:hidden">
        <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}>
          −
        </button>
        <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}>
          +
        </button>
      </div>
      <svg
        viewBox={`0 0 ${geom.width} ${geom.height}`}
        className="mx-auto block h-auto"
        style={{ width: `${Math.max(40, zoom * 100)}%`, maxWidth: "none" }}
        role="img"
        aria-label={`${spec.label} breadboard`}
      >
        <rect width={geom.width} height={geom.height} rx="14" className="fill-board" />
        <rect x="10" y="10" width={geom.width - 20} height={geom.height - 20} rx="10" className="fill-board-inner" />

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

        {project.wires.map((wire, i) => {
          const a = resolveEndpoint(project, wire.from);
          const b = resolveEndpoint(project, wire.to);
          if (!a || !b) return null;
          const pa = geom.holeXY(a);
          const pb = geom.holeXY(b);
          const selectedWire = selected === wire.id;
          const aId = holeId(a);
          const shortWire = shorted.has(aId);
          return (
            <path
              key={wire.id}
              d={jumperPath(geom, pa.x, pa.y, pb.x, pb.y, i)}
              fill="none"
              stroke={shortWire ? "#c9897a" : wire.color}
              strokeWidth={selectedWire || shortWire ? 3.4 : 2.4}
              strokeLinecap="round"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(wire.id);
              }}
            />
          );
        })}

        {project.parts.map((part) => {
          if (part.kind === "dip") {
            return <DipBody key={part.id} project={project} partId={part.id} />;
          }
          if (part.kind === "leaded") {
            return <LeadedBody key={part.id} project={project} partId={part.id} />;
          }
          return <ModuleCard key={part.id} project={project} partId={part.id} />;
        })}

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
      </svg>
    </div>
  );
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

function DipBody({ project, partId }: { project: Project; partId: string }) {
  const selected = useCrumb((s) => s.selected) === partId;
  const setSelected = useCrumb((s) => s.setSelected);
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "dip") return null;
  const def = getPart(part.def);
  const count = def?.dipPins ?? 8;
  const p1 = dipPinHole(part, 1);
  const lastLeft = dipPinHole(part, count / 2);
  if (!p1 || !lastLeft) return null;
  const geom = boardGeom(project.board);
  const a = geom.holeXY(p1);
  const b = geom.holeXY(lastLeft);
  const left = geom.colX("e") - 8;
  const right = geom.colX("f") + 8;
  const top = Math.min(a.y, b.y) - 9;
  const bottom = Math.max(a.y, b.y) + 9;
  return (
    <g className="cursor-pointer" onClick={() => setSelected(partId)}>
      <rect
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
        rx="3"
        className={selected ? "fill-dip-body stroke-accent" : "fill-dip-body stroke-dip-edge"}
        strokeWidth="1.2"
      />
      <circle cx={left + 7} cy={top + 8} r="2.2" className="fill-board-inner" />
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const hole = dipPinHole(part, n);
        if (!hole) return null;
        const p = geom.holeXY(hole);
        const leftSide = n <= count / 2;
        return (
          <text
            key={n}
            x={leftSide ? left + 11 : right - 11}
            y={p.y + 2.5}
            textAnchor={leftSide ? "start" : "end"}
            className="fill-board-inner/80 font-mono"
            style={{ fontSize: 6 }}
          >
            {n}
          </text>
        );
      })}
      <text
        x={(left + right) / 2}
        y={(top + bottom) / 2 + 3}
        textAnchor="middle"
        className="fill-board-inner font-mono"
        style={{ fontSize: 7 }}
      >
        {part.id}
      </text>
    </g>
  );
}

function LeadedBody({ project, partId }: { project: Project; partId: string }) {
  const selected = useCrumb((s) => s.selected) === partId;
  const setSelected = useCrumb((s) => s.setSelected);
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "leaded") return null;
  const def = getPart(part.def);
  const from = parseHole(part.from);
  const to = parseHole(part.to);
  const mid = part.mid ? parseHole(part.mid) : null;
  if (!from || !to) return null;
  const geom = boardGeom(project.board);
  const a = geom.holeXY(from);
  const b = geom.holeXY(to);
  const c = mid ? geom.holeXY(mid) : null;
  const mx = c ? c.x : (a.x + b.x) / 2;
  const my = c ? c.y : (a.y + b.y) / 2;
  const isLed = def?.class === "led";
  return (
    <g className="cursor-pointer" onClick={() => setSelected(partId)}>
      <line x1={a.x} y1={a.y} x2={c ? c.x : b.x} y2={c ? c.y : b.y} className="stroke-lead" strokeWidth="1.4" />
      {c && <line x1={c.x} y1={c.y} x2={b.x} y2={b.y} className="stroke-lead" strokeWidth="1.4" />}
      {isLed ? (
        <g transform={`translate(${mx} ${my})`}>
          <circle r="6.5" className={selected ? "fill-led stroke-accent" : "fill-led stroke-dip-edge"} strokeWidth="1" />
        </g>
      ) : (
        <rect
          x={mx - 11}
          y={my - 5}
          width="22"
          height="10"
          rx="2"
          className={selected ? "fill-passive stroke-accent" : "fill-passive stroke-dip-edge"}
          strokeWidth="1"
        />
      )}
      <text x={mx} y={my + 18} textAnchor="middle" className="fill-ink-soft font-mono" style={{ fontSize: 7 }}>
        {part.id}
        {part.value ? ` ${part.value}` : ""}
      </text>
    </g>
  );
}

function ModuleCard({ project, partId }: { project: Project; partId: string }) {
  const selected = useCrumb((s) => s.selected) === partId;
  const setSelected = useCrumb((s) => s.setSelected);
  const clickHole = useCrumb((s) => s.clickHole);
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "module") return null;
  const def = getPart(part.def);
  const geom = boardGeom(project.board);
  const spec = BOARD_SPECS[project.board];
  const pins = def?.pins ?? [];
  const w = 92;
  const h = 28 + Math.ceil(pins.length / 2) * 12;
  const x = part.slot === 0 ? 8 : geom.width - w - 8;
  const y = geom.rowY(Math.min(spec.rows, Math.max(1, part.offsetRow))) - 10;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="6"
        className={selected ? "fill-module stroke-accent" : "fill-module stroke-dip-edge"}
        strokeWidth="1.2"
        onClick={() => setSelected(partId)}
      />
      <text x={x + w / 2} y={y + 14} textAnchor="middle" className="fill-board-inner font-display" style={{ fontSize: 8 }}>
        {part.id} {def?.name ?? part.def}
      </text>
      {pins.map((pin, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const px = x + 8 + col * 46;
        const py = y + 28 + row * 12;
        const ref = `${part.id}.${pin.id}`;
        return (
          <text
            key={pin.id}
            x={px}
            y={py}
            className="fill-board-inner/90 font-mono"
            style={{ fontSize: 6, cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              clickHole(ref);
            }}
          >
            {pin.label}
          </text>
        );
      })}
    </g>
  );
}

