import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const budget = 150 * 1024;
const html = readFileSync("dist/index.html", "utf8");
const match = html.match(/src="([^"]+\.js)"/);
if (!match) {
  console.error("dist/index.html has no script src");
  process.exit(1);
}

const rel = match[1].replace(/^\//, "");
const bytes = gzipSync(readFileSync(join("dist", rel))).length;
console.log(`${rel} gzip ${bytes} bytes (budget ${budget})`);
if (bytes > budget) {
  console.error(`main JS gzip exceeds 150 KiB (${bytes} > ${budget})`);
  process.exit(1);
}

if (!html.includes("SoftwareApplication")) {
  console.error("dist/index.html is missing SoftwareApplication markup");
  process.exit(1);
}

for (const page of ["examples/index.html", "how-it-works/index.html"]) {
  const built = readFileSync(join("dist", page), "utf8");
  if (/<script/i.test(built)) {
    console.error(`${page} contains a script`);
    process.exit(1);
  }
  if (!built.includes('rel="canonical"')) {
    console.error(`${page} is missing a canonical link`);
    process.exit(1);
  }
  console.log(`${page} static page ok`);
}

const robots = readFileSync("dist/robots.txt", "utf8");
if (!robots.includes("Sitemap: https://crumb.janglim.cloud/sitemap.xml")) {
  console.error("dist/robots.txt does not name the sitemap");
  process.exit(1);
}
const sitemap = readFileSync("dist/sitemap.xml", "utf8");
for (const loc of [
  "https://crumb.janglim.cloud/",
  "https://crumb.janglim.cloud/examples/",
  "https://crumb.janglim.cloud/how-it-works/",
]) {
  if (!sitemap.includes(loc)) {
    console.error(`dist/sitemap.xml is missing ${loc}`);
    process.exit(1);
  }
}
