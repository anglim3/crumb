import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_555 } from "./examples.ts";
import { decodeShare, encodeLegacyShare, encodeShare } from "./share.ts";
import type { Project, Wire } from "./types.ts";

function legacyEncode(project: Project): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(project))));
}

// Byte layout of the previous btoa(unescape(encodeURIComponent(...))) encoder
// for { version: 1, name: "Café 基板", board: "mini", parts: [], wires: [] }.
const LEGACY_CAFE = "eyJ2ZXJzaW9uIjoxLCJuYW1lIjoiQ2Fmw6kg5Z+65p2/IiwiYm9hcmQiOiJtaW5pIiwicGFydHMiOltdLCJ3aXJlcyI6W119";

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

test("encodeShare round-trips a project", async () => {
  assert.deepEqual(await decodeShare(await encodeShare(EXAMPLE_555)), EXAMPLE_555);
});

test("the utf-8 helper matches a link written by the previous encoder", () => {
  const project: Project = {
    version: 1,
    name: "Café 基板",
    board: "mini",
    parts: [],
    wires: [],
  };
  assert.equal(encodeLegacyShare(project), LEGACY_CAFE);
  assert.equal(legacyEncode(project), LEGACY_CAFE);
});

test("decodeShare reads a link written by the previous encoder", async () => {
  const project = await decodeShare(LEGACY_CAFE);
  assert.equal(project.name, "Café 基板");
  assert.equal(project.board, "mini");
  assert.deepEqual(project.parts, []);
  assert.deepEqual(project.wires, []);
  assert.equal(encodeLegacyShare(project), LEGACY_CAFE);
});

test("decodeShare rejects a payload that is not a project", async () => {
  await assert.rejects(() => decodeShare(btoa("{}")));
  await assert.rejects(() => decodeShare("%%%"));
});
