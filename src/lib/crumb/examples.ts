import type { Project } from "./types";

export const EMPTY_PROJECT: Project = {
  version: 1,
  name: "Untitled",
  board: "half",
  parts: [],
  wires: [],
};

/** 555 astable LED blinker on a half board. */
export const EXAMPLE_555: Project = {
  version: 1,
  name: "555 blinker",
  board: "half",
  parts: [
    { kind: "dip", id: "u1", def: "ne555", anchor: "10-e" },
    { kind: "leaded", id: "r1", def: "resistor", from: "10-c", to: "8-c", value: "1k" },
    { kind: "leaded", id: "r2", def: "resistor", from: "11-j", to: "12-j", value: "10k" },
    { kind: "leaded", id: "c1", def: "ceramic-cap", from: "12-i", to: "14-i", value: "10µF" },
    { kind: "leaded", id: "rled", def: "resistor", from: "12-a", to: "15-a", value: "330Ω" },
    { kind: "leaded", id: "d1", def: "led", from: "15-c", to: "17-c" },
  ],
  wires: [
    { id: "w1", from: "u1.8", to: "LP-10", color: "#c45c4a" },
    { id: "w2", from: "u1.1", to: "LM-10", color: "#2b2b2b" },
    { id: "w3", from: "u1.4", to: "u1.8", color: "#c45c4a" },
    { id: "w4", from: "8-c", to: "LP-8", color: "#c45c4a" },
    { id: "w5", from: "10-c", to: "11-g", color: "#3d6b8a" },
    { id: "w6", from: "u1.2", to: "u1.6", color: "#c9a227" },
    { id: "w7", from: "14-i", to: "LM-14", color: "#2b2b2b" },
    { id: "w8", from: "u1.3", to: "12-a", color: "#3f7a4e" },
    { id: "w9", from: "17-c", to: "LM-17", color: "#2b2b2b" },
    { id: "w10", from: "u1.5", to: "13-h", color: "#6b5c8a" },
    { id: "w11", from: "13-h", to: "LM-13", color: "#2b2b2b" },
  ],
};

export const EXAMPLE_DHT: Project = {
  version: 1,
  name: "Uno + DHT22",
  board: "half",
  parts: [
    { kind: "module", id: "m1", def: "uno", slot: 1, offsetRow: 4 },
    { kind: "leaded", id: "s1", def: "dht22", from: "20-j", to: "23-j" },
    { kind: "leaded", id: "rp", def: "resistor", from: "20-f", to: "21-f", value: "10k" },
  ],
  wires: [
    { id: "w1", from: "20-j", to: "RP-20", color: "#c45c4a" },
    { id: "w2", from: "23-j", to: "RM-23", color: "#2b2b2b" },
    { id: "w3", from: "21-j", to: "16-j", color: "#3d6b8a" },
    { id: "w4", from: "RP-5", to: "20-f", color: "#c45c4a" },
    { id: "w5", from: "RM-5", to: "RM-23", color: "#2b2b2b" },
  ],
};

export const EXAMPLES: Project[] = [EXAMPLE_555, EXAMPLE_DHT];
