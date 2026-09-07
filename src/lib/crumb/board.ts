import type { BoardSize } from "./types.ts";

export type BoardSpec = {
  size: BoardSize;
  rows: number;
  points: number;
  label: string;
  /** Mid-rail isolation (typical half/full boards). */
  railSplit: boolean;
};

export const BOARD_SPECS: Record<BoardSize, BoardSpec> = {
  mini: { size: "mini", rows: 17, points: 170, label: "Mini 170", railSplit: false },
  half: { size: "half", rows: 30, points: 400, label: "Half 400", railSplit: true },
  full: { size: "full", rows: 63, points: 830, label: "Full 830", railSplit: true },
};

export function railSegment(spec: BoardSpec, row: number): 0 | 1 {
  if (!spec.railSplit) return 0;
  return row <= Math.floor(spec.rows / 2) ? 0 : 1;
}

export function rowsOfSegment(spec: BoardSpec, segment: 0 | 1): number[] {
  const rows = Array.from({ length: spec.rows }, (_, i) => i + 1);
  if (!spec.railSplit) return rows;
  const mid = Math.floor(spec.rows / 2);
  return segment === 0 ? rows.filter((r) => r <= mid) : rows.filter((r) => r > mid);
}
