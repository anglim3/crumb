import assert from "node:assert/strict";
import { test } from "node:test";
import { holeId, parseHole, parsePinRef } from "./holes.ts";
import { dipPinHole, resolveEndpoint } from "./layout.ts";
import { computeNets, netForHole } from "./nets.ts";
import { EXAMPLE_555, EXAMPLE_BUTTON, EXAMPLE_ESP32, EXAMPLE_HOMEKIT_BLINDS, EXAMPLE_PICO, EMPTY_PROJECT } from "./examples.ts";
import { validateProject } from "./validate.ts";
import { placeDip, addWire, placeLeaded, parseProject, movePart, placeLeadedHoles } from "./mutate.ts";
import { detectShorts } from "./shorts.ts";
import { getPart } from "./catalog.ts";
import { readFileSync } from "node:fs";

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

test("esp32 and pico examples validate", () => {
  assert.deepEqual(validateProject(EXAMPLE_ESP32).filter((i) => i.level === "error"), []);
  assert.deepEqual(validateProject(EXAMPLE_PICO).filter((i) => i.level === "error"), []);
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

test("3-pin regulator occupies mid hole", () => {
  const project = placeLeaded(EMPTY_PROJECT, "lm7805", "5-a", "7-a", undefined, "reg", "6-a");
  const holes = validateProject(project);
  assert.deepEqual(holes.filter((i) => i.level === "error"), []);
  const shorted = placeLeaded(EMPTY_PROJECT, "lm7805", "5-a", "5-c", undefined, "reg", "5-b");
  assert.ok(detectShorts(shorted).some((s) => s.kind === "lead-short"));
});

test("parseProject rejects junk", () => {
  assert.throws(() => parseProject({ hello: true }));
  assert.equal(parseProject(EXAMPLE_555).name, "555 blinker");
});

test("movePart shifts a DIP down a row", () => {
  const placed = placeDip(EMPTY_PROJECT, "ne555", "10-e", "u1");
  const moved = movePart(placed, "u1", 2);
  const dip = moved.parts[0];
  assert.equal(dip.kind, "dip");
  if (dip.kind === "dip") assert.equal(dip.anchor, "12-e");
});

test("4-pin DHT occupies every lead", () => {
  const project = placeLeadedHoles(EMPTY_PROJECT, "dht22", ["20-j", "21-j", "22-j", "23-j"], undefined, "s1");
  assert.deepEqual(validateProject(project).filter((i) => i.level === "error"), []);
});

test("catalog includes core parts", () => {
  for (const id of [
    "ne555",
    "resistor",
    "led",
    "dht22",
    "uno",
    "mega",
    "nano",
    "nano-esp32",
    "tmc2208",
    "nema17",
    "limit-switch-nc",
    "pico",
    "pico-w",
    "pi4",
    "pi5",
    "esp32",
    "esp32-s3",
    "esp32-c3",
    "nodemcu",
    "attiny85",
  ]) {
    assert.ok(getPart(id), id);
  }
  assert.equal(getPart("esp32")?.dipPins, 30);
  assert.equal(getPart("pico")?.dipPins, 40);
  assert.equal(getPart("nano-esp32")?.dipPins, 30);
  assert.equal(getPart("tmc2208")?.dipPins, 16);
  assert.equal(getPart("nema17")?.class, "module");
  assert.equal(getPart("limit-switch-nc")?.polar, false);
});

test("nano-esp32 pin 1 is D12, not classic Nano TX", () => {
  const neo = getPart("nano-esp32")!;
  const classic = getPart("nano")!;
  assert.equal(neo.pins[0]?.label, "D12");
  assert.equal(classic.pins[0]?.label, "D1");
  assert.equal(neo.pins[15]?.label, "VIN");
  assert.equal(neo.pins[28]?.label, "3V3");
  assert.equal(neo.pins[29]?.label, "D13");
  const u1 = { kind: "dip" as const, id: "u1", def: "nano-esp32", anchor: "1-e" };
  assert.deepEqual(dipPinHole(u1, 1), { kind: "terminal", row: 1, col: "e" });
  assert.deepEqual(dipPinHole(u1, 15), { kind: "terminal", row: 15, col: "e" });
  assert.deepEqual(dipPinHole(u1, 16), { kind: "terminal", row: 15, col: "f" });
  assert.deepEqual(dipPinHole(u1, 29), { kind: "terminal", row: 2, col: "f" });
  assert.deepEqual(dipPinHole(u1, 30), { kind: "terminal", row: 1, col: "f" });
});

test("tmc2208 SilentStepStick pin 1 is GND, pin 16 is DIR", () => {
  const def = getPart("tmc2208")!;
  assert.deepEqual(
    def.pins.map((p) => p.label),
    ["GND", "VIO", "M2B", "M2A", "M1A", "M1B", "GND2", "VM", "EN", "MS1", "MS2", "UART", "PDN", "CLK", "STEP", "DIR"],
  );
  const u2 = { kind: "dip" as const, id: "u2", def: "tmc2208", anchor: "17-e" };
  assert.deepEqual(dipPinHole(u2, 1), { kind: "terminal", row: 17, col: "e" });
  assert.deepEqual(dipPinHole(u2, 8), { kind: "terminal", row: 24, col: "e" });
  assert.deepEqual(dipPinHole(u2, 9), { kind: "terminal", row: 24, col: "f" });
  assert.deepEqual(dipPinHole(u2, 16), { kind: "terminal", row: 17, col: "f" });
});

test("homekit-blinds example validates", () => {
  assert.deepEqual(validateProject(EXAMPLE_HOMEKIT_BLINDS).filter((i) => i.level === "error"), []);
  const raw = JSON.parse(readFileSync(new URL("../../../examples/homekit-blinds.json", import.meta.url), "utf8"));
  const fromFile = parseProject(raw);
  assert.deepEqual(validateProject(fromFile).filter((i) => i.level === "error"), []);
  assert.equal(resolveEndpoint(fromFile, "u1.D12")?.row, 1);
  assert.equal(resolveEndpoint(fromFile, "u1.3V3")?.row, 2);
  assert.equal(resolveEndpoint(fromFile, "u2.DIR")?.row, 17);
  assert.equal(resolveEndpoint(fromFile, "u2.VM")?.row, 24);
});
