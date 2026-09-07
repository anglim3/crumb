import { getPart } from "./catalog.ts";
import { nextId } from "./ids.ts";
import type { BoardSize, PlacedPart, Project, Wire } from "./types.ts";

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
): Project {
  const pid = id ?? nextId(project.parts.map((p) => p.id), prefixFor(defId));
  const part: PlacedPart = { kind: "leaded", id: pid, def: defId, from, to, value };
  return { ...project, parts: [...project.parts.filter((p) => p.id !== pid), part] };
}

export function placeModule(project: Project, defId: string, slot: 0 | 1, offsetRow: number, id?: string): Project {
  const pid = id ?? nextId(project.parts.map((p) => p.id), "m");
  const part: PlacedPart = { kind: "module", id: pid, def: defId, slot, offsetRow };
  return { ...project, parts: [...project.parts.filter((p) => p.id !== pid), part] };
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

function prefixFor(defId: string): string {
  const def = getPart(defId);
  if (def?.class === "led") return "d";
  if (def?.class === "sensor") return "s";
  if (defId.includes("cap") || defId === "electrolytic") return "c";
  if (defId === "resistor") return "r";
  return "p";
}
