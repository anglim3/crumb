import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(repoRoot, "mcp/server.mjs");
const SECRET = "UNIQUE_SECRET_SNIPPET_13";

const PATH_TOOLS = [
  { name: "get_board", args: {} },
  { name: "validate", args: {} },
  { name: "list_nets", args: {} },
  {
    name: "set_project",
    args: { project: { version: 1, name: "pwn", board: "half", parts: [], wires: [] } },
  },
  { name: "place_part", args: { def: "ne555", kind: "dip", anchor: "10-e" } },
  { name: "add_wire", args: { from: "LP-10", to: "10-f" } },
  { name: "remove_part", args: { id: "u1" } },
];

function startServer() {
  const child = spawn(process.execPath, ["--experimental-strip-types", serverPath], {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buf = "";
  let nextId = 1;
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!line.trim()) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      const waiter = pending.get(msg.id);
      if (waiter) {
        pending.delete(msg.id);
        waiter.resolve(msg);
      }
    }
  });
  child.stderr.setEncoding("utf8");
  const rpc = (method, params) => {
    const id = nextId++;
    const { promise, resolve: ok, reject } = Promise.withResolvers();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout waiting for ${method}`));
    }, 5000);
    pending.set(id, {
      resolve: (msg) => {
        clearTimeout(timer);
        ok(msg);
      },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    return promise;
  };
  const callTool = (name, args) => rpc("tools/call", { name, arguments: args });
  const close = () => {
    child.kill();
  };
  return { child, rpc, callTool, close };
}

function assertGenericPathError(msg) {
  assert.ok(msg.error, `expected error, got ${JSON.stringify(msg)}`);
  assert.equal(msg.error.message, "Path is not allowed");
  const blob = JSON.stringify(msg);
  assert.equal(blob.includes(SECRET), false);
  assert.equal(blob.includes("SyntaxError"), false);
}

function assertGenericParseError(msg) {
  assert.ok(msg.error, `expected error, got ${JSON.stringify(msg)}`);
  assert.equal(msg.error.message, "Invalid project file");
  const blob = JSON.stringify(msg);
  assert.equal(blob.includes(SECRET), false);
  assert.equal(blob.includes("SyntaxError"), false);
  assert.equal(blob.includes("not valid JSON"), false);
}

test("MCP tools allow in-repo relative paths and default file", async () => {
  const { rpc, callTool, close } = startServer();
  try {
    await rpc("initialize", {});
    const listed = await rpc("tools/list");
    const names = listed.result.tools.map((t) => t.name);
    for (const tool of PATH_TOOLS) {
      assert.ok(names.includes(tool.name), tool.name);
    }

    const def = await callTool("get_board", {});
    assert.ok(!def.error, def.error?.message);
    assert.match(def.result.content[0].text, /555 blinker/);

    const relative = await callTool("get_board", { path: "examples/555-blinker.json" });
    assert.ok(!relative.error, relative.error?.message);
    assert.match(relative.result.content[0].text, /555 blinker/);

    const nested = await callTool("validate", { path: "mcp/../examples/555-blinker.json" });
    assert.ok(!nested.error, nested.error?.message);
    const body = JSON.parse(nested.result.content[0].text);
    assert.ok(Array.isArray(body.issues));
  } finally {
    close();
  }
});

test("MCP tools reject absolute, `..`, and symlink escapes without writing outside", async () => {
  const outside = mkdtempSync(join(tmpdir(), "crumb-mcp-out-"));
  const inside = mkdtempSync(join(repoRoot, ".mcp-test-"));
  const victim = join(outside, "package.json");
  const original = `{"token":"${SECRET}"}\n`;
  writeFileSync(victim, original);
  const escapeLink = join(inside, "escape.json");
  symlinkSync(victim, escapeLink);

  const { rpc, callTool, close } = startServer();
  try {
    await rpc("initialize", {});

    for (const tool of PATH_TOOLS) {
      for (const attack of [
        { label: "absolute", path: victim },
        { label: "dotdot", path: join("examples", "..", "..", "etc", "passwd") },
        { label: "symlink", path: escapeLink },
      ]) {
        const msg = await callTool(tool.name, { ...tool.args, path: attack.path });
        assertGenericPathError(msg);
      }
    }

    const created = join(outside, "planted.json");
    const plant = await callTool("set_project", {
      path: created,
      project: { version: 1, name: "pwn", board: "half", parts: [], wires: [] },
    });
    assertGenericPathError(plant);
    assert.equal(readFileSync(victim, "utf8"), original);
    assert.equal(existsSync(created), false);
  } finally {
    close();
    rmSync(outside, { recursive: true, force: true });
    rmSync(inside, { recursive: true, force: true });
  }
});

test("MCP write tools can create a new JSON file inside the repo", async () => {
  const inside = mkdtempSync(join(repoRoot, ".mcp-test-"));
  const dest = join(inside, "fresh.json");
  const { rpc, callTool, close } = startServer();
  try {
    await rpc("initialize", {});
    const saved = await callTool("set_project", {
      path: dest,
      project: { version: 1, name: "fresh", board: "mini", parts: [], wires: [] },
    });
    assert.ok(!saved.error, saved.error?.message);
    const read = await callTool("get_board", { path: dest });
    assert.ok(!read.error, read.error?.message);
    assert.match(read.result.content[0].text, /"fresh"/);
    const relative = await callTool("list_nets", { path: dest.replace(repoRoot + "/", "") });
    assert.ok(!relative.error, relative.error?.message);
  } finally {
    close();
    rmSync(inside, { recursive: true, force: true });
  }
});

test("non-JSON project files return a generic error with no file snippet", async () => {
  const inside = mkdtempSync(join(repoRoot, ".mcp-test-"));
  const junk = join(inside, "not-json.txt");
  writeFileSync(junk, `${SECRET} this is not json at all\n`);

  const { rpc, callTool, close } = startServer();
  try {
    await rpc("initialize", {});
    for (const name of ["get_board", "validate", "list_nets"]) {
      const msg = await callTool(name, { path: junk });
      assertGenericParseError(msg);
    }
  } finally {
    close();
    rmSync(inside, { recursive: true, force: true });
  }
});
