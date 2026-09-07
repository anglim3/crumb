import type { PartClass } from "./types.ts";

export type DrawPt = { x: number; y: number };

function esc(value: string): string {
  return value.replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/"/g, "\u0026quot;");
}

function frame(pts: DrawPt[]) {
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    a,
    b,
    ux,
    uy,
    px: -uy,
    py: ux,
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    len,
  };
}

function leads(pts: DrawPt[], cx: number, cy: number, stroke = "#9a9286"): string {
  return pts
    .map((p) => `<line x1="${p.x}" y1="${p.y}" x2="${cx}" y2="${cy}" stroke="${stroke}" stroke-width="1.05" />`)
    .join("");
}

function caption(cx: number, cy: number, text: string, dy = 16): string {
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

/** Distinct bodies so leaded parts do not read as jumpers. */
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
  const f = frame(pts);
  const stroke = opts.selected ? "#d8d2c8" : "#3a342e";
  const tag = [opts.id, kindLabel(opts.defId, opts.partClass), opts.value].filter(Boolean).join(" ");
  const id = opts.defId;
  const cls = opts.partClass;

  if (cls === "led" || id === "led") {
    const r = 7;
    const flatX = f.b.x;
    const flatY = f.b.y;
    return [
      leads(pts, f.cx, f.cy),
      `<circle cx="${f.cx}" cy="${f.cy}" r="${r}" fill="#c45c4a" stroke="${stroke}" stroke-width="1.1"/>`,
      `<path d="M ${f.cx - 4} ${f.cy - 3} L ${f.cx + 2} ${f.cy - 6} L ${f.cx + 2} ${f.cy + 6} L ${f.cx - 4} ${f.cy + 3} Z" fill="#e8a090" opacity="0.55"/>`,
      `<line x1="${flatX - f.px * 4}" y1="${flatY - f.py * 4}" x2="${flatX + f.px * 4}" y2="${flatY + f.py * 4}" stroke="#2b2b2b" stroke-width="1.4"/>`,
      caption(f.cx, f.cy, tag),
    ].join("");
  }

  if (id.includes("resistor")) {
    const hw = Math.min(16, Math.max(11, f.len * 0.22));
    const hh = 5.2;
    const x = f.cx - hw;
    const y = f.cy - hh;
    const bands = ["#c45c4a", "#2b2b2b", "#c9a227", "#8a5a2b"];
    const bandW = (hw * 2) / 9;
    const bandRects = bands
      .map((c, i) => `<rect x="${x + bandW * (1.4 + i * 1.5)}" y="${y + 0.6}" width="${bandW}" height="${hh * 2 - 1.2}" fill="${c}"/>`)
      .join("");
    return [
      leads(pts, f.cx, f.cy),
      `<rect x="${x}" y="${y}" width="${hw * 2}" height="${hh * 2}" rx="2.4" fill="#d7c4a0" stroke="${stroke}" stroke-width="1"/>`,
      bandRects,
      caption(f.cx, f.cy, tag),
    ].join("");
  }

  if (id.includes("electrolytic")) {
    return [
      leads(pts, f.cx, f.cy),
      `<rect x="${f.cx - 7}" y="${f.cy - 8}" width="14" height="16" rx="3" fill="#4a6b8a" stroke="${stroke}" stroke-width="1"/>`,
      `<rect x="${f.cx + 3}" y="${f.cy - 8}" width="4" height="16" fill="#1c1916"/>`,
      `<text x="${f.cx - 2}" y="${f.cy + 3}" text-anchor="middle" fill="#efe6d4" font-size="7" font-family="monospace">+</text>`,
      caption(f.cx, f.cy, tag, 18),
    ].join("");
  }

  if (id.includes("ceramic") || (cls === "passive" && id.includes("cap"))) {
    return [
      leads(pts, f.cx, f.cy),
      `<ellipse cx="${f.cx}" cy="${f.cy}" rx="8" ry="6.5" fill="#c9a56a" stroke="${stroke}" stroke-width="1"/>`,
      `<text x="${f.cx}" y="${f.cy + 2.5}" text-anchor="middle" fill="#3a3228" font-size="6" font-family="monospace">C</text>`,
      caption(f.cx, f.cy, tag, 15),
    ].join("");
  }

  if (id.includes("diode")) {
    const hw = 9;
    const hh = 5;
    return [
      leads(pts, f.cx, f.cy),
      `<rect x="${f.cx - hw}" y="${f.cy - hh}" width="${hw * 2}" height="${hh * 2}" rx="1.5" fill="#c5d0da" stroke="${stroke}" stroke-width="1"/>`,
      `<rect x="${f.cx + hw - 3.2}" y="${f.cy - hh}" width="3.2" height="${hh * 2}" fill="#1c1916"/>`,
      `<polygon points="${f.cx - 4},${f.cy - 3.5} ${f.cx + 3},${f.cy} ${f.cx - 4},${f.cy + 3.5}" fill="#2b2b2b"/>`,
      caption(f.cx, f.cy, tag),
    ].join("");
  }

  if (id.includes("npn") || id.includes("pnp") || (pts.length === 3 && (id.includes("tmp36") || cls === "sensor"))) {
    const midPt = pts[Math.min(1, pts.length - 1)];
    const bodyX = midPt.x;
    const bodyY = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2;
    return [
      leads(pts, bodyX, bodyY - 4),
      `<path d="M ${bodyX - 9} ${bodyY + 6} L ${bodyX - 9} ${bodyY - 8} A 9 9 0 0 1 ${bodyX + 9} ${bodyY - 8} L ${bodyX + 9} ${bodyY + 6} Z" fill="#2a2a2a" stroke="${stroke}" stroke-width="1"/>`,
      `<text x="${bodyX}" y="${bodyY - 1}" text-anchor="middle" fill="#efe6d4" font-size="6" font-family="monospace">${esc(kindLabel(id, cls))}</text>`,
      caption(bodyX, bodyY, tag, 14),
    ].join("");
  }

  if (cls === "button" || id.includes("button")) {
    const bx = f.cx;
    const by = f.cy;
    return [
      leads(pts, bx, by),
      `<rect x="${bx - 9}" y="${by - 9}" width="18" height="18" rx="2" fill="#3a342e" stroke="${stroke}" stroke-width="1.1"/>`,
      `<circle cx="${bx}" cy="${by}" r="4.4" fill="#c45c4a"/>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (cls === "switch" || id.includes("switch")) {
    const bx = f.cx;
    const by = f.cy;
    return [
      leads(pts, bx, by),
      `<rect x="${bx - 11}" y="${by - 6}" width="22" height="12" rx="2" fill="#4a453e" stroke="${stroke}" stroke-width="1"/>`,
      `<line x1="${bx - 2}" y1="${by}" x2="${bx + 9}" y2="${by - 9}" stroke="#c9b896" stroke-width="1.6" stroke-linecap="round"/>`,
      `<circle cx="${bx - 5}" cy="${by}" r="1.6" fill="#efe6d4"/>`,
      caption(bx, by, tag, 16),
    ].join("");
  }

  if (id.includes("pot")) {
    const bx = f.cx;
    const by = f.cy;
    return [
      leads(pts, bx, by),
      `<rect x="${bx - 8}" y="${by - 8}" width="16" height="16" rx="2" fill="#6b5c8a" stroke="${stroke}" stroke-width="1"/>`,
      `<circle cx="${bx}" cy="${by}" r="4.2" fill="#d8d2c8"/>`,
      `<line x1="${bx}" y1="${by}" x2="${bx + 3}" y2="${by - 3}" stroke="#1c1916" stroke-width="1.3"/>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (cls === "sensor") {
    const bx = f.cx;
    const by = f.cy;
    return [
      leads(pts, bx, by),
      `<rect x="${bx - 12}" y="${by - 8}" width="24" height="16" rx="3" fill="#2a3238" stroke="${stroke}" stroke-width="1.1"/>`,
      `<circle cx="${bx}" cy="${by}" r="3.2" fill="#8fad8a"/>`,
      caption(bx, by, tag, 18),
    ].join("");
  }

  if (cls === "power" || id.includes("7805") || id.includes("snap") || id.includes("jack")) {
    const bx = f.cx;
    const by = f.cy;
    return [
      leads(pts, bx, by),
      `<rect x="${bx - 10}" y="${by - 7}" width="20" height="14" rx="1.5" fill="#3a3228" stroke="${stroke}" stroke-width="1"/>`,
      `<rect x="${bx - 10}" y="${by - 10}" width="20" height="4" fill="#8a8478"/>`,
      caption(bx, by, tag, 16),
    ].join("");
  }

  return [
    leads(pts, f.cx, f.cy),
    `<rect x="${f.cx - 10}" y="${f.cy - 5.5}" width="20" height="11" rx="2" fill="#d7c4a0" stroke="${stroke}" stroke-width="1"/>`,
    caption(f.cx, f.cy, tag),
  ].join("");
}
