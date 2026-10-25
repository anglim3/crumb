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
