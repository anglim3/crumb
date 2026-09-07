#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { renderProjectSvg } from "../src/lib/crumb/render-svg.ts";
import { parseProject } from "../src/lib/crumb/mutate.ts";

const input = process.argv[2];
const output = process.argv[3] || "board.svg";
if (!input) {
  console.error("usage: node --experimental-strip-types scripts/crumb-svg.mjs <project.json> [out.svg]");
  process.exit(1);
}
const project = parseProject(JSON.parse(readFileSync(input, "utf8")));
writeFileSync(output, renderProjectSvg(project));
console.log(output);
