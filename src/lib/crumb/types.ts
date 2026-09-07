export const TERMINAL_COLS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
export type TerminalCol = (typeof TERMINAL_COLS)[number];

export const LEFT_COLS = ["a", "b", "c", "d", "e"] as const;
export const RIGHT_COLS = ["f", "g", "h", "i", "j"] as const;

export type BoardSize = "mini" | "half" | "full";

export type RailSide = "L" | "R";
export type RailPolarity = "P" | "M";

export type TerminalHole = {
  kind: "terminal";
  row: number;
  col: TerminalCol;
};

export type RailHole = {
  kind: "rail";
  side: RailSide;
  polarity: RailPolarity;
  row: number;
};

export type HoleRef = TerminalHole | RailHole;

export type PartClass =
  | "dip"
  | "passive"
  | "led"
  | "switch"
  | "button"
  | "power"
  | "sensor"
  | "module";

export type PartPin = {
  id: string;
  label: string;
  number?: number;
};

export type PartDef = {
  id: string;
  name: string;
  class: PartClass;
  description: string;
  pins: PartPin[];
  /** DIP pin count; body spans gutter. */
  dipPins?: 8 | 14 | 16 | 20 | 24 | 28 | 40;
  /** Two-lead span in rows when placed vertically (hint only). */
  defaultSpan?: number;
  color?: string;
  polar?: boolean;
};

export type PlacedDip = {
  kind: "dip";
  id: string;
  def: string;
  /** Pin 1 hole, always a left-side terminal (a–e). */
  anchor: string;
};

export type PlacedLeaded = {
  kind: "leaded";
  id: string;
  def: string;
  from: string;
  to: string;
  value?: string;
};

export type PlacedModule = {
  kind: "module";
  id: string;
  def: string;
  /** Board-adjacent slot: 0 = left of rails, 1 = right of rails. */
  slot: 0 | 1;
  offsetRow: number;
};

export type PlacedPart = PlacedDip | PlacedLeaded | PlacedModule;

export type Wire = {
  id: string;
  from: string;
  to: string;
  color: string;
};

export type Project = {
  version: 1;
  name: string;
  board: BoardSize;
  parts: PlacedPart[];
  wires: Wire[];
};

export type Issue = {
  level: "error" | "warn";
  code: string;
  message: string;
  refs?: string[];
};

export type Net = {
  id: string;
  holes: string[];
  label?: string;
};

export type BuildStep = {
  title: string;
  detail: string;
};
