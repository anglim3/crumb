import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_555 } from "./examples.ts";
import { DIMMED, focusedHoles, holeOpacity, itemOpacity, selectableIds } from "./focus.ts";

test("dims every other selectable item", () => {
  const ids = selectableIds(EXAMPLE_555);
  assert.equal(itemOpacity(null, "u1", ids), 1);
  assert.equal(itemOpacity("u1", "u1", ids), 1);
  assert.equal(itemOpacity("u1", "r1", ids), DIMMED);
  assert.equal(itemOpacity("10-e", "u1", ids), 1);
});

test("focused holes cover the 555 chip pins", () => {
  const holes = focusedHoles(EXAMPLE_555, "u1");
  assert.ok(holes);
  assert.ok(holes.has("10-e"));
  assert.ok(holes.has("10-f"));
  const led = focusedHoles(EXAMPLE_555, "d1");
  assert.ok(led && led.size >= 2);
});

test("dims holes that are not on the selection", () => {
  const holes = focusedHoles(EXAMPLE_555, "u1");
  assert.equal(holeOpacity(null, "1-a"), 1);
  assert.equal(holeOpacity(holes, "10-e"), 1);
  assert.equal(holeOpacity(holes, "1-a"), DIMMED);
});
