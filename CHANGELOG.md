# Changelog

## 0.1.0

First public release of the breadboard editor.

### Features

- Browser editor for solderless layouts: place parts, draw jumpers, undo, and highlight nets
- Hole addresses a person can follow (`10-e`, `LP-12`, `u1.VCC`, `m1.pos`)
- Occupancy and short checks, build steps, and a bill of materials
- JSON, SVG, and PNG export, plus share links that leave saved projects alone until you save
- A local MCP server and an SVG command-line renderer that use the same checks
- Catalog of DIP parts, development boards, passives, switches, sensors, and off-board modules
- Unknown addresses show a not-found view, with a link back to the editor, while the host still serves the single-page shell

### Security

- MCP project paths stay inside the repository root, and parse errors do not echo file contents (#13)
- The dev server binds to localhost unless asked otherwise, Vite is pinned past the file-disclosure fixes, and a lockfile is committed (#14, #15)
- Secret-shaped files (`.env`, `.pem`, `.npmrc`) are gitignored (#15)
- Opening a share link no longer overwrites the saved library (#16)
- Vite 7.3.7, Wrangler 4.152.0, and an undici 7.30.1 override clear the high dependency advisories in this tree
- The hosted editor sends a Content-Security-Policy, `nosniff`, `no-referrer`, a minimal Permissions-Policy, and HSTS
- Editor fonts are served with the app
