import type { BoardGeom } from "./geometry.ts";
import type { HoleRef, Project } from "./types.ts";

/** Max parallel wires fanned in one corridor before lane indices wrap. */
export const WIRE_LANE_MAX = 7;

/** Horizontal/vertical separation between adjacent wire lanes (px). */
export const WIRE_LANE_SPACING = 3.2;

const AXIS_TOL = 1;

export type WireGeom = {
  id: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

export type WireLane = {
  lane: number;
  count: number;
};

/** Centered offset for a wire's lane within a shared corridor. */
export function laneOffset(laneIndex: number, laneCount: number): number {
  const count = Math.min(Math.max(laneCount, 1), WIRE_LANE_MAX);
  const lane = Math.min(Math.max(laneIndex, 0), count - 1);
  return (lane - (count - 1) / 2) * WIRE_LANE_SPACING;
}

function corridorKey(w: WireGeom): string {
  if (Math.abs(w.ax - w.bx) < AXIS_TOL) {
    return `v:${Math.round(w.ax)}`;
  }
  if (Math.abs(w.ay - w.by) < AXIS_TOL) {
    return `h:${Math.round(w.ay)}`;
  }
  const endpoints = [
    `${Math.round(w.ax)},${Math.round(w.ay)}`,
    `${Math.round(w.bx)},${Math.round(w.by)}`,
  ].sort();
  return `e:${endpoints.join("|")}`;
}

export function wireGeomsFromProject(
  project: Project,
  geom: BoardGeom,
  resolve: (project: Project, ref: string) => HoleRef | null,
): WireGeom[] {
  return project.wires.flatMap((wire) => {
    const a = resolve(project, wire.from);
    const b = resolve(project, wire.to);
    if (!a || !b) return [];
    const pa = geom.holeXY(a);
    const pb = geom.holeXY(b);
    return [{ id: wire.id, ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y }];
  });
}

/** Assign lane indices from peers sharing the same horizontal, vertical, or elbow corridor. */
export function computeWireLanes(wires: WireGeom[]): Map<string, WireLane> {
  const groups = new Map<string, WireGeom[]>();
  for (const w of wires) {
    const key = corridorKey(w);
    const list = groups.get(key);
    if (list) list.push(w);
    else groups.set(key, [w]);
  }

  const lanes = new Map<string, WireLane>();
  for (const peers of groups.values()) {
    peers.sort((a, b) => a.id.localeCompare(b.id));
    const count = peers.length;
    for (let lane = 0; lane < peers.length; lane++) {
      lanes.set(peers[lane]!.id, { lane, count });
    }
  }
  return lanes;
}

export function jumperPath(
  geom: BoardGeom,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  laneIndex = 0,
  laneCount = 1,
): string {
  void geom;
  const offset = laneOffset(laneIndex, laneCount);

  if (Math.abs(ax - bx) < AXIS_TOL) {
    const midX = ax + offset;
    return `M ${ax} ${ay} C ${midX} ${ay}, ${midX} ${by}, ${bx} ${by}`;
  }
  if (Math.abs(ay - by) < AXIS_TOL) {
    const midY = ay + offset;
    return `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`;
  }
  const midY = (ay + by) / 2 + offset;
  return `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`;
}
