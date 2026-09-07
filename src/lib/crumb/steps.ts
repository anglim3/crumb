import { getPart } from "./catalog";
import type { BuildStep, Project } from "./types";

export function buildSteps(project: Project): BuildStep[] {
  const steps: BuildStep[] = [
    {
      title: "Seat the board",
      detail: `Use a ${project.board} solderless breadboard. Power rails are the outer + / − columns.`,
    },
  ];
  for (const part of project.parts) {
    const def = getPart(part.def);
    const name = def?.name ?? part.def;
    if (part.kind === "dip") {
      steps.push({
        title: `Place ${part.id} · ${name}`,
        detail: `Pin 1 (notch) goes in ${part.anchor}. The body spans the center gutter.`,
      });
    } else if (part.kind === "leaded") {
      const value = part.value ? ` (${part.value})` : "";
      steps.push({
        title: `Place ${part.id} · ${name}${value}`,
        detail: `Leads in ${part.from} and ${part.to}.`,
      });
    } else {
      steps.push({
        title: `Park ${part.id} · ${name}`,
        detail: `Keep the module off the board on the ${part.slot === 0 ? "left" : "right"} and jumper its pins to the holes in the JSON.`,
      });
    }
  }
  for (const wire of project.wires) {
    steps.push({
      title: `Jumper ${wire.id}`,
      detail: `${wire.from} → ${wire.to}`,
    });
  }
  return steps;
}
