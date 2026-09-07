import { BOARD_SPECS, railSegment, rowsOfSegment } from "./board.ts";
import { parseHole } from "./holes.ts";
import { resolveEndpoint } from "./layout.ts";
import type { HoleRef, Net, Project } from "./types.ts";

function terminalNetKey(row: number, side: "L" | "R"): string {
  return `term:${side}:${row}`;
}

function railNetKey(hole: Extract<HoleRef, { kind: "rail" }>, board: Project["board"]): string {
  const spec = BOARD_SPECS[board];
  const seg = railSegment(spec, hole.row);
  return `rail:${hole.side}${hole.polarity}:${seg}`;
}

export function netKeyForHole(project: Project, hole: HoleRef): string {
  if (hole.kind === "module") return `ext:${hole.partId}.${hole.pin}`;
  if (hole.kind === "rail") return railNetKey(hole, project.board);
  const side = hole.col <= "e" ? "L" : "R";
  return terminalNetKey(hole.row, side);
}

export function holesOnNetKey(project: Project, key: string): string[] {
  const spec = BOARD_SPECS[project.board];
  if (key.startsWith("term:")) {
    const [, side, rowStr] = key.split(":");
    const row = Number(rowStr);
    const cols = side === "L" ? ["a", "b", "c", "d", "e"] : ["f", "g", "h", "i", "j"];
    return cols.map((col) => `${row}-${col}`);
  }
  if (key.startsWith("rail:")) {
    const body = key.slice(5);
    const side = body[0] as "L" | "R";
    const polarity = body[1] as "P" | "M";
    const seg = Number(body.split(":")[1]) as 0 | 1;
    return rowsOfSegment(spec, spec.railSplit ? seg : 0).map((row) => `${side}${polarity}-${row}`);
  }
  if (key.startsWith("ext:")) return [key.slice(4)];
  return [];
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent.set(pa, pb);
  }
}

export function computeNets(project: Project): Net[] {
  const uf = new UnionFind();
  const seen = new Set<string>();

  const touch = (raw: string) => {
    const hole = resolveEndpoint(project, raw) ?? parseHole(raw);
    if (!hole) {
      const key = `ext:${raw}`;
      seen.add(key);
      uf.find(key);
      return key;
    }
    const key = netKeyForHole(project, hole);
    seen.add(key);
    uf.find(key);
    return key;
  };

  for (const wire of project.wires) {
    const a = touch(wire.from);
    const b = touch(wire.to);
    if (a && b) uf.union(a, b);
  }

  const spec = BOARD_SPECS[project.board];
  for (let row = 1; row <= spec.rows; row++) {
    seen.add(terminalNetKey(row, "L"));
    seen.add(terminalNetKey(row, "R"));
  }
  for (const side of ["L", "R"] as const) {
    for (const pol of ["P", "M"] as const) {
      seen.add(`rail:${side}${pol}:0`);
      if (spec.railSplit) seen.add(`rail:${side}${pol}:1`);
    }
  }

  const groups = new Map<string, string[]>();
  for (const key of seen) {
    const root = uf.find(key);
    const list = groups.get(root) ?? [];
    list.push(key);
    groups.set(root, list);
  }

  const nets: Net[] = [];
  let i = 0;
  for (const keys of groups.values()) {
    const holes = keys.flatMap((k) => holesOnNetKey(project, k));
    nets.push({ id: `n${i++}`, holes, label: inferNetLabel(keys) });
  }
  return nets;
}

function inferNetLabel(keys: string[]): string | undefined {
  const rails = keys.filter((k) => k.startsWith("rail:"));
  if (rails.length === 0) return undefined;
  const plus = rails.some((k) => k.includes("P"));
  const minus = rails.some((k) => k.includes("M"));
  if (plus && minus) return "SHORT";
  if (plus) return "VCC";
  if (minus) return "GND";
  return undefined;
}

export function netForHole(nets: Net[], hole: string): Net | undefined {
  return nets.find((n) => n.holes.includes(hole));
}
