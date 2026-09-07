import type { BoardGeom } from "./geometry";

export function jumperPath(
  geom: BoardGeom,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  index: number,
): string {
  if (Math.abs(ax - bx) < 1) {
    return `M ${ax} ${ay} L ${bx} ${by}`;
  }
  if (Math.abs(ay - by) < 1) {
    const bump = ((index % 5) - 2) * 3.2;
    const midY = ay + bump;
    return `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`;
  }
  const offset = ((index % 7) - 3) * 4;
  const midY = (ay + by) / 2 + offset;
  return `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`;
}
