import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBoot, libraryAutosave } from "./boot.ts";
import { EXAMPLE_555 } from "./examples.ts";
import { emptyLibrary, upsertLibrary } from "./library.ts";
import { encodeShare } from "./share.ts";
import { useCrumb } from "./store.ts";
import type { Project } from "./types.ts";

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

function named(name: string): Project {
  return { ...EXAMPLE_555, name };
}

test("#c= boot preserves the saved library until an explicit save", async () => {
  resetEditor();
  const saved = upsertLibrary(emptyLibrary(), named("Bench copy"), null, 1);
  const storedLibrary = JSON.stringify(saved);
  const share = named("Shared from a friend");
  await applyBoot(`#c=${await encodeShare(share)}`, {
    projectRaw: JSON.stringify(named("Session draft")),
    libraryRaw: storedLibrary,
  });

  const state = useCrumb.getState();
  assert.equal(state.project.name, "Shared from a friend");
  assert.equal(state.holdLibrary, true);
  assert.equal(state.library.activeId, null);
  assert.equal(state.library.entries.length, 1);
  assert.equal(state.library.entries[0].project.name, "Bench copy");
  assert.equal(libraryAutosave(state.library, state.project, state.holdLibrary), null);

  state.setName("Shared, edited");
  const edited = useCrumb.getState();
  assert.equal(edited.holdLibrary, true);
  assert.equal(libraryAutosave(edited.library, edited.project, edited.holdLibrary), null);
  assert.equal(edited.library.entries[0].project.name, "Bench copy");

  edited.saveProject();
  const savedState = useCrumb.getState();
  assert.equal(savedState.holdLibrary, false);
  const written = libraryAutosave(savedState.library, savedState.project, savedState.holdLibrary);
  const file = JSON.parse(written ?? "null") as { entries: { project: Project }[] };
  assert.equal(file.entries.length, 2);
  assert.ok(file.entries.some((entry) => entry.project.name === "Bench copy"));
  assert.ok(file.entries.some((entry) => entry.project.name === "Shared, edited"));
});

test("invalid #c= hash preserves the library and the project", async () => {
  resetEditor();
  const library = { ...upsertLibrary(emptyLibrary(), named("Keep this library"), null, 1), activeId: null };
  const session = named("Keep this project");
  await applyBoot("#c=%%%not-a-share%%%", {
    projectRaw: JSON.stringify(session),
    libraryRaw: JSON.stringify(library),
  });

  const state = useCrumb.getState();
  assert.equal(state.project.name, "Keep this project");
  assert.notEqual(state.project.name, EXAMPLE_555.name);
  assert.equal(state.holdLibrary, false);
  assert.equal(state.library.entries.length, 1);
  assert.equal(state.library.entries[0].project.name, "Keep this library");

  const written = libraryAutosave(state.library, state.project, state.holdLibrary);
  const file = JSON.parse(written ?? "null") as { entries: { project: Project }[]; activeId: string | null };
  assert.equal(file.entries.length, 1);
  assert.equal(file.entries[0].project.name, "Keep this library");
  assert.equal(file.activeId, null);
  assert.equal(JSON.parse(JSON.stringify(state.project)).name, "Keep this project");
});

test("a share does not migrate the previous session into an empty library", async () => {
  resetEditor();
  await applyBoot(`#c=${await encodeShare(named("Just visiting"))}`, {
    projectRaw: JSON.stringify(named("Old session")),
    libraryRaw: JSON.stringify(emptyLibrary()),
  });
  const state = useCrumb.getState();
  assert.equal(state.project.name, "Just visiting");
  assert.equal(state.library.entries.length, 0);
  assert.equal(libraryAutosave(state.library, state.project, state.holdLibrary), null);
});

test("legacy base64 #c= payload still holds the library", async () => {
  resetEditor();
  const share = named("Older link — café");
  const legacy = btoa(unescape(encodeURIComponent(JSON.stringify(share))));
  const library = upsertLibrary(emptyLibrary(), named("Keep this library"), null, 1);
  await applyBoot(`#c=${legacy}`, {
    projectRaw: JSON.stringify(named("Session draft")),
    libraryRaw: JSON.stringify(library),
  });
  const state = useCrumb.getState();
  assert.equal(state.project.name, "Older link — café");
  assert.equal(state.holdLibrary, true);
  assert.equal(state.library.activeId, null);
  assert.equal(state.library.entries.length, 1);
  assert.equal(libraryAutosave(state.library, state.project, state.holdLibrary), null);
});

test("a broken v2 share does not replace the saved project", async () => {
  resetEditor();
  const library = { ...upsertLibrary(emptyLibrary(), named("Keep this library"), null, 1), activeId: null };
  await applyBoot("#c=v2.!!!", {
    projectRaw: JSON.stringify(named("Keep this project")),
    libraryRaw: JSON.stringify(library),
  });
  const state = useCrumb.getState();
  assert.equal(state.project.name, "Keep this project");
  assert.equal(state.holdLibrary, false);
  assert.equal(state.library.entries.length, 1);
  assert.equal(state.library.entries[0]?.project.name, "Keep this library");
  assert.equal(libraryAutosave(state.library, state.project, state.holdLibrary) === null, false);
});
