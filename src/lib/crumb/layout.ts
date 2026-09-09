import { BOARD_SPECS } from "./board.ts";
import { getPart } from "./catalog.ts";
import { holeId, isBoardHole, parseHole, parsePinRef } from "./holes.ts";
import { nextId } from "./ids.ts";
import { leadHoles } from "./mutate.ts";
import type { HoleRef, ModulePin, PartDef, PartPin, PlacedDip, PlacedPart, Project, TerminalCol } from "./types.ts";

export function pinKeyMatches(pin: PartPin, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return false;
  if (pin.id.toLowerCase() === q) return true;
  if (pin.label.toLowerCase() === q) return true;
  if (pin.number != null && String(pin.number) === q) return true;
  if (pin.aliases?.some((alias) => alias.toLowerCase() === q)) return true;
  const tokens = pin.label
    .toLowerCase()
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.includes(q);
}

export function findPartPin(def: PartDef | undefined, raw: string): PartPin | null {
  if (!def) return null;
  return def.pins.find((p) => pinKeyMatches(p, raw)) ?? null;
}

/** Silk caption on a DIP body; falls back to the pin number. */
export function dipPinCaption(def: PartDef | undefined, pinNumber: number): string {
  const pin = def?.pins.find((p) => p.number === pinNumber) ?? def?.pins[pinNumber - 1];
  const label = pin?.label?.trim();
  return label || String(pinNumber);
}

export function dipMirrorStrips(def: PartDef | undefined): boolean {
  return def?.dipMirror === true;
}

/** Which body edge gets the silk label for a DIP pin. */
export function dipSilkLeftSide(def: PartDef | undefined, pinNumber: number, count: number): boolean {
  const onFirstStrip = pinNumber <= count / 2;
  return dipMirrorStrips(def) ? !onFirstStrip : onFirstStrip;
}

export function dipPinHole(part: PlacedDip, pinNumber: number): HoleRef | null {
  const def = getPart(part.def);
  const count = def?.dipPins;
  if (!count) return null;
  const anchor = parseHole(part.anchor);
  if (!anchor || anchor.kind !== "terminal") return null;
  const mirror = dipMirrorStrips(def);
  const pin1Col = mirror ? "f" : "e";
  const pin2Col = mirror ? "e" : "f";
  if (anchor.col !== pin1Col) return null;
  const half = count / 2;
  if (pinNumber < 1 || pinNumber > count) return null;
  if (pinNumber <= half) {
    return { kind: "terminal", row: anchor.row + pinNumber - 1, col: pin1Col };
  }
  return { kind: "terminal", row: anchor.row + (count - pinNumber), col: pin2Col };
}

export function resolveEndpoint(project: Project, raw: string): HoleRef | null {
  const direct = parseHole(raw);
  if (direct) return direct;
  const pin = parsePinRef(raw);
  if (!pin) return null;
  const part = project.parts.find((p) => p.id === pin.partId);
  if (!part) return null;
  if (part.kind === "dip") {
    const n = Number(pin.pin);
    if (!Number.isFinite(n)) {
      const found = findPartPin(getPart(part.def), pin.pin);
      if (!found?.number) return null;
      return dipPinHole(part, found.number);
    }
    return dipPinHole(part, n);
  }
  if (part.kind === "leaded") {
    const def = getPart(part.def);
    const first = def?.pins[0]?.id ?? "a";
    const last = def?.pins[def.pins.length - 1]?.id ?? "b";
    if (pin.pin === first || pin.pin === "1" || pin.pin === "a" || pin.pin === "pos") {
      return parseHole(part.from);
    }
    if (
      pin.pin === last ||
      pin.pin === String(def?.pins.length ?? 2) ||
      pin.pin === "b" ||
      pin.pin === "neg" ||
      pin.pin === "k"
    ) {
      return parseHole(part.to);
    }
    if (pin.pin === "2" || pin.pin === def?.pins[1]?.id || pin.pin === "mid") {
      return parseHole(part.mid ?? part.from);
    }
    return parseHole(part.from);
  }
  // Any kind: "module" — pin list comes from the catalog def, not a per-part special case.
  if (part.kind === "module") {
    const found = findPartPin(getPart(part.def), pin.pin);
    if (!found) return null;
    const endpoint: ModulePin = { kind: "module", partId: part.id, pin: found.id };
    return endpoint;
  }
  return null;
}

export function holeInBounds(project: Project, hole: HoleRef): boolean {
  if (!isBoardHole(hole)) return true;
  const spec = BOARD_SPECS[project.board];
  return hole.row >= 1 && hole.row <= spec.rows;
}

export function occupiedHoles(project: Project): Map<string, string> {
  const map = new Map<string, string>();
  const mark = (hole: HoleRef | null, owner: string) => {
    if (!hole) return;
    map.set(holeId(hole), owner);
  };
  for (const part of project.parts) {
    if (part.kind === "dip") {
      const def = getPart(part.def);
      const count = def?.dipPins ?? 0;
      for (let n = 1; n <= count; n++) mark(dipPinHole(part, n), part.id);
    } else if (part.kind === "leaded") {
      for (const hole of leadHoles(part)) mark(parseHole(hole), part.id);
    }
  }
  return map;
}

export function nextPartId(parts: PlacedPart[], prefix: string): string {
  return nextId(parts.map((p) => p.id), prefix);
}

export const COL_INDEX: Record<TerminalCol, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  i: 8,
  j: 9,
};
