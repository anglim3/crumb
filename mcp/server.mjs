#!/usr/bin/env node
/**
 * Minimal stdio MCP server for Crumb.
 * Protocol: JSON-RPC 2.0 over newline-delimited stdin/stdout.
 *
 * Tools operate on a project file path (default: ./examples/555-blinker.json).
 * The web app uses the same JSON shape.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultPath = resolve(root, "examples/555-blinker.json");

const TOOLS = [
  {
    name: "list_parts",
    description: "Search the Crumb parts catalog",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
    },
  },
  {
    name: "get_board",
    description: "Read the current project JSON",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
    },
  },
  {
    name: "set_project",
    description: "Overwrite the project file with a full Crumb JSON document",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        project: { type: "object" },
      },
      required: ["project"],
    },
  },
  {
    name: "place_part",
    description: "Place a DIP (anchor hole), leaded part (from/to), or module",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        def: { type: "string" },
        kind: { type: "string", enum: ["dip", "leaded", "module"] },
        id: { type: "string" },
        anchor: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        mid: { type: "string" },
        slot: { type: "number" },
        offsetRow: { type: "number" },
      },
      required: ["def", "kind"],
    },
  },
  {
    name: "add_wire",
    description: "Add a jumper between two endpoints (holes or part.pin)",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        color: { type: "string" },
        id: { type: "string" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "validate",
    description: "Return occupancy and rail-short issues for a project file",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
    },
  },
  {
    name: "remove_part",
    description: "Remove a part by id from the project file",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_nets",
    description: "List jumper endpoints in the project file",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
    },
  },
];

const CATALOG = JSON.parse(readFileSync(resolve(root, "mcp/catalog.json"), "utf8"));

function load(path = defaultPath) {
  const file = resolve(path);
  if (!existsSync(file)) {
    return { version: 1, name: "Untitled", board: "half", parts: [], wires: [] };
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function save(project, path = defaultPath) {
  writeFileSync(resolve(path), JSON.stringify(project, null, 2) + "\n");
}

function handleTool(name, args = {}) {
  const path = args.path || defaultPath;
  if (name === "list_parts") {
    const q = String(args.query || "").toLowerCase();
    return CATALOG.filter(
      (p) =>
        !q ||
        p.id.includes(q) ||
        String(p.name).toLowerCase().includes(q) ||
        String(p.class).includes(q) ||
        String(p.description).toLowerCase().includes(q),
    );
  }
  if (name === "get_board") return load(path);
  if (name === "set_project") {
    save(args.project, path);
    return { ok: true, path };
  }
  if (name === "place_part") {
    const project = load(path);
    const id = args.id || `${args.kind[0]}${project.parts.length + 1}`;
    if (args.kind === "dip") {
      project.parts.push({ kind: "dip", id, def: args.def, anchor: args.anchor });
    } else if (args.kind === "leaded") {
      project.parts.push({
        kind: "leaded",
        id,
        def: args.def,
        from: args.from,
        to: args.to,
        mid: args.mid,
        value: args.value,
      });
    } else {
      project.parts.push({
        kind: "module",
        id,
        def: args.def,
        slot: args.slot ?? 1,
        offsetRow: args.offsetRow ?? 3,
      });
    }
    save(project, path);
    return project;
  }
  if (name === "add_wire") {
    const project = load(path);
    const id = args.id || `w${project.wires.length + 1}`;
    project.wires.push({ id, from: args.from, to: args.to, color: args.color || "#c45c4a" });
    save(project, path);
    return project;
  }
  if (name === "validate") {
    const project = load(path);
    const issues = [];
    const used = new Map();
    for (const part of project.parts) {
      if (part.kind === "leaded") {
        for (const h of [part.from, part.to]) {
          const list = used.get(h) || [];
          list.push(part.id);
          used.set(h, list);
        }
      }
    }
    for (const [hole, owners] of used) {
      if (owners.length > 1) issues.push({ level: "error", message: `${hole} used by ${owners.join(", ")}` });
    }
    return { issues };
  }
  if (name === "remove_part") {
    const project = load(path);
    project.parts = project.parts.filter((p) => p.id !== args.id);
    save(project, path);
    return project;
  }
  if (name === "list_nets") {
    const project = load(path);
    return project.wires.map((w) => ({ id: w.id, from: w.from, to: w.to }));
  }
  throw new Error(`Unknown tool ${name}`);
}

function reply(id, result, error) {
  const msg = error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result };
  process.stdout.write(JSON.stringify(msg) + "\n");
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const { id, method, params } = msg;
    try {
      if (method === "initialize") {
        reply(id, {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "crumb", version: "0.1.0" },
          capabilities: { tools: {} },
        });
      } else if (method === "tools/list") {
        reply(id, { tools: TOOLS });
      } else if (method === "tools/call") {
        const result = handleTool(params.name, params.arguments || {});
        reply(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } else if (method === "notifications/initialized" || method === "initialized") {
        /* no-op */
      } else {
        reply(id, null, { code: -32601, message: `Unknown method ${method}` });
      }
    } catch (err) {
      reply(id, null, { code: -32000, message: String(err) });
    }
  }
});
