import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_555 } from "./examples.ts";
import { emptyLibrary, migrateSession, parseLibrary, removeLibrary, upsertLibrary } from "./library.ts";

test("upsert creates then updates a user project", () => {
  const created = upsertLibrary(emptyLibrary(), EXAMPLE_555, null, 1);
  assert.equal(created.entries.length, 1);
  assert.equal(created.activeId, "p1");
  assert.equal(created.entries[0].project.name, "555 blinker");
  const renamed = { ...EXAMPLE_555, name: "Kitchen timer" };
  const updated = upsertLibrary(created, renamed, "p1", 2);
  assert.equal(updated.entries.length, 1);
  assert.equal(updated.entries[0].project.name, "Kitchen timer");
  assert.equal(updated.entries[0].updatedAt, 2);
});

test("remove drops the entry and clears active if needed", () => {
  const file = upsertLibrary(emptyLibrary(), EXAMPLE_555, null, 1);
  const gone = removeLibrary(file, "p1");
  assert.equal(gone.entries.length, 0);
  assert.equal(gone.activeId, null);
});

test("parseLibrary ignores junk", () => {
  assert.deepEqual(parseLibrary(null), emptyLibrary());
  assert.deepEqual(parseLibrary({ version: 2, entries: [] }), emptyLibrary());
});

test("migrateSession lifts a leftover editor session into the library", () => {
  const migrated = migrateSession(emptyLibrary(), EXAMPLE_555);
  assert.equal(migrated.entries.length, 1);
  assert.equal(migrated.activeId, "p1");
  const skip = migrateSession(migrated, EXAMPLE_555);
  assert.equal(skip.entries.length, 1);
});
