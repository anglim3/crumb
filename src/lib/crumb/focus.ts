import { getPart } from "./catalog.ts";
import { holeId } from "./holes.ts";
import { dipPinHole } from "./layout.ts";
import { leadHoles } from "./mutate.ts";
import type { Project } from "./types.ts";

/** Opacity for items that are not the current selection. */
export const DIMMED = 0.18;

export function selectableIds(project: Project): Set<string> {
  return new Set([...project.parts.map((p) => p.id), ...project.wires.map((w) => w.id)]);
}

/** Full opacity unless a part/wire is selected and this is not it. */
export function itemOpacity(selected: string | null, id: string, selectable: Set<string>): number {
  if (!selected || !selectable.has(selected)) return 1;
  return selected === id ? 1 : DIMMED;
}

/** Holes that belong to the selected part or wire. Null when nothing is isolated. */
export function focusedHoles(project: Project, selected: string | null): Set<string> | null {
  if (!selected) return null;
  const part = project.parts.find((p) => p.id === selected);
  const wire = project.wires.find((w) => w.id === selected);
  if (!part && !wire) return null;
  const holes = new Set<string>();
  if (part?.kind === "dip") {
    const count = getPart(part.def)?.dipPins ?? 8;
    for (let n = 1; n <= count; n++) {
      const hole = dipPinHole(part, n);
      if (hole) holes.add(holeId(hole));
    }
  } else if (part?.kind === "leaded") {
    for (const h of leadHoles(part)) holes.add(h);
  } else if (part?.kind === "module") {
    const pins = getPart(part.def)?.pins ?? [];
    for (const pin of pins) holes.add(`${part.id}.${pin.id}`);
  }
  if (wire) {
    holes.add(wire.from);
    holes.add(wire.to);
  }
  return holes;
}
