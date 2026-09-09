import { detectShorts } from "./shorts.ts";
import { BOARD_SPECS } from "./board.ts";
import { getPart } from "./catalog.ts";
import { holeId, parseHole } from "./holes.ts";
import { dipPinHole, holeInBounds, occupiedHoles, resolveEndpoint } from "./layout.ts";
import { leadHoles } from "./mutate.ts";
import { computeNets } from "./nets.ts";
import type { Issue, Project } from "./types.ts";

export function validateProject(project: Project): Issue[] {
  const issues: Issue[] = [];
  const spec = BOARD_SPECS[project.board];
  const occ = occupiedHoles(project);
  const owners = new Map<string, string[]>();

  const addOcc = (id: string, owner: string) => {
    const list = owners.get(id) ?? [];
    list.push(owner);
    owners.set(id, list);
  };

  for (const part of project.parts) {
    const def = getPart(part.def);
    if (!def) {
      issues.push({ level: "error", code: "unknown-part", message: `Unknown part "${part.def}"`, refs: [part.id] });
      continue;
    }
    if (part.kind === "dip") {
      const count = def.dipPins ?? 0;
      const pin1 = parseHole(part.anchor);
      if (!pin1 || pin1.kind !== "terminal") {
        issues.push({ level: "error", code: "bad-anchor", message: `${part.id}: pin 1 must be a terminal hole like 10-e`, refs: [part.id] });
        continue;
      }
      if (pin1.col !== "e" && !(def.dipMirror && pin1.col === "f")) {
        issues.push({
          level: "warn",
          code: "dip-col",
          message: `${part.id}: seat 0.3" DIPs with pin 1 on column ${def.dipMirror ? "f" : "e"} so the body spans the gutter`,
          refs: [part.id],
        });
      }
      const last = dipPinHole(part, Math.floor(count / 2));
      if (last && !holeInBounds(project, last)) {
        issues.push({
          level: "error",
          code: "off-board",
          message: `${part.id} extends past row ${spec.rows}`,
          refs: [part.id],
        });
      }
      for (let n = 1; n <= count; n++) {
        const h = dipPinHole(part, n);
        if (h) addOcc(holeId(h), part.id);
      }
    } else if (part.kind === "leaded") {
      const from = parseHole(part.from);
      const to = parseHole(part.to);
      if (!from || !to) {
        issues.push({ level: "error", code: "bad-leads", message: `${part.id} has an invalid hole`, refs: [part.id] });
        continue;
      }
      if (!holeInBounds(project, from) || !holeInBounds(project, to)) {
        issues.push({ level: "error", code: "off-board", message: `${part.id} is off the board`, refs: [part.id] });
      }
      for (const hole of leadHoles(part)) addOcc(hole, part.id);
    }
  }

  for (const [hole, list] of owners) {
    const unique = [...new Set(list)];
    if (unique.length > 1) {
      issues.push({
        level: "error",
        code: "collision",
        message: `Hole ${hole} is used by ${unique.join(" and ")}`,
        refs: unique,
      });
    }
  }

  for (const wire of project.wires) {
    const a = resolveEndpoint(project, wire.from);
    const b = resolveEndpoint(project, wire.to);
    if (!a || !b) {
      issues.push({
        level: "error",
        code: "dangling-wire",
        message: `Wire ${wire.id} does not resolve to holes or module pins`,
        refs: [wire.id],
      });
    }
  }

  const nets = computeNets(project);
  for (const short of detectShorts(project, nets)) {
    issues.push({
      level: "error",
      code: short.kind,
      message: short.message,
      refs: short.refs.length ? short.refs : short.holes.slice(0, 8),
    });
  }

  const endpoints = new Set<string>();
  for (const wire of project.wires) {
    const key = [wire.from, wire.to].sort().join("|");
    if (endpoints.has(key)) {
      issues.push({ level: "warn", code: "dup-wire", message: `Duplicate jumper ${wire.from} ↔ ${wire.to}`, refs: [wire.id] });
    }
    endpoints.add(key);
  }

  void occ;
  return issues;
}
