import assert from "node:assert/strict";
import { test } from "node:test";
import { boardGeom } from "./geometry.ts";
import { resolveEndpoint } from "./layout.ts";
import { EXAMPLE_HOMEKIT_BLINDS } from "./examples.ts";
import { validateProject } from "./validate.ts";
import { computeWireLanes, jumperPath, laneOffset, WIRE_LANE_SPACING } from "./wire-path.ts";

test("laneOffset centers peers around zero", () => {
  assert.equal(laneOffset(0, 1), 0);
  assert.equal(laneOffset(0, 2), -WIRE_LANE_SPACING / 2);
  assert.equal(laneOffset(1, 2), WIRE_LANE_SPACING / 2);
  assert.equal(laneOffset(1, 3), 0);
  assert.equal(laneOffset(0, 3), -WIRE_LANE_SPACING);
  assert.equal(laneOffset(2, 3), WIRE_LANE_SPACING);
});

test("vertical wires in the same column get distinct paths", () => {
  const geom = boardGeom("mini");
  const wires = [
    { id: "wA", ax: 100, ay: 50, bx: 100, by: 150 },
    { id: "wB", ax: 100, ay: 60, bx: 100, by: 140 },
    { id: "wC", ax: 100, ay: 70, bx: 100, by: 130 },
  ];
  const lanes = computeWireLanes(wires);
  assert.equal(lanes.get("wA")!.count, 3);
  assert.equal(lanes.get("wB")!.count, 3);
  assert.equal(lanes.get("wC")!.count, 3);

  const paths = wires.map((w) => {
    const lane = lanes.get(w.id)!;
    return jumperPath(geom, w.ax, w.ay, w.bx, w.by, lane.lane, lane.count);
  });
  assert.notEqual(paths[0], paths[1]);
  assert.notEqual(paths[1], paths[2]);
  assert.notEqual(paths[0], paths[2]);

  for (const [i, w] of wires.entries()) {
    const lane = lanes.get(w.id)!;
    const path = paths[i]!;
    assert.ok(path.startsWith(`M ${w.ax} ${w.ay}`));
    assert.ok(path.endsWith(`${w.bx} ${w.by}`));
  }
});

test("horizontal wires on the same row get distinct paths", () => {
  const geom = boardGeom("mini");
  const wires = [
    { id: "w1", ax: 50, ay: 200, bx: 250, by: 200 },
    { id: "w2", ax: 60, ay: 200, bx: 240, by: 200 },
    { id: "w3", ax: 70, ay: 200, bx: 230, by: 200 },
  ];
  const lanes = computeWireLanes(wires);
  assert.equal(lanes.get("w1")!.count, 3);

  const paths = wires.map((w) => {
    const lane = lanes.get(w.id)!;
    return jumperPath(geom, w.ax, w.ay, w.bx, w.by, lane.lane, lane.count);
  });
  assert.notEqual(paths[0], paths[1]);
  assert.notEqual(paths[1], paths[2]);

  for (const [i, w] of wires.entries()) {
    const path = paths[i]!;
    assert.ok(path.startsWith(`M ${w.ax} ${w.ay}`));
    assert.ok(path.endsWith(`${w.bx} ${w.by}`));
  }
});

test("wires in different corridors stay independent", () => {
  const wires = [
    { id: "wA", ax: 100, ay: 50, bx: 100, by: 150 },
    { id: "wB", ax: 200, ay: 50, bx: 200, by: 150 },
  ];
  const lanes = computeWireLanes(wires);
  assert.equal(lanes.get("wA")!.count, 1);
  assert.equal(lanes.get("wB")!.count, 1);
  assert.equal(lanes.get("wA")!.lane, 0);
  assert.equal(lanes.get("wB")!.lane, 0);
});

test("homekit blinds example still validates", () => {
  const errors = validateProject(EXAMPLE_HOMEKIT_BLINDS).filter((i) => i.level === "error");
  assert.deepEqual(errors, []);
});

test("homekit blinds assigns lanes to stacked signal wires", () => {
  const geom = boardGeom(EXAMPLE_HOMEKIT_BLINDS.board);
  const wires = EXAMPLE_HOMEKIT_BLINDS.wires.flatMap((wire) => {
    const a = resolveEndpoint(EXAMPLE_HOMEKIT_BLINDS, wire.from);
    const b = resolveEndpoint(EXAMPLE_HOMEKIT_BLINDS, wire.to);
    if (!a || !b) return [];
    const pa = geom.holeXY(a);
    const pb = geom.holeXY(b);
    return [{ id: wire.id, ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y }];
  });
  const lanes = computeWireLanes(wires);

  const stacked = ["w13", "w14", "w15"];
  for (const id of stacked) {
    assert.ok(lanes.has(id), `expected lane for ${id}`);
    assert.equal(lanes.get(id)!.count, 3, `${id} should share the D-line column`);
  }

  const paths = stacked.map((id) => {
    const w = wires.find((wire) => wire.id === id)!;
    const lane = lanes.get(id)!;
    return jumperPath(geom, w.ax, w.ay, w.bx, w.by, lane.lane, lane.count);
  });
  assert.notEqual(paths[0], paths[1]);
  assert.notEqual(paths[1], paths[2]);
});
