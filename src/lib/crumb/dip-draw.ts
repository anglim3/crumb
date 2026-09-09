import { getPart } from "./catalog.ts";
import type { BoardGeom } from "./geometry.ts";
import { HOLE_R } from "./geometry.ts";
import { dipPinCaption, dipPinHole, dipMirrorStrips, dipSilkLeftSide } from "./layout.ts";
import type { PlacedDip, Project } from "./types.ts";

function esc(value: string): string {
  return value.replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/"/g, "\u0026quot;");
}

export type DipBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  count: number;
};

/** Inset silk labels from the body edge toward the chip center, away from e/f hole centers. */
export const DIP_SILK_INSET = 12;

export function dipBounds(geom: BoardGeom, part: PlacedDip, count: number): DipBounds | null {
  const p1 = dipPinHole(part, 1);
  const lastLeft = dipPinHole(part, count / 2);
  if (!p1 || !lastLeft) return null;
  const a = geom.holeXY(p1);
  const b = geom.holeXY(lastLeft);
  return {
    left: geom.colX("e") - 8,
    right: geom.colX("f") + 8,
    top: Math.min(a.y, b.y) - 9,
    bottom: Math.max(a.y, b.y) + 9,
    count,
  };
}

export function dipSilkX(bounds: DipBounds, leftSide: boolean): number {
  return leftSide ? bounds.left + DIP_SILK_INSET : bounds.right - DIP_SILK_INSET;
}

export function dipSilkFontSize(caption: string): number {
  return caption.length > 4 ? 4.5 : 5.5;
}

export function dipMarkup(
  project: Project,
  part: PlacedDip,
  geom: BoardGeom,
  opts?: { selected?: boolean },
): string {
  const def = getPart(part.def);
  const count = def?.dipPins ?? 8;
  const bounds = dipBounds(geom, part, count);
  if (!bounds) return "";
  const { left, right, top, bottom } = bounds;
  const stroke = opts?.selected ? "#d8d2c8" : "#1c1916";
  const mirror = dipMirrorStrips(def);
  const pin1X = mirror ? right - 7 : left + 7;
  const chunks = [
    `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="3" fill="#1c1916" stroke="${stroke}" stroke-width="1.2"/>`,
    `<circle cx="${pin1X}" cy="${top + 8}" r="2.2" fill="#efe6d4"/>`,
    `<text x="${(left + right) / 2}" y="${top + 8}" text-anchor="middle" fill="#efe6d4" font-size="6" font-family="monospace">${esc(part.id)}</text>`,
  ];
  for (let n = 1; n <= count; n++) {
    const hole = dipPinHole(part, n);
    if (!hole) continue;
    const p = geom.holeXY(hole);
    const leftSide = dipSilkLeftSide(def, n, count);
    const caption = dipPinCaption(def, n);
    const fontSize = dipSilkFontSize(caption);
    chunks.push(
      `<text x="${dipSilkX(bounds, leftSide)}" y="${p.y + 2.2}" text-anchor="${leftSide ? "start" : "end"}" fill="#efe6d4" font-size="${fontSize}" font-family="monospace">${esc(caption)}</text>`,
    );
  }
  return chunks.join("");
}

/** Last terminal-strip hole dot in an SVG export — DIP silk must follow these for readable labels. */
export function lastTerminalHoleIndex(svg: string): number {
  const marker = `r="${HOLE_R}"`;
  let last = -1;
  let pos = 0;
  while (true) {
    const i = svg.indexOf(marker, pos);
    if (i < 0) break;
    const start = svg.lastIndexOf("<circle", i);
    if (start >= 0) last = start;
    pos = i + 1;
  }
  return last;
}
