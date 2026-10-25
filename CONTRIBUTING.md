# Contributing

Thanks for helping with Crumb. The editor, the checks, and the local MCP server share one model under `src/lib/crumb`. Change that core first. Keep the MCP adapter thin.

## Setup

Node.js 22 or newer.

```bash
npm ci
npm run dev
```

The editor listens on [http://localhost:5173](http://localhost:5173). Set `CRUMB_DEV_HOST` if you need another interface.

```bash
npm test
npm run lint
npm run build
```

MCP does not need `npm install`. Run it with the working directory set to the repository root:

```bash
node --experimental-strip-types mcp/server.mjs
```

The SVG CLI is the same idea:

```bash
node --experimental-strip-types scripts/crumb-svg.mjs examples/555-blinker.json out.svg
```

## Layout files

A board is JSON: `version`, `name`, `board`, `parts`, `wires`. Hole addresses look like `10-e`, `LP-12`, `u1.VCC`, and `m1.pos`.

Do not invent catalog ids. If a part is not in the catalog, use the closest part or an off-board module. When you add a part, keep [`mcp/catalog.json`](mcp/catalog.json) in sync with [`src/lib/crumb/catalog.ts`](src/lib/crumb/catalog.ts).

`a`–`e` on a row is one strip. `f`–`j` is another. The gutter isolates them. Half and full boards split each rail at mid-board, so a jumper is required to join the halves.

DIP pin 1 sits on the left strip (`a`–`e`) unless that catalog entry sets `dipMirror`. Pico needs 20 free rows, so it does not fit a mini board.

The full placement notes are in [AGENTS.md](AGENTS.md).

## Checks

`validate` already flags two parts in one hole, power and ground rails tied together, a part's supply and ground on the same net, and both leads of a resistor or LED on the same strip. Fix those before you stop. Warnings about unused holes are fine.

Power jumpers use `#c45c4a`. Ground jumpers use `#2b2b2b`. Give resistors a value.

## Pull requests

Open a pull request against `main`. Say what changed and how you checked it. `npm test` and `npm run lint` should pass.

Report security problems privately. See [SECURITY.md](SECURITY.md). Community expectations are in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
