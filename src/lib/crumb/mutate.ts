import { getPart } from "./catalog.ts";
import { holeId, parseHole } from "./holes.ts";
import { nextId } from "./ids.ts";
import type { BoardSize, PlacedLeaded, PlacedPart, Project, Wire } from "./types.ts";

export function setBoard(project: Project, board: BoardSize): Project {
  return { ...project, board };
}

export function placeDip(project: Project, defId: string, anchor: string, id?: string): Project {
  const pid = id ?? nextId(project.parts.map((p) => p.id), "u");
  const part: PlacedPart = { kind: "dip", id: pid, def: defId, anchor };
  return { ...project, parts: [...project.parts.filter((p) => p.id !== pid), part] };
}

export function placeLeaded(
  project: Project,
  defId: string,
  from: string,
  to: string,
  value?: string,
  id?: string,
  mid?: string,
  legs?: string[],
): Project {
  const pid = id ?? nextId(project.parts.map((p) => p.id), prefixFor(defId));
  const part: PlacedLeaded = { kind: "leaded", id: pid, def: defId, from, to, value };
  if (mid) part.mid = mid;
  if (legs?.length) part.legs = legs;
  return { ...project, parts: [...project.parts.filter((p) => p.id !== pid), part] };
}

export function placeLeadedHoles(project: Project, defId: string, holes: string[], value?: string, id?: string): Project {
  const from = holes[0];
  const to = holes[holes.length - 1];
  const mid = holes.length >= 3 ? holes[1] : undefined;
  const legs = holes.length >= 4 ? holes.slice(2, -1) : undefined;
  return placeLeaded(project, defId, from, to, value, id, mid, legs);
}

export function placeModule(project: Project, defId: string, slot: 0 | 1, offsetRow: number, id?: string): Project {
  const pid = id ?? nextId(project.parts.map((p) => p.id), "m");
  const part: PlacedPart = { kind: "module", id: pid, def: defId, slot, offsetRow };
  return { ...project, parts: [...project.parts.filter((p) => p.id !== pid), part] };
}

export function updatePart(project: Project, id: string, patch: Partial<PlacedPart>): Project {
  return {
    ...project,
    parts: project.parts.map((part) => (part.id === id ? ({ ...part, ...patch } as PlacedPart) : part)),
  };
}

export function shiftHole(hole: string, dRow: number): string {
  const parsed = parseHole(hole);
  if (!parsed) return hole;
  return holeId({ ...parsed, row: Math.max(1, parsed.row + dRow) });
}

export function movePart(project: Project, id: string, dRow: number): Project {
  if (!dRow) return project;
  return {
    ...project,
    parts: project.parts.map((part) => {
      if (part.id !== id) return part;
      if (part.kind === "dip") return { ...part, anchor: shiftHole(part.anchor, dRow) };
      if (part.kind === "leaded") {
        return {
          ...part,
          from: shiftHole(part.from, dRow),
          to: shiftHole(part.to, dRow),
          mid: part.mid ? shiftHole(part.mid, dRow) : undefined,
          legs: part.legs?.map((h) => shiftHole(h, dRow)),
        };
      }
      return { ...part, offsetRow: Math.max(1, part.offsetRow + dRow) };
    }),
  };
}

export function removePart(project: Project, id: string): Project {
  return { ...project, parts: project.parts.filter((p) => p.id !== id) };
}

export function addWire(project: Project, from: string, to: string, color: string, id?: string): Project {
  const wid = id ?? nextId(project.wires.map((w) => w.id), "w");
  const wire: Wire = { id: wid, from, to, color };
  return { ...project, wires: [...project.wires.filter((w) => w.id !== wid), wire] };
}

export function removeWire(project: Project, id: string): Project {
  return { ...project, wires: project.wires.filter((w) => w.id !== id) };
}

export function leadHoles(part: PlacedLeaded): string[] {
  const holes = [part.from];
  if (part.mid) holes.push(part.mid);
  if (part.legs) holes.push(...part.legs);
  holes.push(part.to);
  return holes;
}

export function parseProject(raw: unknown): Project {
  if (!raw || typeof raw !== "object") throw new Error("Not a Crumb file");
  const doc = raw as Project;
  if (doc.version !== 1 || !Array.isArray(doc.parts) || !Array.isArray(doc.wires)) {
    throw new Error("Not a Crumb file");
  }
  if (!doc.board) throw new Error("Missing board size");
  return doc;
}

export function encodeShare(project: Project): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(project))));
}

export function decodeShare(payload: string): Project {
  return parseProject(JSON.parse(decodeURIComponent(escape(atob(payload)))));
}

function prefixFor(defId: string): string {
  const def = getPart(defId);
  if (def?.class === "led") return "d";
  if (def?.class === "sensor") return "s";
  if (defId.includes("cap") || defId === "electrolytic") return "c";
  if (defId === "resistor") return "r";
  return "p";
}
