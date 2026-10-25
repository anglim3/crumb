import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const headersPath = join(dirname(fileURLToPath(import.meta.url)), "../public/_headers");

// Workers joins a repeated header with a comma and drops a header marked `! Name`.
// `/*` is what reaches `/`, `/index.html`, and paths served by the SPA fallback.
const REVALIDATE = ["public", "max-age=0", "must-revalidate", "no-transform"];

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

function directives(value) {
  return value.split(",").map((part) => part.trim().toLowerCase());
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

test("HTML responses revalidate and opt out of edge rewriting", () => {
  for (const path of ["/", "/index.html", "/not-a-file"]) {
    const cache = headersFor(rules, path).get("cache-control");
    assert.equal(cache, REVALIDATE.join(", "), path);
  }
});

test("hashed assets keep a single cache policy and include no-transform", () => {
  const cache = headersFor(rules, "/assets/index-t3FL5Q--.js");
  const parts = directives(cache.get("cache-control"));
  assert.equal(parts.includes("no-transform"), true);
  const ages = parts.filter((part) => part.startsWith("max-age="));
  assert.equal(ages.length, 1);
  if (parts.includes("immutable")) {
    assert.notEqual(ages[0], "max-age=0");
  } else {
    assert.deepEqual(parts, REVALIDATE);
  }
});

test("script-src stays same-origin", () => {
  for (const path of ["/", "/index.html", "/not-a-file", "/assets/index-t3FL5Q--.js"]) {
    const csp = headersFor(rules, path).get("content-security-policy");
    assert.equal(scriptSrc(csp), "script-src 'self'");
    assert.equal(csp.toLowerCase().includes("cloudflareinsights"), false);
    assert.equal(/script-src[^;]*unsafe-inline/i.test(csp), false);
  }
});
