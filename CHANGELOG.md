# Changelog

## Unreleased

- “How this was made” in the README, and the same note in the editor footer
- Search titles, descriptions, and social text, plus SoftwareApplication markup and a sitemap
- Crawlable `/examples/` and `/how-it-works/` pages, built as extra Vite entries
- Gallery links that open each shipped layout in the editor
- Requests for `/examples` and `/how-it-works` without a trailing slash still reach those pages

### Security

- Hosted HTML, including paths served by the single-page fallback, sends `Cache-Control: public, max-age=0, must-revalidate, no-transform`, so the edge does not rewrite those documents. `/assets/*` and the other static files send `public, max-age=0, must-revalidate` without `no-transform`, so edge compression can apply. The Content-Security-Policy stays strict

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

### Editor polish

- Social metadata, icons, a web manifest, and an Open Graph image
- README photos of the editor, plus notes on limits and catalog sources
- First-run hint, empty-board prompt, and a help panel for shortcuts and hole addresses
- Share links compress with a `v2.` prefix and still open older base64 links
- Wheel, trackpad, and pinch zoom, with pan on touch
- Keyboard access for the parts list, labeled toolbar controls, and a glow that respects reduced motion
- Footer links to the repository, issues, and the license
- Examples live in `examples/*.json`, with a gallery and layouts for an LM358 amplifier, a 74HC595 LED chain, and an ATtiny85 blink
