import { PITCH } from "./geometry.ts";
import type { PartClass } from "./types.ts";

export type DrawPt = { x: number; y: number };

function esc(value: string): string {
  return value.replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/"/g, "\u0026quot;");
}

export type LeadLayout = {
  axis: "col" | "row";
  body: DrawPt;
  paths: string[];
};

/** L-shaped leads that run on the midline between adjacent rows or columns. */
export function leadLayout(pts: DrawPt[]): LeadLayout {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const axis: "col" | "row" = maxY - minY >= maxX - minX ? "col" : "row";
  const half = PITCH / 2;

  if (axis === "col") {
    const colX = (minX + maxX) / 2;
    const channelX = colX + half;
    const body = { x: channelX, y: (minY + maxY) / 2 };
    const paths = pts.map((p) => `M${p.x} ${p.y} L${channelX} ${p.y} L${channelX} ${body.y}`);
    return { axis, body, paths };
  }

  const rowY = (minY + maxY) / 2;
  const channelY = rowY + half;
  const body = { x: (minX + maxX) / 2, y: channelY };
  const paths = pts.map((p) => `M${p.x} ${p.y} L${p.x} ${channelY} L${body.x} ${channelY}`);
  return { axis, body, paths };
}

const LEAD_STROKE = "#5c5852";

function leadStrokes(layout: LeadLayout): string {
  return layout.paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${LEAD_STROKE}" stroke-width="0.9" stroke-linecap="square" stroke-linejoin="miter"/>`,
    )
    .join("");
}

function caption(cx: number, cy: number, text: string, dy = 14): string {
  return `<text x="${cx}" y="${cy + dy}" text-anchor="middle" fill="#5a5248" font-size="6.5" font-family="ui-monospace, monospace">${esc(text)}</text>`;
}

function kindLabel(defId: string, partClass: PartClass): string {
  if (defId.includes("resistor")) return "R";
  if (defId.includes("electrolytic")) return "C+";
  if (defId.includes("cap")) return "C";
  if (defId === "led") return "LED";
  if (defId.includes("diode")) return "D";
  if (defId.includes("npn") || defId.includes("pnp")) return "Q";
  if (partClass === "button") return "BTN";
  if (partClass === "switch") return "SW";
  if (defId.includes("pot")) return "POT";
  if (partClass === "sensor") return "SNS";
  if (partClass === "power") return "PWR";
  return defId.slice(0, 4).toUpperCase();
}

export function leadedMarkup(opts: {
  defId: string;
  partClass: PartClass;
  polar?: boolean;
  value?: string;
  id: string;
  points: DrawPt[];
  selected?: boolean;
}): string {
  const pts = opts.points;
  if (pts.length < 2) return "";
  const layout = leadLayout(pts);
  const { x: bx, y: by } = layout.body;
  const stroke = opts.selected ? "#d8d2c8" : "#3a342e";
  const tag = [opts.id, kindLabel(opts.defId, opts.partClass), opts.value].filter(Boolean).join(" ");
  const id = opts.defId;
  const cls = opts.partClass;
  const metal = leadStrokes(layout);
  const capDy = layout.axis === "col" ? 16 : 14;

  if (cls === "led" || id === "led") {
    const last = pts[pts.length - 1];
    return [
      metal,
      `<circle cx="${bx}" cy="${by}" r="6.4" fill="#c45c4a" stroke="${stroke}" stroke-width="1.1"/>`,
      `<path d="M ${bx - 4} ${by - 3} L ${bx + 2} ${by - 6} L ${bx + 2} ${by + 6} L ${bx - 4} ${by + 3} Z" fill="#e8a090" opacity="0.55"/>`,
      `<line x1="${last.x - 3.5}" y1="${last.y}" x2="${last.x + 3.5}" y2="${last.y}" stroke="#2b2b2b" stroke-width="1.4" stroke-linecap="square"/>`,
      caption(bx, by, tag, capDy),
    ].join("");
  }

  if (id.includes("resistor")) {
    const hw = 12;
    const hh = 5;
    const x = bx - hw;
    const y = by - hh;
    const bands = ["#c45c4a", "#2b2b2b", "#c9a227", "#8a5a2b"];
    const bandW = (hw * 2) / 9;
    const bandRects = bands
      .map((c, i) => `<rect x="${x + bandW * (1.4 + i * 1.5)}" y="${y + 0.6}" width="${bandW}" height="${hh * 2 - 1.2}" fill="${c}"/>`)
      .join("");
    return [
      metal,
      `<rect x="${x}" y="${y}" width="${hw * 2}" height="${hh * 2}" rx="2.4" fill="#d7c4a0" stroke="${stroke}" stroke-width="1"/>`,
      bandRects,
      caption(bx, by, tag, capDy),
    ].join("");
  }

  if (id.includes("electrolytic")) {
    return [
      metal,
      `<rect x="${bx - 7}" y="${by - 8}" width="14" height="16" rx="3" fill="#4a6b8a" stroke="${stroke}" stroke-width="1"/>`,
      `<rect x="${bx + 3}" y="${by - 8}" width="4" height="16" fill="#1c1916"/>`,
      `<text x="${bx - 2}" y="${by + 3}" text-anchor="middle" fill="#efe6d4" font-size="7" font-family="monospace">+</text>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (id.includes("ceramic") || (cls === "passive" && id.includes("cap"))) {
    return [
      metal,
      `<ellipse cx="${bx}" cy="${by}" rx="8" ry="6.5" fill="#c9a56a" stroke="${stroke}" stroke-width="1"/>`,
      `<text x="${bx}" y="${by + 2.5}" text-anchor="middle" fill="#3a3228" font-size="6" font-family="monospace">C</text>`,
      caption(bx, by, tag, capDy),
    ].join("");
  }

  if (id.includes("diode")) {
    return [
      metal,
      `<rect x="${bx - 9}" y="${by - 5}" width="18" height="10" rx="1.5" fill="#c5d0da" stroke="${stroke}" stroke-width="1"/>`,
      `<rect x="${bx + 5.8}" y="${by - 5}" width="3.2" height="10" fill="#1c1916"/>`,
      `<polygon points="${bx - 4},${by - 3.5} ${bx + 3},${by} ${bx - 4},${by + 3.5}" fill="#2b2b2b"/>`,
      caption(bx, by, tag, capDy),
    ].join("");
  }

  if (id.includes("npn") || id.includes("pnp") || (pts.length === 3 && (id.includes("tmp36") || cls === "sensor"))) {
    return [
      metal,
      `<path d="M ${bx - 9} ${by + 6} L ${bx - 9} ${by - 8} A 9 9 0 0 1 ${bx + 9} ${by - 8} L ${bx + 9} ${by + 6} Z" fill="#2a2a2a" stroke="${stroke}" stroke-width="1"/>`,
      `<text x="${bx}" y="${by - 1}" text-anchor="middle" fill="#efe6d4" font-size="6" font-family="monospace">${esc(kindLabel(id, cls))}</text>`,
      caption(bx, by, tag, 16),
    ].join("");
  }

  if (cls === "button" || id.includes("button")) {
    return [
      metal,
      `<rect x="${bx - 9}" y="${by - 9}" width="18" height="18" rx="2" fill="#3a342e" stroke="${stroke}" stroke-width="1.1"/>`,
      `<circle cx="${bx}" cy="${by}" r="4.4" fill="#c45c4a"/>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (cls === "switch" || id.includes("switch")) {
    return [
      metal,
      `<rect x="${bx - 11}" y="${by - 6}" width="22" height="12" rx="2" fill="#4a453e" stroke="${stroke}" stroke-width="1"/>`,
      `<line x1="${bx - 2}" y1="${by}" x2="${bx + 9}" y2="${by - 9}" stroke="#c9b896" stroke-width="1.6" stroke-linecap="round"/>`,
      `<circle cx="${bx - 5}" cy="${by}" r="1.6" fill="#efe6d4"/>`,
      caption(bx, by, tag, 16),
    ].join("");
  }

  if (id.includes("pot")) {
    return [
      metal,
      `<rect x="${bx - 8}" y="${by - 8}" width="16" height="16" rx="2" fill="#6b5c8a" stroke="${stroke}" stroke-width="1"/>`,
      `<circle cx="${bx}" cy="${by}" r="4.2" fill="#d8d2c8"/>`,
      `<line x1="${bx}" y1="${by}" x2="${bx + 3}" y2="${by - 3}" stroke="#1c1916" stroke-width="1.3"/>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (cls === "sensor") {
    return [
      metal,
      `<rect x="${bx - 12}" y="${by - 8}" width="24" height="16" rx="3" fill="#2a3238" stroke="${stroke}" stroke-width="1.1"/>`,
      `<circle cx="${bx}" cy="${by}" r="3.2" fill="#8fad8a"/>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (cls === "power" || id.includes("7805") || id.includes("snap") || id.includes("jack")) {
    return [
      metal,
      `<rect x="${bx - 10}" y="${by - 7}" width="20" height="14" rx="1.5" fill="#3a3228" stroke="${stroke}" stroke-width="1"/>`,
      `<rect x="${bx - 10}" y="${by - 10}" width="20" height="4" fill="#8a8478"/>`,
      caption(bx, by, tag, 16),
    ].join("");
  }

  return [
    metal,
    `<rect x="${bx - 10}" y="${by - 5.5}" width="20" height="11" rx="2" fill="#d7c4a0" stroke="${stroke}" stroke-width="1"/>`,
    caption(bx, by, tag, capDy),
  ].join("");
}
