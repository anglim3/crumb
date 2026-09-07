# Crumb

Open-source breadboard layout maker and renderer. You describe a circuit in JSON (or let an agent do it through MCP). Crumb draws a real solderless board so a human can build it.

This repository is **private** until the public release. MIT licensed.

Not a SPICE simulator and not a PCB tool.

## Features

- Hole-addressed layouts (`10-e`, `LP-10` for left + rail)
- Catalog: DIP chips, ESP32 / Pico / Nano on the board, Uno / Pi / Mega off-board, passives, switches, sensors, power
- SVG editor with net highlight, short detection, zoom, drag-to-move, undo
- Build steps, BOM, clickable module pins, 2–4 lead parts
- Export JSON / SVG / PNG, open a file, copy a share link
- Local MCP server using the same validator as the web app

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
- Off-board module pins: `m1.5v`

`a–e` on a row are one net. `f–j` on a row are another. The gutter isolates them. Split rails break at mid-board.

Leaded parts may include `mid` and `legs` for 3- and 4-pin devices.

## Pinout notes

The `esp32` catalog part is a **30-pin** ESP32-WROOM DevKit, pin 1 = 3V3 at the USB end. 38-pin DevKitC boards do not match that map — place them as an off-board module and jumper by silk label.

## MCP

```json
{
  "mcpServers": {
    "crumb": {
      "command": "node",
      "args": ["--experimental-strip-types", "mcp/server.mjs"]
    }
  }
}
```

Tools: `list_parts`, `get_board`, `set_project`, `place_part`, `add_wire`, `remove_part`, `list_nets`, `validate`.

`validate` returns the same occupancy / rail / supply / lead-short issues as the editor.

## CLI

```bash
node --experimental-strip-types scripts/crumb-svg.mjs examples/555-blinker.json blinker.svg
```

## Web

Pick an example, place parts, draw jumpers, drag a part to another row, export. The layout autosaves in the browser. A `#c=...` hash loads a shared project.
