import { getPart } from "./catalog.ts";
import { holeId } from "./holes.ts";
import { dipPinHole, resolveEndpoint } from "./layout.ts";
import { leadHoles } from "./mutate.ts";
import { computeNets, netForHole } from "./nets.ts";
import type { Net, Project } from "./types.ts";

export type ShortKind = "rail-short" | "supply-short" | "lead-short";

export type Short = {
  kind: ShortKind;
  message: string;
  netId: string;
  holes: string[];
  refs: string[];
};

const PLUS = /^(vcc|vdd|vin|v\+|avcc|5v|3v3|3\.3v|\+vs|\+|pos)$/i;
const MINUS = /^(gnd|vss|vee|agnd|v\-|\-|neg)$/i;

function pinPolarity(label: string): "plus" | "minus" | null {
  const t = label.trim();
  if (PLUS.test(t)) return "plus";
  if (MINUS.test(t)) return "minus";
  return null;
}

function holeOf(project: Project, raw: string): string | null {
  const hole = resolveEndpoint(project, raw);
  return hole ? holeId(hole) : null;
}

export function detectShorts(project: Project, nets = computeNets(project)): Short[] {
  const shorts: Short[] = [];
  const seen = new Set<string>();

  const push = (short: Short) => {
    const key = `${short.kind}:${short.netId}:${short.refs.slice().sort().join(",")}`;
    if (seen.has(key)) return;
    seen.add(key);
    shorts.push(short);
  };

  for (const net of nets) {
    if (net.label === "SHORT") {
      push({
        kind: "rail-short",
        message: "+ rail is shorted to − rail",
        netId: net.id,
        holes: net.holes,
        refs: [],
      });
    }
  }

  for (const part of project.parts) {
    if (part.kind === "leaded") {
      const ends = leadHoles(part);
      const resolved = ends.map((h) => holeOf(project, h));
      if (resolved.some((h) => !h)) continue;
      for (let i = 0; i < resolved.length; i++) {
        for (let j = i + 1; j < resolved.length; j++) {
          const a = resolved[i]!;
          const b = resolved[j]!;
          const netA = netForHole(nets, a);
          const netB = netForHole(nets, b);
          if (netA && netB && netA.id === netB.id) {
            push({
              kind: "lead-short",
              message: `${part.id} leads share a net (${a} and ${b})`,
              netId: netA.id,
              holes: netA.holes,
              refs: [part.id],
            });
          }
        }
      }
      continue;
    }

    if (part.kind === "module") {
      const def = getPart(part.def);
      if (!def) continue;
      const byNet = new Map<string, { pin: string; polarity: "plus" | "minus"; hole: string; net: Net }[]>();
      for (const pin of def.pins) {
        const id = `${part.id}.${pin.id}`;
        const net = netForHole(nets, id);
        if (!net) continue;
        const polarity = pinPolarity(pin.label) ?? pinPolarity(pin.id);
        if (!polarity) continue;
        const list = byNet.get(net.id) ?? [];
        list.push({ pin: pin.label, polarity, hole: id, net });
        byNet.set(net.id, list);
      }
      for (const group of byNet.values()) {
        const hasPlus = group.some((g) => g.polarity === "plus");
        const hasMinus = group.some((g) => g.polarity === "minus");
        if (hasPlus && hasMinus) {
          const net = group[0].net;
          push({
            kind: "supply-short",
            message: `${part.id} supply pins tied together (${group.map((g) => g.pin).join(", ")})`,
            netId: net.id,
            holes: net.holes,
            refs: [part.id],
          });
        }
      }
      continue;
    }

    if (part.kind !== "dip") continue;
    const def = getPart(part.def);
    if (!def) continue;
    const byNet = new Map<string, { pin: string; polarity: "plus" | "minus"; hole: string; net: Net }[]>();
    for (const pin of def.pins) {
      if (!pin.number) continue;
      const hole = dipPinHole(part, pin.number);
      if (!hole) continue;
      const id = holeId(hole);
      const net = netForHole(nets, id);
      if (!net) continue;
      const polarity = pinPolarity(pin.label);
      if (!polarity) continue;
      const list = byNet.get(net.id) ?? [];
      list.push({ pin: pin.label, polarity, hole: id, net });
      byNet.set(net.id, list);
    }
    for (const group of byNet.values()) {
      const hasPlus = group.some((g) => g.polarity === "plus");
      const hasMinus = group.some((g) => g.polarity === "minus");
      if (hasPlus && hasMinus) {
        const net = group[0].net;
        push({
          kind: "supply-short",
          message: `${part.id} supply pins tied together (${group.map((g) => g.pin).join(", ")})`,
          netId: net.id,
          holes: net.holes,
          refs: [part.id],
        });
      }
    }
  }

  return shorts;
}

export function shortHoles(shorts: Short[]): Set<string> {
  const holes = new Set<string>();
  for (const short of shorts) {
    for (const hole of short.holes) holes.add(hole);
  }
  return holes;
}
