import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_PROJECT, EXAMPLE_555 } from "./examples.ts";
import { renderProjectSvg } from "./render-svg.ts";

test("renderProjectSvg emits a complete document for the 555 blinker", () => {
  const svg = renderProjectSvg(EXAMPLE_555);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /u1/);
  assert.equal(svg.includes("<script"), false);
});

test("renderProjectSvg still draws an empty board", () => {
  const svg = renderProjectSvg(EMPTY_PROJECT);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /<circle /);
});
