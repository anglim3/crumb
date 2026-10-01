import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { PathNotAllowedError, isInsideRoot, resolveAllowedPath } from "./paths.mjs";

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "crumb-root-"));
  const outside = mkdtempSync(join(tmpdir(), "crumb-out-"));
  const insideFile = join(root, "board.json");
  writeFileSync(insideFile, '{"version":1}\n');
  writeFileSync(join(outside, "secret.json"), '{"token":"UNIQUE_SECRET_SNIPPET_13"}\n');
  return { root, outside, insideFile };
}

function cleanup(box) {
  rmSync(box.root, { recursive: true, force: true });
  rmSync(box.outside, { recursive: true, force: true });
}

function assertDenied(fn) {
  assert.throws(fn, PathNotAllowedError);
  try {
    fn();
  } catch (err) {
    assert.equal(err.message, "Path is not allowed");
    assert.equal(String(err).includes("UNIQUE_SECRET_SNIPPET_13"), false);
  }
}

test("relative and absolute paths inside the root are allowed", () => {
  const box = sandbox();
  try {
    const relative = resolveAllowedPath("board.json", box.root);
    assert.equal(relative, resolve(box.insideFile));
    const absolute = resolveAllowedPath(box.insideFile, box.root);
    assert.equal(absolute, resolve(box.insideFile));
    const nested = resolveAllowedPath("mcp/../board.json", box.root);
    assert.equal(nested, resolve(box.insideFile));
  } finally {
    cleanup(box);
  }
});

test("missing files are allowed when the parent stays under the root", () => {
  const box = sandbox();
  try {
    const missing = resolveAllowedPath("new/project.json", box.root);
    assert.equal(missing, join(resolve(box.root), "new", "project.json"));
  } finally {
    cleanup(box);
  }
});

test("absolute path outside the root is rejected", () => {
  const box = sandbox();
  try {
    assertDenied(() => resolveAllowedPath(join(box.outside, "secret.json"), box.root));
    assertDenied(() => resolveAllowedPath("/etc/passwd", box.root));
  } finally {
    cleanup(box);
  }
});

test("`..` traversal that leaves the root is rejected", () => {
  const box = sandbox();
  try {
    assertDenied(() => resolveAllowedPath("../secret.json", box.root));
    assertDenied(() => resolveAllowedPath(join("new", "..", "..", "crumb-out", "secret.json"), box.root));
    assertDenied(() => resolveAllowedPath(join(box.root, "..", "..", "etc", "passwd"), box.root));
  } finally {
    cleanup(box);
  }
});

test("symlink that escapes the root is rejected", () => {
  const box = sandbox();
  try {
    const escapeLink = join(box.root, "escape.json");
    symlinkSync(join(box.outside, "secret.json"), escapeLink);
    assertDenied(() => resolveAllowedPath(escapeLink, box.root));
    assertDenied(() => resolveAllowedPath("escape.json", box.root));

    const dirLink = join(box.root, "out-dir");
    symlinkSync(box.outside, dirLink);
    assertDenied(() => resolveAllowedPath(join("out-dir", "secret.json"), box.root));
    assertDenied(() => resolveAllowedPath(join(dirLink, "new.json"), box.root));
  } finally {
    cleanup(box);
  }
});

test("symlink that stays under the root is allowed", () => {
  const box = sandbox();
  try {
    mkdirSync(join(box.root, "sub"));
    const target = join(box.root, "sub", "real.json");
    writeFileSync(target, "{}\n");
    symlinkSync(target, join(box.root, "alias.json"));
    assert.equal(resolveAllowedPath("alias.json", box.root), resolve(target));
  } finally {
    cleanup(box);
  }
});

test("dangling symlink fails closed", () => {
  const box = sandbox();
  try {
    symlinkSync(join(box.outside, "missing.json"), join(box.root, "dangling.json"));
    assertDenied(() => resolveAllowedPath("dangling.json", box.root));
  } finally {
    cleanup(box);
  }
});

test("nul bytes and empty paths fail closed", () => {
  const box = sandbox();
  try {
    assertDenied(() => resolveAllowedPath("", box.root));
    assertDenied(() => resolveAllowedPath("board.json\0/etc/passwd", box.root));
    assertDenied(() => resolveAllowedPath("board.json", box.root + "\0/etc"));
  } finally {
    cleanup(box);
  }
});

test("isInsideRoot rejects sibling prefixes", () => {
  assert.equal(isInsideRoot("/workspace", "/workspace/examples/a.json"), true);
  assert.equal(isInsideRoot("/workspace", "/workspace"), true);
  assert.equal(isInsideRoot("/workspace", "/workspace-evil/a.json"), false);
  assert.equal(isInsideRoot("/workspace", "/etc/passwd"), false);
});
