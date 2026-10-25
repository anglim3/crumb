import assert from "node:assert/strict";
import { test } from "node:test";
import { isEditorPath } from "./routes.ts";

test("only the editor shell is a known path", () => {
  assert.equal(isEditorPath("/"), true);
  assert.equal(isEditorPath("/index.html"), true);
  assert.equal(isEditorPath("/index.html/"), true);
  assert.equal(isEditorPath("/missing"), false);
  assert.equal(isEditorPath("/editor"), false);
});
