import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { EXAMPLE_NOTES, EXAMPLE_SLUGS, EXAMPLES, readExampleLink } from "./examples.ts";
import { parseProject } from "./mutate.ts";
import { validateProject } from "./validate.ts";

test("every examples/*.json is in the gallery and has no errors", () => {
  const dir = new URL("../../../examples/", import.meta.url);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  assert.ok(files.includes("homekit-blinds.json"));
  assert.ok(files.includes("lm358-amplifier.json"));
  assert.ok(files.includes("74hc595-leds.json"));
  assert.ok(files.includes("attiny85-blink.json"));
  const byName = new Map(EXAMPLES.map((project) => [project.name, project]));
  assert.equal(files.length, EXAMPLES.length);
  for (const file of files) {
    const project = parseProject(JSON.parse(readFileSync(new URL(file, dir), "utf8")));
    const shipped = byName.get(project.name);
    assert.ok(shipped, `${file} (${project.name}) is missing from EXAMPLES`);
    assert.deepEqual(shipped, project);
    const errors = validateProject(project).filter((issue) => issue.level === "error");
    assert.deepEqual(errors, [], `${project.name}: ${errors.map((issue) => issue.message).join("; ")}`);
  }
});

test("example slugs match the JSON files and the gallery", () => {
  const dir = new URL("../../../examples/", import.meta.url);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .sort();
  assert.deepEqual(Object.keys(EXAMPLE_SLUGS).sort(), files);
  const names = Object.values(EXAMPLE_SLUGS).sort();
  assert.deepEqual(names, EXAMPLES.map((project) => project.name).sort());
  for (const name of names) assert.ok(EXAMPLE_NOTES[name], name);
});

test("readExampleLink names a shipped layout and drops the example parameter", () => {
  assert.deepEqual(readExampleLink(""), { name: null, search: "" });
  assert.deepEqual(readExampleLink("?keep=1"), { name: null, search: "?keep=1" });
  assert.deepEqual(readExampleLink("?example=555-blinker"), { name: "555 blinker", search: "" });
  assert.deepEqual(readExampleLink("?example=homekit-blinds&keep=1"), {
    name: "HomeKit blinds",
    search: "?keep=1",
  });
  assert.deepEqual(readExampleLink("?example=missing"), { name: null, search: "" });
});
