import { create } from "zustand";
import { EXAMPLE_555 } from "./examples";
import { addWire, placeDip, placeLeaded, placeModule, removePart, removeWire, setBoard } from "./mutate";
import type { BoardSize, Project } from "./types";

export type Tool = "select" | "place" | "wire";

export type CrumbState = {
  project: Project;
  tool: Tool;
  pendingDef: string | null;
  wireFrom: string | null;
  wireColor: string;
  selected: string | null;
  hoverHole: string | null;
  highlightNet: string | null;
  jsonOpen: boolean;
  setProject: (project: Project) => void;
  setTool: (tool: Tool) => void;
  setPendingDef: (id: string | null) => void;
  setWireColor: (color: string) => void;
  setSelected: (id: string | null) => void;
  setHoverHole: (id: string | null) => void;
  setHighlightNet: (id: string | null) => void;
  setJsonOpen: (open: boolean) => void;
  changeBoard: (size: BoardSize) => void;
  clickHole: (hole: string) => void;
  deleteSelected: () => void;
};

export const WIRE_COLORS = ["#c45c4a", "#2b2b2b", "#3d6b8a", "#3f7a4e", "#c9a227", "#8a5a2b", "#6b5c8a", "#d8d2c8"];

const MODULES = new Set(["hcsr04", "9v-snap", "barrel-jack", "uno", "pico"]);
const DIPS = new Set(["ne555", "lm358", "74hc595", "atmega328p", "nano"]);

export const useCrumb = create<CrumbState>((set, get) => ({
  project: EXAMPLE_555,
  tool: "select",
  pendingDef: null,
  wireFrom: null,
  wireColor: WIRE_COLORS[0],
  selected: null,
  hoverHole: null,
  highlightNet: null,
  jsonOpen: false,
  setProject: (project) => set({ project, selected: null, wireFrom: null }),
  setTool: (tool) => set({ tool, wireFrom: tool === "wire" ? get().wireFrom : null }),
  setPendingDef: (pendingDef) => set({ pendingDef, tool: pendingDef ? "place" : get().tool }),
  setWireColor: (wireColor) => set({ wireColor }),
  setSelected: (selected) => set({ selected }),
  setHoverHole: (hoverHole) => set({ hoverHole }),
  setHighlightNet: (highlightNet) => set({ highlightNet }),
  setJsonOpen: (jsonOpen) => set({ jsonOpen }),
  changeBoard: (size) => set({ project: setBoard(get().project, size) }),
  clickHole: (hole) => {
    const s = get();
    if (s.tool === "wire") {
      if (!s.wireFrom) {
        set({ wireFrom: hole, selected: hole });
        return;
      }
      if (s.wireFrom === hole) {
        set({ wireFrom: null });
        return;
      }
      set({
        project: addWire(s.project, s.wireFrom, hole, s.wireColor),
        wireFrom: null,
      });
      return;
    }
    if (s.tool === "place" && s.pendingDef) {
      const defId = s.pendingDef;
      if (MODULES.has(defId)) {
        set({
          project: placeModule(s.project, defId, 1, 3),
          tool: "select",
          pendingDef: null,
        });
        return;
      }
      if (DIPS.has(defId)) {
        set({
          project: placeDip(s.project, defId, hole),
          tool: "select",
          pendingDef: null,
        });
        return;
      }
      if (!s.wireFrom) {
        set({ wireFrom: hole });
        return;
      }
      set({
        project: placeLeaded(s.project, defId, s.wireFrom, hole),
        wireFrom: null,
        tool: "select",
        pendingDef: null,
      });
      return;
    }
    set({ selected: hole });
  },
  deleteSelected: () => {
    const s = get();
    if (!s.selected) return;
    if (s.project.parts.some((p) => p.id === s.selected)) {
      set({ project: removePart(s.project, s.selected), selected: null });
      return;
    }
    if (s.project.wires.some((w) => w.id === s.selected)) {
      set({ project: removeWire(s.project, s.selected), selected: null });
    }
  },
}));
