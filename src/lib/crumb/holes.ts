import {
  LEFT_COLS,
  RIGHT_COLS,
  TERMINAL_COLS,
  type HoleRef,
  type RailHole,
  type RailPolarity,
  type RailSide,
  type TerminalCol,
  type TerminalHole,
} from "./types.ts";

const TERMINAL_RE = /^(\d{1,2})-([a-j])$/i;
const RAIL_RE = /^([LR])([PM])-(\d{1,2})$/i;
const PIN_RE = /^([a-z][a-z0-9]*)\.([a-z0-9]+)$/i;

export function isTerminalCol(value: string): value is TerminalCol {
  return (TERMINAL_COLS as readonly string[]).includes(value.toLowerCase());
}

export function parseHole(raw: string): HoleRef | null {
  const t = raw.trim();
  const term = TERMINAL_RE.exec(t);
  if (term) {
    const col = term[2].toLowerCase() as TerminalCol;
    return { kind: "terminal", row: Number(term[1]), col };
  }
  const rail = RAIL_RE.exec(t);
  if (rail) {
    return {
      kind: "rail",
      side: rail[1].toUpperCase() as RailSide,
      polarity: rail[2].toUpperCase() as RailPolarity,
      row: Number(rail[3]),
    };
  }
  return null;
}

export function holeId(ref: HoleRef): string {
  if (ref.kind === "terminal") return `${ref.row}-${ref.col}`;
  if (ref.kind === "rail") return `${ref.side}${ref.polarity}-${ref.row}`;
  return `${ref.partId}.${ref.pin}`;
}

export function isBoardHole(ref: HoleRef): ref is TerminalHole | RailHole {
  return ref.kind === "terminal" || ref.kind === "rail";
}

export function formatHole(raw: string): string {
  const parsed = parseHole(raw);
  return parsed ? holeId(parsed) : raw;
}

export function parsePinRef(raw: string): { partId: string; pin: string } | null {
  const m = PIN_RE.exec(raw.trim());
  if (!m) return null;
  return { partId: m[1], pin: m[2] };
}

export function isLeftCol(col: TerminalCol): boolean {
  return (LEFT_COLS as readonly string[]).includes(col);
}

export function isRightCol(col: TerminalCol): boolean {
  return (RIGHT_COLS as readonly string[]).includes(col);
}

export function railLabel(side: RailSide, polarity: RailPolarity): string {
  const bank = side === "L" ? "left" : "right";
  const pole = polarity === "P" ? "+" : "−";
  return `${bank} ${pole}`;
}
