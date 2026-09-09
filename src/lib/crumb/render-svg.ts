import { BOARD_SPECS } from "./board.ts";
import { getPart } from "./catalog.ts";
import { dipMarkup } from "./dip-draw.ts";
import { boardGeom, HOLE_R, MODULE_PIN_R, moduleCardGeom, projectGeom } from "./geometry.ts";
import { parseHole } from "./holes.ts";
import { resolveEndpoint } from "./layout.ts";
import { leadHoles } from "./mutate.ts";
import { leadedMarkup } from "./part-draw.ts";
import type { HoleRef, Project, TerminalCol } from "./types.ts";
import { computeWireLanes, jumperPath, wireGeomsFromProject } from "./wire-path.ts";

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

function renderModuleCard(project: Project, partId: string, geom: ReturnType<typeof projectGeom>): string {
  const part = project.parts.find((p) => p.id === partId);
  if (!part || part.kind !== "module") return "";
  const def = getPart(part.def);
  const card = moduleCardGeom(project, part, geom);
  const labelSide = part.slot === 0 ? "end" : "start";
  const labelX = part.slot === 0 ? card.pins[0] ? card.pins[0].x - 8 : card.x + 8 : card.pins[0] ? card.pins[0].x + 8 : card.x + 22;
  const chunks = [
    `<rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="6" fill="#3d4a42" stroke="#1c1916" stroke-width="1.2"/>`,
    `<text x="${card.x + card.w / 2}" y="${card.y + 14}" text-anchor="middle" fill="#efe6d4" font-size="8" font-family="Georgia, serif">${esc(part.id)} ${esc(def?.name ?? part.def)}</text>`,
  ];
  for (const pin of card.pins) {
    chunks.push(
      `<text x="${labelX}" y="${pin.y + 2.5}" text-anchor="${labelSide}" fill="#efe6d4" font-size="6" font-family="monospace">${esc(pin.label)}</text>`,
    );
  }
  return chunks.join("");
}

export function renderProjectSvg(project: Project): string {
  const geom = projectGeom(project);
  const board = boardGeom(project.board);
  const spec = BOARD_SPECS[project.board];
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geom.width} ${geom.height}" width="${geom.width}" height="${geom.height}">`,
    `<rect width="${geom.width}" height="${geom.height}" rx="8" fill="#d8cbb4"/>`,
    `<rect x="${geom.boardX}" y="0" width="${geom.boardWidth}" height="${board.height}" rx="14" fill="#c9b896"/>`,
    `<rect x="${geom.boardX + 10}" y="10" width="${geom.boardWidth - 20}" height="${board.height - 20}" rx="10" fill="#efe6d4"/>`,
  );

  for (const side of ["L", "R"] as const) {
    const xP = geom.railX(side, "P") - 9;
    const xM = geom.railX(side, "M") - 9;
    const y = geom.rowY(1) - 10;
    const h = geom.rowY(spec.rows) - geom.rowY(1) + 20;
    parts.push(`<rect x="${xP}" y="${y}" width="18" height="${h}" rx="4" fill="#e8c8c2"/>`);
    parts.push(`<rect x="${xM}" y="${y}" width="18" height="${h}" rx="4" fill="#c5d0da"/>`);
  }

  for (const part of project.parts) {
    if (part.kind === "dip") continue;
    if (part.kind === "leaded") {
      const def = getPart(part.def);
      const pts = leadHoles(part)
        .map((h) => parseHole(h))
        .filter((h): h is NonNullable<typeof h> => !!h)
        .map((h) => geom.holeXY(h));
      if (pts.length < 2) continue;
      parts.push(
        leadedMarkup({
          defId: part.def,
          partClass: def?.class ?? "passive",
          polar: def?.polar,
          value: part.value,
          id: part.id,
          points: pts,
        }),
      );
    } else {
      parts.push(renderModuleCard(project, part.id, geom));
    }
  }

  const wireGeoms = wireGeomsFromProject(project, geom, resolveEndpoint);
  const wireLanes = computeWireLanes(wireGeoms);
  for (const wire of project.wires) {
    const w = wireGeoms.find((g) => g.id === wire.id);
    if (!w) continue;
    const lane = wireLanes.get(wire.id) ?? { lane: 0, count: 1 };
    parts.push(
      `<path d="${jumperPath(geom, w.ax, w.ay, w.bx, w.by, lane.lane, lane.count)}" fill="none" stroke="${esc(wire.color)}" stroke-width="2.4" stroke-linecap="round"/>`,
    );
  }

  for (const hole of allHoles(spec.rows)) {
    const { x, y } = geom.holeXY(hole);
    parts.push(`<circle cx="${x}" cy="${y}" r="${HOLE_R}" fill="#3a3228"/>`);
  }

  for (const part of project.parts) {
    if (part.kind !== "module") continue;
    const card = moduleCardGeom(project, part, geom);
    for (const pin of card.pins) {
      parts.push(
        `<circle cx="${pin.x}" cy="${pin.y}" r="${MODULE_PIN_R}" fill="#3a3228" stroke="#c9b896" stroke-width="0.8"/>`,
      );
    }
  }

  for (const part of project.parts) {
    if (part.kind !== "dip") continue;
    parts.push(dipMarkup(project, part, geom));
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

export function downloadPng(filename: string, project: Project) {
  const svg = renderProjectSvg(project);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, img.width * 2);
    canvas.height = Math.max(1, img.height * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#efe6d4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((out) => {
      URL.revokeObjectURL(url);
      if (!out) return;
      const href = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
    }, "image/png");
  };
  img.src = url;
}
