import assert from "node:assert/strict";
import { test } from "node:test";
import { holeId, parseHole, parsePinRef } from "./holes.ts";
import { dipPinHole, resolveEndpoint } from "./layout.ts";
import { computeNets, netForHole } from "./nets.ts";
import { EXAMPLE_555, EXAMPLE_BUTTON, EMPTY_PROJECT } from "./examples.ts";
import { validateProject } from "./validate.ts";
import { placeDip, addWire, placeLeaded } from "./mutate.ts";
import { detectShorts } from "./shorts.ts";
import { getPart } from "./catalog.ts";

test("parses terminal and rail holes", () => {
  assert.deepEqual(parseHole("10-e"), { kind: "terminal", row: 10, col: "e" });
  assert.equal(holeId(parseHole("LP-12")!), "LP-12");
  assert.equal(parseHole("nope"), null);
});

test("parses part pin refs", () => {
  assert.deepEqual(parsePinRef("u1.8"), { partId: "u1", pin: "8" });
  assert.deepEqual(parsePinRef("u1.VCC"), { partId: "u1", pin: "VCC" });
});

test("555 pin map on 10-e", () => {
  const u1 = { kind: "dip" as const, id: "u1", def: "ne555", anchor: "10-e" };
  assert.deepEqual(dipPinHole(u1, 1), { kind: "terminal", row: 10, col: "e" });
  assert.deepEqual(dipPinHole(u1, 4), { kind: "terminal", row: 13, col: "e" });
  assert.deepEqual(dipPinHole(u1, 5), { kind: "terminal", row: 13, col: "f" });
  assert.deepEqual(dipPinHole(u1, 8), { kind: "terminal", row: 10, col: "f" });
});

test("resolves named 555 pins", () => {
  const vcc = resolveEndpoint(EXAMPLE_555, "u1.VCC");
  const gnd = resolveEndpoint(EXAMPLE_555, "u1.GND");
  assert.deepEqual(vcc, { kind: "terminal", row: 10, col: "f" });
  assert.deepEqual(gnd, { kind: "terminal", row: 10, col: "e" });
});

test("555 example has no vcc-gnd short and no collisions", () => {
  const issues = validateProject(EXAMPLE_555);
  assert.deepEqual(
    issues.filter((i) => i.level === "error"),
    [],
  );
  const nets = computeNets(EXAMPLE_555);
  const vcc = netForHole(nets, "LP-10");
  const gnd = netForHole(nets, "LM-10");
  assert.ok(vcc);
  assert.ok(gnd);
  assert.notEqual(vcc!.id, gnd!.id);
  assert.ok(vcc!.holes.includes("10-f"));
  assert.ok(gnd!.holes.includes("10-e"));
});

test("button example validates on mini board", () => {
  const errors = validateProject(EXAMPLE_BUTTON).filter((i) => i.level === "error");
  assert.deepEqual(errors, []);
});

test("detects vcc-gnd rail short", () => {
  let project = placeDip(EMPTY_PROJECT, "ne555", "10-e", "u1");
  project = addWire(project, "LP-10", "LM-10", "#c45c4a", "wshort");
  const issues = validateProject(project);
  assert.ok(issues.some((i) => i.code === "rail-short"));
  assert.ok(detectShorts(project).some((s) => s.kind === "rail-short"));
});

test("detects IC supply pins shorted", () => {
  let project = placeDip(EMPTY_PROJECT, "ne555", "10-e", "u1");
  project = addWire(project, "u1.8", "u1.1", "#c45c4a", "wshort");
  assert.ok(detectShorts(project).some((s) => s.kind === "supply-short"));
});

test("detects both leads on the same strip", () => {
  const project = placeLeaded(EMPTY_PROJECT, "resistor", "10-a", "10-c", "1k", "r1");
  const shorts = detectShorts(project);
  assert.ok(shorts.some((s) => s.kind === "lead-short"));
});

test("intentional 555 trig-thresh tie is not a short", () => {
  const shorts = detectShorts(EXAMPLE_555);
  assert.deepEqual(shorts, []);
});

test("catalog includes core parts", () => {
  for (const id of ["ne555", "resistor", "led", "dht22", "uno"]) {
    assert.ok(getPart(id), id);
  }
});
