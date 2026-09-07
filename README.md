# Crumb

Breadboard layouts a person can actually build. You write JSON (or an agent writes it through MCP). Crumb draws a solderless board, checks shorts, and lists build steps.

MIT. The repo is private until public release.

Not SPICE. Not a PCB tool.

## Requirements

- [Node.js](https://nodejs.org/) 22 or newer (`--experimental-strip-types`)
- No `npm install` for MCP or the SVG CLI — they run off the TypeScript sources

## Quick start

```bash
git clone https://github.com/anglim3/crumb.git
cd crumb
node --experimental-strip-types scripts/crumb-svg.mjs examples/555-blinker.json blinker.svg
```

Open `blinker.svg`. That is the same geometry the editor uses.

Examples: `examples/555-blinker.json`, `examples/homekit-blinds.json`, plus the named circuits in `src/lib/crumb/examples.ts` (button LED, Uno + DHT22, ESP32 LED, Pico button, HomeKit blinds).

The blinds bench feeds **12 V into RP / RM**. The barrel jack is a visual module only — do not jumper `m1.pos` / `m1.neg` (module endpoints do not resolve). LP is 3V3 from the Nano ESP32. Use `nano-esp32`, not `nano`.

## MCP (for an AI harness)

Point the harness at this repo root as `cwd`.

Claude Desktop / Cursor / similar:

```json
{
  "mcpServers": {
    "crumb": {
      "command": "node",
      "args": ["--experimental-strip-types", "mcp/server.mjs"],
      "cwd": "/absolute/path/to/crumb"
    }
  }
}
```

Default project file: `examples/555-blinker.json`. Pass `path` on any tool to use another file.

| Tool | What it does |
| --- | --- |
| `list_parts` | Search the catalog (`query` optional) |
| `get_board` | Read the project JSON |
| `set_project` | Replace the whole document |
| `place_part` | DIP (`anchor`), leaded (`from` / `to` / `mid` / `legs`), module (`slot`, `offsetRow`) |
| `add_wire` | Jumper between holes or `part.pin` |
| `remove_part` | Drop a part by `id` |
| `list_nets` | List jumper endpoints |
| `validate` | Occupancy + rail / supply / lead shorts |

Agent playbook is in [AGENTS.md](AGENTS.md). Read that before placing parts.

## Layout rules

Boards: `mini` (17 rows), `half` (30, split rails), `full` (63, split rails).

| Address | Meaning |
| --- | --- |
| `10-e` | Row 10, column e |
| `LP-10` / `LM-10` | Left + / − rail at row 10 |
| `RP-10` / `RM-10` | Right + / − rail |
| `u1.8` or `u1.VCC` | Pin on a placed part |
| `m1.5v` | Pin on an off-board module |

Columns `a`–`e` on a row are one strip. `f`–`j` are another. The gutter isolates them. Split rails break at mid-board.

DIP pin 1 sits on the left strip (`a`–`e`). The body crosses the gutter. Pin 1 of `esp32` is 3V3 at the USB end of a **30-pin** DevKit. 38-pin DevKitC boards are modules, not that DIP.

Leaded parts: two holes (`from` / `to`), three (`mid`), or four (`legs`).

## Project file

```json
{
  "version": 1,
  "name": "555 blinker",
  "board": "half",
  "parts": [
    { "kind": "dip", "id": "u1", "def": "ne555", "anchor": "10-e" },
    { "kind": "leaded", "id": "r1", "def": "resistor", "from": "LP-11", "to": "11-j", "value": "1k" }
  ],
  "wires": [{ "id": "w1", "from": "u1.8", "to": "LP-10", "color": "#c45c4a" }]
}
```

Catalog ids live in `src/lib/crumb/catalog.ts` and `mcp/catalog.json` (keep those in sync if you add parts).

## Tests

```bash
node --experimental-strip-types --test src/lib/crumb/crumb.test.ts
```

## What this repo is

Core model, validator, SVG renderer, examples, and the MCP server. The interactive browser editor is the same JSON and the same `src/lib/crumb` code.
