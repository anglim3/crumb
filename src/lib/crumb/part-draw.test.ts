import assert from "node:assert/strict";
import { test } from "node:test";
import { leadLayout, leadedMarkup } from "./part-draw.ts";
import { EXAMPLE_555 } from "./examples.ts";
import { renderProjectSvg } from "./render-svg.ts";
import { PITCH } from "./geometry.ts";

test("vertical leads L-bend onto the column bisection", () => {
  const layout = leadLayout([
    { x: 100, y: 40 },
    { x: 100, y: 84 },
  ]);
  assert.equal(layout.axis, "col");
  assert.equal(layout.body.x, 100 + PITCH / 2);
  assert.match(layout.paths[0], /^M100 40 L111 40 L111 /);
  assert.equal(layout.paths.length, 2);
});

test("horizontal leads L-bend onto the row bisection", () => {
  const layout = leadLayout([
    { x: 40, y: 80 },
    { x: 84, y: 80 },
  ]);
  assert.equal(layout.axis, "row");
  assert.equal(layout.body.y, 80 + PITCH / 2);
  assert.match(layout.paths[0], /^M40 80 L40 91 L/);
});

test("resistor glyph is a banded barrel with L leads, not a lone line", () => {
  const svg = leadedMarkup({
    defId: "resistor",
    partClass: "passive",
    value: "1k",
    id: "r1",
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 44 },
    ],
  });
  assert.match(svg, /fill="#d7c4a0"/);
  assert.match(svg, /r1 R 1k/);
  assert.match(svg, /stroke-linejoin="miter"/);
  assert.doesNotMatch(svg, /stroke="#8a8478" stroke-width="1.4"/);
});

test("LED glyph has a dome and cathode tick", () => {
  const svg = leadedMarkup({
    defId: "led",
    partClass: "led",
    id: "d1",
    points: [
      { x: 10, y: 10 },
      { x: 10, y: 54 },
    ],
  });
  assert.match(svg, /fill="#c45c4a"/);
  assert.match(svg, /d1 LED/);
});

test("555 export draws resistor bands and an LED dome", () => {
  const svg = renderProjectSvg(EXAMPLE_555);
  assert.match(svg, /fill="#d7c4a0"/);
  assert.match(svg, /fill="#c45c4a"/);
  assert.match(svg, /stroke-linecap="square"/);
});
