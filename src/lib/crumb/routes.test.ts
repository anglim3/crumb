import assert from "node:assert/strict";
import { test } from "node:test";
import { isEditorPath, staticPagePath } from "./routes.ts";

test("only the editor shell is a known path", () => {
  assert.equal(isEditorPath("/"), true);
  assert.equal(isEditorPath("/index.html"), true);
  assert.equal(isEditorPath("/index.html/"), true);
  assert.equal(isEditorPath("/missing"), false);
  assert.equal(isEditorPath("/editor"), false);
  assert.equal(isEditorPath("/examples"), false);
  assert.equal(isEditorPath("/examples/"), false);
  assert.equal(isEditorPath("/how-it-works"), false);
  assert.equal(isEditorPath("/how-it-works/"), false);
  assert.equal(staticPagePath("/examples"), "/examples/");
  assert.equal(staticPagePath("/how-it-works"), "/how-it-works/");
  assert.equal(staticPagePath("/examples/"), null);
  assert.equal(staticPagePath("/how-it-works/"), null);
  assert.equal(staticPagePath("/"), null);
});
