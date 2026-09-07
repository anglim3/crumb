import { create } from "zustand";
import { getPart } from "./catalog.ts";
import { EXAMPLE_555 } from "./examples.ts";
import { holeId, parseHole } from "./holes.ts";
import { addWire, placeDip, placeLeaded, placeModule, removePart, removeWire, setBoard } from "./mutate.ts";
import type { BoardSize, Project } from "./types.ts";

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
  cancelPending: () => void;
  clickHole: (hole: string) => void;
  deleteSelected: () => void;
};

export const WIRE_COLORS = ["#c45c4a", "#2b2b2b", "#3d6b8a", "#3f7a4e", "#c9a227", "#8a5a2b", "#6b5c8a", "#d8d2c8"];

function snapDipAnchor(hole: string): string {
  const parsed = parseHole(hole);
  if (!parsed) return hole;
  if (parsed.kind === "rail") return `${parsed.row}-e`;
  return holeId({ kind: "terminal", row: parsed.row, col: "e" });
}

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
  cancelPending: () => set({ tool: "select", pendingDef: null, wireFrom: null }),
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
      const def = getPart(s.pendingDef);
      if (def?.class === "module" || s.pendingDef === "9v-snap") {
        set({
          project: placeModule(s.project, s.pendingDef, 1, 3),
          tool: "select",
          pendingDef: null,
        });
        return;
      }
      if (def?.class === "dip" || def?.dipPins) {
        set({
          project: placeDip(s.project, s.pendingDef, snapDipAnchor(hole)),
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
        project: placeLeaded(s.project, s.pendingDef, s.wireFrom, hole),
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
