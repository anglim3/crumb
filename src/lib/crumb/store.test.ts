import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_555, EMPTY_PROJECT } from "./examples.ts";
import { emptyLibrary } from "./library.ts";
import { useCrumb } from "./store.ts";

function resetEditor() {
  useCrumb.setState({
    project: structuredClone(EXAMPLE_555),
    past: [],
    future: [],
    tool: "select",
    pendingDef: null,
    placeClicks: [],
    wireFrom: null,
    selected: null,
    hoverHole: null,
    highlightNet: null,
    jsonOpen: false,
    library: emptyLibrary(),
    holdLibrary: false,
  });
}

test("undo and redo restore the project name", () => {
  resetEditor();
  useCrumb.getState().setName("Renamed");
  assert.equal(useCrumb.getState().project.name, "Renamed");
  useCrumb.getState().undo();
  assert.equal(useCrumb.getState().project.name, EXAMPLE_555.name);
  useCrumb.getState().redo();
  assert.equal(useCrumb.getState().project.name, "Renamed");
});

test("loadJson replaces the project and reports a bad file", () => {
  resetEditor();
  const err = useCrumb.getState().loadJson(JSON.stringify({ ...EMPTY_PROJECT, name: "From disk" }));
  assert.equal(err, null);
  assert.equal(useCrumb.getState().project.name, "From disk");
  assert.equal(useCrumb.getState().jsonOpen, false);

  const bad = useCrumb.getState().loadJson("{");
  assert.equal(bad, "That file is not valid JSON.");
  assert.equal(useCrumb.getState().project.name, "From disk");

  const junk = useCrumb.getState().loadJson(JSON.stringify({ hello: true }));
  assert.equal(junk, "Not a Crumb file");
  assert.equal(useCrumb.getState().project.name, "From disk");
});

test("saveProject stores the current board in the library", () => {
  resetEditor();
  useCrumb.getState().newProject();
  useCrumb.getState().setName("Night light");
  useCrumb.getState().saveProject();
  const library = useCrumb.getState().library;
  assert.equal(library.entries.length, 1);
  assert.equal(library.entries[0]?.project.name, "Night light");
  assert.equal(library.activeId, library.entries[0]?.id);
  assert.equal(useCrumb.getState().holdLibrary, false);
});
