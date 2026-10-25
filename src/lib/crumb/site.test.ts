import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { EXAMPLE_NOTES, EXAMPLE_SLUGS } from "./examples.ts";

const root = new URL("../../../", import.meta.url);

function read(path: string): string {
  return readFileSync(new URL(path, root), "utf8");
}

test("the README states how the project was made, without naming a tool", () => {
  const readme = read("README.md");
  const start = readme.indexOf("## How this was made");
  const end = readme.indexOf("555-blinker.svg");
  assert.ok(start >= 0 && end > start);
  const section = readme.slice(start, end);
  assert.match(section, /vibe-coded/);
  assert.match(section, /prompting an AI and reviewing the output/);
  assert.match(section, /Tests, CI, a dependency audit, and a security review/);
  assert.match(section, /rough edges/);
  assert.match(section, /file an issue/);
  for (const banned of ["Claude", "Cursor", "ChatGPT", "OpenAI", "Anthropic", "Grok", "Copilot"]) {
    assert.equal(section.toLowerCase().includes(banned.toLowerCase()), false, banned);
  }
});

test("the editor footer links to that README section", () => {
  const shell = read("src/components/crumb/shell.tsx");
  assert.match(shell, /Vibe-coded: built mostly by prompting an AI and reviewing the output/);
  assert.match(shell, /README\.md#how-this-was-made/);
});

test("the editor page carries search text, a canonical link, and SoftwareApplication markup", () => {
  const html = read("index.html");
  assert.match(html, /<title>Crumb — breadboard layout tool<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/crumb\.janglim\.cloud\/"/);
  for (const phrase of ["breadboard layout tool", "online breadboard diagram maker", "breadboard simulator"]) {
    assert.ok(html.toLowerCase().includes(phrase), phrase);
  }
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(block);
  const data = JSON.parse(block[1]) as {
    "@type": string;
    url: string;
    applicationCategory: string;
    isAccessibleForFree: boolean;
    license: string;
    offers: { price: string; priceCurrency: string };
  };
  assert.equal(data["@type"], "SoftwareApplication");
  assert.equal(data.url, "https://crumb.janglim.cloud");
  assert.equal(data.applicationCategory, "WebApplication");
  assert.equal(data.isAccessibleForFree, true);
  assert.match(data.license, /MIT/);
  assert.equal(data.offers.price, "0");
  assert.equal(data.offers.priceCurrency, "USD");
});

test("robots.txt names the sitemap, and the sitemap lists the public pages", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /Sitemap: https:\/\/crumb\.janglim\.cloud\/sitemap\.xml/);
  const sitemap = read("public/sitemap.xml");
  for (const loc of [
    "https://crumb.janglim.cloud/",
    "https://crumb.janglim.cloud/examples/",
    "https://crumb.janglim.cloud/how-it-works/",
  ]) {
    assert.ok(sitemap.includes(`<loc>${loc}</loc>`), loc);
  }
});

test("the crawlable pages are static, styled, and link every example into the editor", () => {
  const examples = read("examples/index.html");
  const guide = read("how-it-works/index.html");
  for (const html of [examples, guide]) {
    assert.equal(/<script/i.test(html), false);
    assert.equal(/<style/i.test(html), false);
    assert.equal(/\son\w+=/i.test(html), false);
    assert.match(html, /href="\/src\/styles\.css"/);
    assert.match(html, /href="\/src\/fonts\.css"/);
    assert.match(html, /class="site-page"/);
  }
  assert.match(examples, /rel="canonical" href="https:\/\/crumb\.janglim\.cloud\/examples\/"/);
  assert.match(guide, /rel="canonical" href="https:\/\/crumb\.janglim\.cloud\/how-it-works\/"/);
  for (const heading of ["Placing parts", "Wiring", "Sharing a link", "Export"]) {
    assert.ok(guide.includes(heading), heading);
  }
  for (const [slug, name] of Object.entries(EXAMPLE_SLUGS)) {
    assert.ok(examples.includes(`href="/?example=${slug}"`), slug);
    assert.ok(examples.includes(name), name);
    assert.ok(examples.includes(EXAMPLE_NOTES[name]), EXAMPLE_NOTES[name]);
  }
});

test("Vite builds the gallery and the guide as extra entries", () => {
  const config = read("vite.config.ts");
  assert.match(config, /examples\/index\.html/);
  assert.match(config, /how-it-works\/index\.html/);
});
