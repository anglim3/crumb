import assert from "node:assert/strict";
import { test } from "node:test";
import { dipBounds, dipSilkX, DIP_SILK_INSET, lastTerminalHoleIndex } from "./dip-draw.ts";
import { EXAMPLE_HOMEKIT_BLINDS } from "./examples.ts";
import { projectGeom } from "./geometry.ts";
import { renderProjectSvg } from "./render-svg.ts";

test("DIP silk labels sit inset from body edges, away from e/f holes", () => {
  const u1 = EXAMPLE_HOMEKIT_BLINDS.parts.find((p) => p.id === "u1");
  assert.ok(u1 && u1.kind === "dip");
  const geom = projectGeom(EXAMPLE_HOMEKIT_BLINDS);
  const bounds = dipBounds(geom, u1, 30);
  assert.ok(bounds);
  const leftX = dipSilkX(bounds!, true);
  const rightX = dipSilkX(bounds!, false);
  assert.equal(leftX, bounds!.left + DIP_SILK_INSET);
  assert.equal(rightX, bounds!.right - DIP_SILK_INSET);
  const eHole = geom.colX("e");
  const fHole = geom.colX("f");
  assert.ok(leftX > eHole - 2, "left silk should clear the e-column hole center");
  assert.ok(rightX < fHole + 2, "right silk should clear the f-column hole center");
});

test("homekit-blinds SVG draws DIP silk after terminal hole dots", () => {
  const svg = renderProjectSvg(EXAMPLE_HOMEKIT_BLINDS);
  const holeEnd = lastTerminalHoleIndex(svg);
  assert.ok(holeEnd >= 0);
  for (const label of ["D12", "D0/RX0", "STEP", "EN", "GND"]) {
    const i = svg.indexOf(`>${label}<`);
    assert.ok(i > holeEnd, `${label} should render above hole dots`);
  }
});

test("homekit-blinds SVG draws wires above DIP bodies", () => {
  const svg = renderProjectSvg(EXAMPLE_HOMEKIT_BLINDS);
  const lastDipSilk = Math.max(svg.lastIndexOf(">STEP<"), svg.lastIndexOf(">DIR<"));
  assert.ok(lastDipSilk >= 0);
  const wireIdx = svg.indexOf('stroke="#3d6b8a"');
  assert.ok(wireIdx > lastDipSilk, "signal wires should render above DIP silk");
});
