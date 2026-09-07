import { BOARD_SPECS } from "./board";
import type { BoardSize, HoleRef, RailPolarity, RailSide, TerminalCol } from "./types";
import { COL_INDEX } from "./layout";

export const PITCH = 22;
export const HOLE_R = 3.4;

export type BoardGeom = {
  width: number;
  height: number;
  pitch: number;
  pad: number;
  rowY: (row: number) => number;
  colX: (col: TerminalCol) => number;
  railX: (side: RailSide, polarity: RailPolarity) => number;
  holeXY: (hole: HoleRef) => { x: number; y: number };
};

export function boardGeom(size: BoardSize): BoardGeom {
  const spec = BOARD_SPECS[size];
  const pad = 28;
  const pitch = PITCH;
  const railGap = pitch * 1.35;
  const gutter = pitch * 1.7;
  const leftRailPlus = pad + pitch * 0.5;
  const leftRailMinus = leftRailPlus + pitch;
  const colA = leftRailMinus + railGap;
  const colE = colA + pitch * 4;
  const colF = colE + gutter;
  const colJ = colF + pitch * 4;
  const rightRailMinus = colJ + railGap;
  const rightRailPlus = rightRailMinus + pitch;
  const width = rightRailPlus + pad + pitch * 0.5;
  const header = 36;
  const footer = 28;
  const height = header + spec.rows * pitch + footer;
  const rowY = (row: number) => header + (row - 0.5) * pitch;
  const colX = (col: TerminalCol) => {
    const i = COL_INDEX[col];
    return i <= 4 ? colA + i * pitch : colF + (i - 5) * pitch;
  };
  const railX = (side: RailSide, polarity: RailPolarity) => {
    if (side === "L") return polarity === "P" ? leftRailPlus : leftRailMinus;
    return polarity === "P" ? rightRailPlus : rightRailMinus;
  };
  const holeXY = (hole: HoleRef) => {
    if (hole.kind === "terminal") return { x: colX(hole.col), y: rowY(hole.row) };
    return { x: railX(hole.side, hole.polarity), y: rowY(hole.row) };
  };
  return { width, height, pitch, pad, rowY, colX, railX, holeXY };
}
