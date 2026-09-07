import assert from "node:assert/strict";
import { test } from "node:test";
import { leadedMarkup } from "./part-draw.ts";
import { EXAMPLE_555 } from "./examples.ts";
import { renderProjectSvg } from "./render-svg.ts";

test("resistor glyph is a banded barrel, not a lone line", () => {
  const svg = leadedMarkup({
    defId: "resistor",
    partClass: "passive",
    value: "1k",
    id: "r1",
    points: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ],
  });
  assert.match(svg, /fill="#d7c4a0"/);
  assert.match(svg, /r1 R 1k/);
  assert.doesNotMatch(svg, /stroke="#8a8478" stroke-width="1.4"/);
});

test("LED glyph has a dome and cathode tick", () => {
  const svg = leadedMarkup({
    defId: "led",
    partClass: "led",
    id: "d1",
    points: [
      { x: 10, y: 10 },
      { x: 10, y: 40 },
    ],
  });
  assert.match(svg, /fill="#c45c4a"/);
  assert.match(svg, /d1 LED/);
});

test("555 export draws resistor bands and an LED dome", () => {
  const svg = renderProjectSvg(EXAMPLE_555);
  assert.match(svg, /fill="#d7c4a0"/);
  assert.match(svg, /fill="#c45c4a"/);
});
