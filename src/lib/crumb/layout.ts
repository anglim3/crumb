import { BOARD_SPECS } from "./board";
import { getPart } from "./catalog";
import { holeId, isLeftCol, parseHole, parsePinRef } from "./holes";
import { nextId } from "./ids";
import type { HoleRef, PlacedDip, PlacedPart, Project, TerminalCol } from "./types";

export function dipPinHole(part: PlacedDip, pinNumber: number): HoleRef | null {
  const def = getPart(part.def);
  const count = def?.dipPins;
  if (!count) return null;
  const anchor = parseHole(part.anchor);
  if (!anchor || anchor.kind !== "terminal" || !isLeftCol(anchor.col)) return null;
  const half = count / 2;
  if (pinNumber < 1 || pinNumber > count) return null;
  if (pinNumber <= half) {
    return { kind: "terminal", row: anchor.row + pinNumber - 1, col: "e" };
  }
  return { kind: "terminal", row: anchor.row + (count - pinNumber), col: "f" };
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
      const def = getPart(part.def);
      const found = def?.pins.find(
        (p) => p.label.toLowerCase() === pin.pin.toLowerCase() || p.id === pin.pin,
      );
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
    return parseHole(part.from);
  }
  return null;
}

export function holeInBounds(project: Project, hole: HoleRef): boolean {
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
      mark(parseHole(part.from), part.id);
      mark(parseHole(part.to), part.id);
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
