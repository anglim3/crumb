import attiny85Blink from "../../../examples/attiny85-blink.json" with { type: "json" };
import blinker from "../../../examples/555-blinker.json" with { type: "json" };
import buttonLed from "../../../examples/button-led.json" with { type: "json" };
import esp32Led from "../../../examples/esp32-led.json" with { type: "json" };
import homekitBlinds from "../../../examples/homekit-blinds.json" with { type: "json" };
import lm358Amplifier from "../../../examples/lm358-amplifier.json" with { type: "json" };
import picoButton from "../../../examples/pico-button.json" with { type: "json" };
import shiftLeds from "../../../examples/74hc595-leds.json" with { type: "json" };
import unoDht22 from "../../../examples/uno-dht22.json" with { type: "json" };
import { parseProject } from "./mutate.ts";
import type { Project } from "./types.ts";

export const EMPTY_PROJECT: Project = {
  version: 1,
  name: "Untitled",
  board: "half",
  parts: [],
  wires: [],
};

/** Shipped layouts. The JSON files in `examples/` are the source. */
export const EXAMPLE_555 = parseProject(blinker);
export const EXAMPLE_DHT = parseProject(unoDht22);
export const EXAMPLE_BUTTON = parseProject(buttonLed);
export const EXAMPLE_ESP32 = parseProject(esp32Led);
export const EXAMPLE_PICO = parseProject(picoButton);
export const EXAMPLE_HOMEKIT_BLINDS = parseProject(homekitBlinds);
export const EXAMPLE_LM358 = parseProject(lm358Amplifier);
export const EXAMPLE_595 = parseProject(shiftLeds);
export const EXAMPLE_ATTINY85 = parseProject(attiny85Blink);

export const EXAMPLES: Project[] = [
  EXAMPLE_555,
  EXAMPLE_BUTTON,
  EXAMPLE_LM358,
  EXAMPLE_595,
  EXAMPLE_ATTINY85,
  EXAMPLE_ESP32,
  EXAMPLE_PICO,
  EXAMPLE_DHT,
  EXAMPLE_HOMEKIT_BLINDS,
];

/** One-line gallery captions, keyed by project name. */
export const EXAMPLE_NOTES: Record<string, string> = {
  "555 blinker": "Astable NE555 flashing an LED",
  "Button LED": "Button, resistor, and LED on a mini board",
  "LM358 amplifier": "Single-supply non-inverting stage, gain about 2",
  "74HC595 LED chain": "Shift register with eight LEDs",
  "ATtiny85 blink": "Reset pull-up and an LED on PB0",
  "ESP32 LED": "30-pin ESP32 DevKit and an LED on IO2",
  "Pico button": "Pico with a pulled-up button",
  "Uno + DHT22": "Uno module and a DHT22",
  "HomeKit blinds": "Nano ESP32, TMC2208, NEMA 17, and a limit switch",
};
