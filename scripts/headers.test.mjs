import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const headersPath = join(root, "public/_headers");
const publicDir = join(root, "public");

// Workers match _headers against the request URL, then apply every matching
// rule in file order. A repeated header is joined with a comma. `! Name`
// drops that header before a later value on the same rule is set.
// The SPA fallback serves /index.html for an unknown path, but the rules
// that match are the request path's rules. `/*` is what reaches /, /index.html,
// and those fallback documents. Static rules detach Cache-Control and set
// the plain revalidation value so it is not joined onto no-transform.
const HTML_CACHE = "public, max-age=0, must-revalidate, no-transform";
const STATIC_CACHE = "public, max-age=0, must-revalidate";

function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) {
      if (!current) throw new Error(`Header without a path: ${line}`);
      const body = line.trim();
      if (body.startsWith("!")) {
        const name = body.slice(1).trim();
        current.headers.push({ detach: true, name, value: "" });
        continue;
      }
      const split = body.indexOf(":");
      if (split === -1) throw new Error(`Header missing a colon: ${line}`);
      current.headers.push({
        detach: false,
        name: body.slice(0, split).trim(),
        value: body.slice(split + 1).trim(),
      });
      continue;
    }
    current = { pattern: line.trim(), headers: [] };
    rules.push(current);
  }
  return rules;
}

function patternToRegExp(pattern) {
  let source = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      source += "(.*)";
      continue;
    }
    if (ch === ":" && /[A-Za-z]/.test(pattern[i + 1] ?? "")) {
      const rest = pattern.slice(i + 1);
      const name = rest.match(/^\w*/)[0];
      source += "([^/]+)";
      i += name.length;
      continue;
    }
    source += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${source}$`);
}

function headersFor(rules, pathname) {
  const headers = new Map();
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(pathname)) continue;
    for (const header of rule.headers) {
      const key = header.name.toLowerCase();
      if (header.detach) {
        headers.delete(key);
        continue;
      }
      const prev = headers.get(key);
      headers.set(key, prev ? `${prev}, ${header.value}` : header.value);
    }
  }
  return headers;
}

function scriptSrc(csp) {
  const directive = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("script-src"));
  assert.ok(directive, "Content-Security-Policy is missing script-src");
  return directive;
}

const rules = parseHeaders(readFileSync(headersPath, "utf8"));

const htmlPaths = ["/", "/index.html", "/missing", "/editor", "/foo/bar"];
const assetPaths = [
  "/assets/index-t3FL5Q--.js",
  "/assets/index-Go1C4n3G.css",
  "/assets/fraunces-latin-500-normal-DnGCNyPD.woff2",
];
const publicFiles = readdirSync(publicDir).filter((name) => name !== "_headers");

test("HTML documents revalidate and opt out of edge rewriting", () => {
  for (const path of htmlPaths) {
    assert.equal(headersFor(rules, path).get("cache-control"), HTML_CACHE, path);
  }
});

test("static files revalidate once, without no-transform", () => {
  const paths = [...assetPaths, ...publicFiles.map((name) => `/${name}`)];
  for (const path of paths) {
    const cache = headersFor(rules, path).get("cache-control");
    assert.equal(cache, STATIC_CACHE, path);
    assert.equal(cache.includes("no-transform"), false, path);
  }
});

test("script-src stays same-origin", () => {
  const paths = [...htmlPaths, ...assetPaths, ...publicFiles.map((name) => `/${name}`)];
  for (const path of paths) {
    const csp = headersFor(rules, path).get("content-security-policy");
    assert.equal(scriptSrc(csp), "script-src 'self'");
    assert.equal(csp.toLowerCase().includes("cloudflareinsights"), false);
    assert.equal(/script-src[^;]*unsafe-inline/i.test(csp), false);
  }
});
