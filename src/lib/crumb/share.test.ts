import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_555 } from "./examples.ts";
import { decodeShare, encodeShare } from "./share.ts";
import type { Project, Wire } from "./types.ts";

function legacyEncode(project: Project): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(project))));
}

test("v2 share round-trips unicode names", async () => {
  const project: Project = {
    ...EXAMPLE_555,
    name: "名前 — café 面包板 🍞",
  };
  const token = await encodeShare(project);
  assert.match(token, /^v2\.[A-Za-z0-9_-]+$/);
  const back = await decodeShare(token);
  assert.deepEqual(back, project);
});

test("v2 share round-trips a large board and is smaller than the JSON", async () => {
  const wires: Wire[] = Array.from({ length: 240 }, (_, i) => ({
    id: `w${i}`,
    from: `${(i % 30) + 1}-a`,
    to: `${(i % 30) + 1}-j`,
    color: i % 2 === 0 ? "#c45c4a" : "#2b2b2b",
  }));
  const project: Project = {
    version: 1,
    name: "Large board " + "ネット".repeat(40),
    board: "full",
    parts: EXAMPLE_555.parts,
    wires,
  };
  const json = JSON.stringify(project);
  const token = await encodeShare(project);
  assert.ok(token.startsWith("v2."));
  assert.ok(token.length < json.length, `${token.length} should be under ${json.length}`);
  assert.deepEqual(await decodeShare(token), project);
});

test("legacy base64 JSON shares still decode, including unicode", async () => {
  const project: Project = { ...EXAMPLE_555, name: "legacy µF — テスト" };
  const token = legacyEncode(project);
  assert.equal(token.startsWith("v2."), false);
  assert.deepEqual(await decodeShare(token), project);
});

test("v2 and legacy tokens do not decode as each other", async () => {
  const project = { ...EXAMPLE_555, name: "format check" };
  const modern = await encodeShare(project);
  const legacy = legacyEncode(project);
  assert.notEqual(modern, legacy);
  assert.deepEqual(await decodeShare(modern), project);
  assert.deepEqual(await decodeShare(legacy), project);
});
