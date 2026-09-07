import { BOARD_SPECS } from "./board.ts";
import { getPart } from "./catalog.ts";
import { COL_INDEX } from "./layout.ts";
import type {
  BoardSize,
  HoleRef,
  PlacedModule,
  Project,
  RailPolarity,
  RailSide,
  TerminalCol,
} from "./types.ts";

export const PITCH = 22;
export const HOLE_R = 3.4;

export const MODULE_CARD_W = 118;
export const MODULE_INSET = 10;
export const MODULE_GAP = 16;
export const MODULE_HEADER_H = 22;
export const MODULE_PIN_PITCH = 14;
export const MODULE_FOOTER = 10;
export const MODULE_PIN_R = 3.2;

export type BoardGeom = {
  /** Full canvas, including off-board module margins. */
  width: number;
  height: number;
  /** Breadboard body width (no module columns). */
  boardWidth: number;
  pitch: number;
  pad: number;
  boardX: number;
  rowY: (row: number) => number;
  colX: (col: TerminalCol) => number;
  railX: (side: RailSide, polarity: RailPolarity) => number;
  holeXY: (hole: HoleRef) => { x: number; y: number };
};

export type ModulePinGeom = {
  id: string;
  label: string;
  ref: string;
  x: number;
  y: number;
};

export type ModuleCardGeom = {
  partId: string;
  slot: 0 | 1;
  x: number;
  y: number;
  w: number;
  h: number;
  pins: ModulePinGeom[];
};

function moduleColumnWidth(): number {
  return MODULE_INSET + MODULE_CARD_W + MODULE_GAP;
}

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
    if (hole.kind === "rail") return { x: railX(hole.side, hole.polarity), y: rowY(hole.row) };
    return { x: 0, y: 0 };
  };
  return { width, height, boardWidth: width, pitch, pad, boardX: 0, rowY, colX, railX, holeXY };
}

function hasModuleSlot(project: Project, slot: 0 | 1): boolean {
  return project.parts.some((p) => p.kind === "module" && p.slot === slot);
}

export function moduleCardGeom(project: Project, part: PlacedModule, geom: BoardGeom): ModuleCardGeom {
  const spec = BOARD_SPECS[project.board];
  const def = getPart(part.def);
  const pins = def?.pins ?? [];
  const w = MODULE_CARD_W;
  const h = MODULE_HEADER_H + Math.max(1, pins.length) * MODULE_PIN_PITCH + MODULE_FOOTER;
  const row = Math.min(spec.rows, Math.max(1, part.offsetRow));
  const y = geom.rowY(row) - 10;
  const x = part.slot === 0 ? geom.boardX - MODULE_GAP - w : geom.boardX + geom.boardWidth + MODULE_GAP;
  // Slot 0: card sits in the left margin, pads on the board-facing (right) edge.
  // Slot 1: card sits in the right margin, pads on the board-facing (left) edge.
  const padX = part.slot === 0 ? x + w - 12 : x + 12;
  const laid = pins.map((pin, i) => ({
    id: pin.id,
    label: pin.label,
    ref: `${part.id}.${pin.id}`,
    x: padX,
    y: y + MODULE_HEADER_H + MODULE_PIN_PITCH * (i + 0.45),
  }));
  return { partId: part.id, slot: part.slot, x, y, w, h, pins: laid };
}

/** Board geometry plus side margins so off-board modules and their jumpers fit in the view. */
export function projectGeom(project: Project): BoardGeom {
  const base = boardGeom(project.board);
  const left = hasModuleSlot(project, 0) ? moduleColumnWidth() : 0;
  const right = hasModuleSlot(project, 1) ? moduleColumnWidth() : 0;
  const boardX = left;
  const width = base.width + left + right;

  const shift = (pt: { x: number; y: number }) => ({ x: pt.x + boardX, y: pt.y });
  const rowY = base.rowY;
  const colX = (col: TerminalCol) => base.colX(col) + boardX;
  const railX = (side: RailSide, polarity: RailPolarity) => base.railX(side, polarity) + boardX;

  const withBoard: BoardGeom = {
    ...base,
    width: base.width,
    boardWidth: base.width,
    boardX,
    colX,
    railX,
    holeXY: (hole) => {
      if (hole.kind === "module") return { x: 0, y: 0 };
      return shift(base.holeXY(hole));
    },
  };

  let maxY = base.height;
  const cards = new Map<string, ModuleCardGeom>();
  for (const part of project.parts) {
    if (part.kind !== "module") continue;
    const card = moduleCardGeom(project, part, withBoard);
    cards.set(part.id, card);
    maxY = Math.max(maxY, card.y + card.h + 16);
  }

  const holeXY = (hole: HoleRef) => {
    if (hole.kind === "module") {
      const card = cards.get(hole.partId);
      const pin = card?.pins.find((p) => p.id.toLowerCase() === hole.pin.toLowerCase());
      if (pin) return { x: pin.x, y: pin.y };
      if (card) return { x: card.x + card.w / 2, y: card.y + MODULE_HEADER_H / 2 };
      return { x: boardX, y: rowY(1) };
    }
    return shift(base.holeXY(hole));
  };

  return {
    ...withBoard,
    width,
    height: maxY,
    holeXY,
  };
}
