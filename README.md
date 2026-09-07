# Crumb

Open-source breadboard layout maker and renderer. You describe a circuit in JSON (or let an agent do it through MCP). Crumb draws a real solderless board so a human can build it.

This repository is **private** until the public release.

## What it is

- Hole-addressed layouts (`10-e`, `LP-10` for left + rail)
- Catalog of DIPs, passives, switches, sensors, power, and off-board modules
- SVG board view with net highlight and a step list
- Local MCP server so an AI harness can place parts and wires
- MIT license

Not a SPICE simulator and not a PCB tool.

## Project file

```json
{
  "version": 1,
  "name": "555 blinker",
  "board": "half",
  "parts": [{ "kind": "dip", "id": "u1", "def": "ne555", "anchor": "10-e" }],
  "wires": [{ "id": "w1", "from": "u1.8", "to": "LP-10", "color": "#c45c4a" }]
}
```

Boards: `mini` (17 rows), `half` (30, split rails), `full` (63, split rails).

Holes:

- Terminal strip: `{row}-{col}` with cols `a`–`j`
- Rails: `LP-12` left +, `LM-12` left −, `RP` / `RM` on the right
- Part pins: `u1.8` or `u1.VCC`

`a–e` on a row are one net. `f–j` on a row are another. The gutter isolates them. Split rails break at mid-board.

## MCP

```json
{
  "mcpServers": {
    "crumb": {
      "command": "node",
      "args": ["mcp/server.mjs"]
    }
  }
}
```

Tools: `list_parts`, `get_board`, `set_project`, `place_part`, `add_wire`, `validate`.

## Web

The interactive editor lives in this workspace preview. Pick an example, place parts from the catalog, draw jumpers, inspect build steps, edit the JSON.

## Status

P0/P1: core model, SVG renderer, catalog slice, example 555, MCP adapter, web editor.
