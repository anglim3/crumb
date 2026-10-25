import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_555 } from "./examples.ts";
import { decodeShare, encodeShare } from "./mutate.ts";

// Byte layout of the previous btoa(unescape(encodeURIComponent(...))) encoder
// for { version: 1, name: "Café 基板", board: "mini", parts: [], wires: [] }.
const LEGACY_CAFE = "eyJ2ZXJzaW9uIjoxLCJuYW1lIjoiQ2Fmw6kg5Z+65p2/IiwiYm9hcmQiOiJtaW5pIiwicGFydHMiOltdLCJ3aXJlcyI6W119";

test("encodeShare round-trips a project", () => {
  assert.deepEqual(decodeShare(encodeShare(EXAMPLE_555)), EXAMPLE_555);
});

test("decodeShare reads a link written by the previous encoder", () => {
  const project = decodeShare(LEGACY_CAFE);
  assert.equal(project.name, "Café 基板");
  assert.equal(project.board, "mini");
  assert.deepEqual(project.parts, []);
  assert.deepEqual(project.wires, []);
  assert.equal(encodeShare(project), LEGACY_CAFE);
});

test("decodeShare rejects a payload that is not a project", () => {
  assert.throws(() => decodeShare(btoa("{}")));
  assert.throws(() => decodeShare("%%%"));
});
