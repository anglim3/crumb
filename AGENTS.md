# Crumb — agent notes

You are laying out a **solderless breadboard**, not a schematic and not a PCB. A human will copy the holes. Prefer boring, buildable placements.

## Setup

- Runtime: Node 22+
- Web editor: `npm install` then `npm run dev` (Vite, port 5173)
- MCP: `node --experimental-strip-types mcp/server.mjs` with `cwd` = repo root (no install)
- Default file: `examples/555-blinker.json`
- Render check: `node --experimental-strip-types scripts/crumb-svg.mjs <file.json> out.svg`
- Tests: `npm test`

## Workflow

1. `list_parts` if you do not know the `def` id
2. `set_project` or `place_part` + `add_wire`
3. `validate` after every batch
4. Fix errors before you stop. Warnings about unused holes are fine; **shorts are not**

Do not invent catalog ids. If it is not in `list_parts`, pick the closest part or an off-board `module`.

## Geometry (do not violate)

- Terminal holes: `{row}-{col}` with `col` in `a`–`j`. Example: `10-e`
- Rails: `LP-12` left +, `LM-12` left −, `RP` / `RM` on the right
- Part pins: `{id}.{number}` or `{id}.{LABEL}` (`u1.8`, `u1.VCC`, `m1.5v`)
- Module pins: any `kind: "module"` catalog part (`uno`, `barrel-jack`, `nema17`, …). Wire `m1.<pinId|label>` (`m1.5v`, `m1.pos`, `m2.M1A`) to a hole or DIP pin. Pads sit beside the board — they are not terminal strips.
- `a`–`e` on a row = one net. `f`–`j` on a row = another net. Gutter isolates them
- `half` and `full` boards split each rail at mid-board. A jumper is required to join the two halves
- DIP `anchor` is **pin 1 on the left strip** (`a`–`e`). The chip spans the gutter
- Pico is 40 pins → needs 20 free rows. Mini board is only 17 rows — use `half` or `full`
- 3-pin parts need `from`, `mid`, `to`. 4-pin parts also need `legs: [hole]`
- Modules sit off the board. Every module def uses the same `m1.pin` jumpers; do not treat header pins as breadboard columns

## Electrical checks `validate` already runs

- Two parts occupying the same hole
- + and − rails shorted together
- A part’s VCC and GND (or VIN / 3V3 and GND) on the same net
- Both leads of a resistor / LED / similar on the same strip

Intentional ties (555 TRIG to THRES) are not shorts. A 1k from VCC to GND on one strip **is**.

## Style

- Power: red `#c45c4a` to `LP` / `RP`. Ground: black `#2b2b2b` to `LM` / `RM`
- Give resistors a `value`
- Leave one empty row between unrelated blocks when the board has room
- Prefer named pins (`u1.VCC`) over raw numbers in wires
- `esp32` is the 30-pin DevKit, pin 1 = 3V3. Do not use it for a 38-pin DevKitC
- `nano-esp32` is the Arduino Nano ESP32 (ABX00083). Pin 1 is D12 at the USB end — seat pin 1 in column f (`dipMirror`). Digital silk is on the f strip (D12…D2, GND, RESET, D0/RX0, D1/TX0); analog is on e (D13, 3V3, B0, A0…A7, VUSB, B1, GND, VIN). Do not use `nano` for that board.

## Files that matter

| Path | Why |
| --- | --- |
| `src/lib/crumb/types.ts` | JSON shape |
| `src/lib/crumb/catalog.ts` | Parts |
| `src/lib/crumb/validate.ts` / `shorts.ts` | Checks |
| `src/components/crumb/` | Web editor |
| `src/main.tsx` | Vite entry |
| `mcp/server.mjs` | Tool adapter |
| `mcp/catalog.json` | MCP copy of the catalog — regenerate if you edit `catalog.ts` |
| `examples/` | Known-good boards |

Change the core under `src/lib/crumb` first. Keep MCP thin.
