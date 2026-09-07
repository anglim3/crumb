import { BOARD_SPECS } from "./board.ts";
import { getPart } from "./catalog.ts";
import { boardGeom, HOLE_R } from "./geometry.ts";
import { holeId, parseHole } from "./holes.ts";
import { dipPinHole, resolveEndpoint } from "./layout.ts";
import type { HoleRef, Project, TerminalCol } from "./types.ts";
import { jumperPath } from "./wire-path.ts";

const COLS: TerminalCol[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/"/g, "\u0026quot;");
}

function allHoles(rows: number): HoleRef[] {
  const holes: HoleRef[] = [];
  for (let row = 1; row <= rows; row++) {
    for (const col of COLS) holes.push({ kind: "terminal", row, col });
    for (const side of ["L", "R"] as const) {
      for (const polarity of ["P", "M"] as const) holes.push({ kind: "rail", side, polarity, row });
    }
  }
  return holes;
}

/** Standalone SVG for export / MCP. */
export function renderProjectSvg(project: Project): string {
  const geom = boardGeom(project.board);
  const spec = BOARD_SPECS[project.board];
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geom.width} ${geom.height}" width="${geom.width}" height="${geom.height}">`,
    `<rect width="${geom.width}" height="${geom.height}" rx="14" fill="#c9b896"/>`,
    `<rect x="10" y="10" width="${geom.width - 20}" height="${geom.height - 20}" rx="10" fill="#efe6d4"/>`,
  );

  for (const side of ["L", "R"] as const) {
    const xP = geom.railX(side, "P") - 9;
    const xM = geom.railX(side, "M") - 9;
    const y = geom.rowY(1) - 10;
    const h = geom.rowY(spec.rows) - geom.rowY(1) + 20;
    parts.push(`<rect x="${xP}" y="${y}" width="18" height="${h}" rx="4" fill="#e8c8c2"/>`);
    parts.push(`<rect x="${xM}" y="${y}" width="18" height="${h}" rx="4" fill="#c5d0da"/>`);
  }

  project.wires.forEach((wire, i) => {
    const a = resolveEndpoint(project, wire.from);
    const b = resolveEndpoint(project, wire.to);
    if (!a || !b) return;
    const pa = geom.holeXY(a);
    const pb = geom.holeXY(b);
    parts.push(
      `<path d="${jumperPath(geom, pa.x, pa.y, pb.x, pb.y, i)}" fill="none" stroke="${esc(wire.color)}" stroke-width="2.4" stroke-linecap="round"/>`,
    );
  });

  for (const part of project.parts) {
    if (part.kind === "dip") {
      const def = getPart(part.def);
      const count = def?.dipPins ?? 8;
      const p1 = dipPinHole(part, 1);
      const last = dipPinHole(part, count / 2);
      if (!p1 || !last) continue;
      const a = geom.holeXY(p1);
      const b = geom.holeXY(last);
      const left = geom.colX("e") - 8;
      const right = geom.colX("f") + 8;
      const top = Math.min(a.y, b.y) - 9;
      const bottom = Math.max(a.y, b.y) + 9;
      parts.push(
        `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="3" fill="#1c1916"/>`,
        `<text x="${(left + right) / 2}" y="${(top + bottom) / 2 + 3}" text-anchor="middle" fill="#efe6d4" font-size="7" font-family="monospace">${esc(part.id)}</text>`,
      );
    } else if (part.kind === "leaded") {
      const from = parseHole(part.from);
      const to = parseHole(part.to);
      if (!from || !to) continue;
      const a = geom.holeXY(from);
      const b = geom.holeXY(to);
      parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#8a8478" stroke-width="1.4"/>`);
    }
  }

  for (const hole of allHoles(spec.rows)) {
    const { x, y } = geom.holeXY(hole);
    parts.push(`<circle cx="${x}" cy="${y}" r="${HOLE_R}" fill="#3a3228"/>`);
  }

  parts.push(`</svg>`);
  return parts.join("");
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

void holeId;
