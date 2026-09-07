import type { Project } from "./types.ts";

export const EMPTY_PROJECT: Project = {
  version: 1,
  name: "Untitled",
  board: "half",
  parts: [],
  wires: [],
};

/**
 * 555 astable LED blinker.
 * u1 pin 1 at 10-e: 1 GND, 2 TRIG, 3 OUT, 4 RESET / 5 CTRL, 6 THRES, 7 DISCH, 8 VCC
 */
export const EXAMPLE_555: Project = {
  version: 1,
  name: "555 blinker",
  board: "half",
  parts: [
    { kind: "dip", id: "u1", def: "ne555", anchor: "10-e" },
    { kind: "leaded", id: "r1", def: "resistor", from: "LP-11", to: "11-j", value: "1k" },
    { kind: "leaded", id: "r2", def: "resistor", from: "11-i", to: "12-i", value: "10k" },
    { kind: "leaded", id: "c1", def: "ceramic-cap", from: "12-j", to: "14-j", value: "10µF" },
    { kind: "leaded", id: "rled", def: "resistor", from: "12-a", to: "15-a", value: "330Ω" },
    { kind: "leaded", id: "d1", def: "led", from: "15-c", to: "17-c" },
  ],
  wires: [
    { id: "w1", from: "u1.8", to: "LP-10", color: "#c45c4a" },
    { id: "w2", from: "u1.1", to: "LM-10", color: "#2b2b2b" },
    { id: "w3", from: "u1.4", to: "LP-13", color: "#c45c4a" },
    { id: "w4", from: "u1.7", to: "11-j", color: "#3d6b8a" },
    { id: "w5", from: "u1.6", to: "12-i", color: "#c9a227" },
    { id: "w6", from: "u1.2", to: "12-g", color: "#c9a227" },
    { id: "w7", from: "14-j", to: "LM-14", color: "#2b2b2b" },
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
    { kind: "leaded", id: "s1", def: "dht22", from: "20-j", to: "23-j", mid: "21-j", legs: ["22-j"] },
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

export const EXAMPLE_BUTTON: Project = {
  version: 1,
  name: "Button LED",
  board: "mini",
  parts: [
    { kind: "leaded", id: "sw1", def: "button", from: "5-a", to: "8-a" },
    { kind: "leaded", id: "r1", def: "resistor", from: "8-c", to: "11-c", value: "330Ω" },
    { kind: "leaded", id: "d1", def: "led", from: "11-e", to: "13-e" },
  ],
  wires: [
    { id: "w1", from: "5-a", to: "LP-5", color: "#c45c4a" },
    { id: "w2", from: "13-e", to: "LM-13", color: "#2b2b2b" },
  ],
};

export const EXAMPLE_ESP32: Project = {
  version: 1,
  name: "ESP32 LED",
  board: "half",
  parts: [
    { kind: "dip", id: "u1", def: "esp32", anchor: "5-e" },
    { kind: "leaded", id: "r1", def: "resistor", from: "18-j", to: "20-j", value: "330Ω" },
    { kind: "leaded", id: "d1", def: "led", from: "20-h", to: "22-h" },
  ],
  wires: [
    { id: "w1", from: "u1.VIN", to: "LP-5", color: "#c45c4a" },
    { id: "w2", from: "u1.GND", to: "LM-18", color: "#2b2b2b" },
    { id: "w3", from: "u1.IO2", to: "18-j", color: "#3f7a4e" },
    { id: "w4", from: "22-h", to: "RM-22", color: "#2b2b2b" },
  ],
};

export const EXAMPLE_PICO: Project = {
  version: 1,
  name: "Pico button",
  board: "half",
  parts: [
    { kind: "dip", id: "u1", def: "pico", anchor: "5-e" },
    { kind: "leaded", id: "sw1", def: "button", from: "26-a", to: "28-a" },
    { kind: "leaded", id: "r1", def: "resistor", from: "26-c", to: "24-c", value: "10k" },
  ],
  wires: [
    { id: "w1", from: "u1.3V3", to: "LP-8", color: "#c45c4a" },
    { id: "w2", from: "u1.GND", to: "LM-8", color: "#2b2b2b" },
    { id: "w3", from: "5-a", to: "26-a", color: "#3d6b8a" },
    { id: "w4", from: "28-a", to: "LM-28", color: "#2b2b2b" },
    { id: "w5", from: "24-c", to: "LP-24", color: "#c45c4a" },
  ],
};

export const EXAMPLES: Project[] = [EXAMPLE_555, EXAMPLE_DHT, EXAMPLE_BUTTON, EXAMPLE_ESP32, EXAMPLE_PICO];

