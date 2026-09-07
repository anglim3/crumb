import { create } from "zustand";
import { getPart } from "./catalog.ts";
import { EXAMPLE_555 } from "./examples.ts";
import { holeId, parseHole } from "./holes.ts";
import { addWire, parseProject, placeDip, placeLeaded, placeModule, removePart, removeWire, setBoard, updatePart } from "./mutate.ts";
import type { BoardSize, PlacedPart, Project } from "./types.ts";

export type Tool = "select" | "place" | "wire";

export type CrumbState = {
  project: Project;
  past: Project[];
  future: Project[];
  tool: Tool;
  pendingDef: string | null;
  placeClicks: string[];
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
  updateSelected: (patch: Partial<PlacedPart>) => void;
  patchSelected: (patch: Partial<PlacedPart>) => void;
  undo: () => void;
  redo: () => void;
  loadJson: (raw: string) => void;
};

export const WIRE_COLORS = ["#c45c4a", "#2b2b2b", "#3d6b8a", "#3f7a4e", "#c9a227", "#8a5a2b", "#6b5c8a", "#d8d2c8"];

function snapDipAnchor(hole: string): string {
  const parsed = parseHole(hole);
  if (!parsed) return hole;
  if (parsed.kind === "rail") return `${parsed.row}-e`;
  return holeId({ kind: "terminal", row: parsed.row, col: "e" });
}

function leadCount(defId: string): number {
  const def = getPart(defId);
  if (!def || def.dipPins || def.class === "module") return 2;
  return def.pins.length === 3 ? 3 : 2;
}

export const useCrumb = create<CrumbState>((set, get) => {
  const commit = (project: Project, extra: Partial<CrumbState> = {}) => {
    const s = get();
    set({
      past: [...s.past.slice(-49), s.project],
      future: [],
      project,
      ...extra,
    });
  };

  return {
    project: EXAMPLE_555,
    past: [],
    future: [],
    tool: "select",
    pendingDef: null,
    placeClicks: [],
    wireFrom: null,
    wireColor: WIRE_COLORS[0],
    selected: null,
    hoverHole: null,
    highlightNet: null,
    jsonOpen: false,
    setProject: (project) => commit(project, { selected: null, wireFrom: null, placeClicks: [] }),
    setTool: (tool) => set({ tool, wireFrom: tool === "wire" ? get().wireFrom : null, placeClicks: [] }),
    setPendingDef: (pendingDef) => set({ pendingDef, tool: pendingDef ? "place" : get().tool, placeClicks: [] }),
    setWireColor: (wireColor) => set({ wireColor }),
    setSelected: (selected) => set({ selected }),
    setHoverHole: (hoverHole) => set({ hoverHole }),
    setHighlightNet: (highlightNet) => set({ highlightNet }),
    setJsonOpen: (jsonOpen) => set({ jsonOpen }),
    changeBoard: (size) => commit(setBoard(get().project, size)),
    cancelPending: () => set({ tool: "select", pendingDef: null, wireFrom: null, placeClicks: [] }),
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
        commit(addWire(s.project, s.wireFrom, hole, s.wireColor), { wireFrom: null });
        return;
      }
      if (s.tool === "place" && s.pendingDef) {
        const def = getPart(s.pendingDef);
        if (def?.class === "module" || (def?.class === "power" && !def.defaultSpan)) {
          const modules = s.project.parts.filter((p) => p.kind === "module").length;
          commit(placeModule(s.project, s.pendingDef, 1, 3 + modules * 5), {
            tool: "select",
            pendingDef: null,
            placeClicks: [],
          });
          return;
        }
        if (def?.class === "dip" || def?.dipPins) {
          commit(placeDip(s.project, s.pendingDef, snapDipAnchor(hole)), {
            tool: "select",
            pendingDef: null,
            placeClicks: [],
          });
          return;
        }
        const need = leadCount(s.pendingDef);
        const clicks = [...s.placeClicks, hole];
        if (clicks.length < need) {
          set({ placeClicks: clicks, wireFrom: hole });
          return;
        }
        commit(
          placeLeaded(s.project, s.pendingDef, clicks[0], clicks[clicks.length - 1], undefined, undefined, clicks[1] && need === 3 ? clicks[1] : undefined),
          { placeClicks: [], wireFrom: null, tool: "select", pendingDef: null },
        );
        return;
      }
      set({ selected: hole });
    },
    deleteSelected: () => {
      const s = get();
      if (!s.selected) return;
      if (s.project.parts.some((p) => p.id === s.selected)) {
        commit(removePart(s.project, s.selected), { selected: null });
        return;
      }
      if (s.project.wires.some((w) => w.id === s.selected)) {
        commit(removeWire(s.project, s.selected), { selected: null });
      }
    },
    updateSelected: (patch) => {
      const s = get();
      if (!s.selected) return;
      if (!s.project.parts.some((p) => p.id === s.selected)) return;
      commit(updatePart(s.project, s.selected, patch));
    },
    patchSelected: (patch) => {
      const s = get();
      if (!s.selected) return;
      set({ project: updatePart(s.project, s.selected, patch) });
    },
    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      set({
        project: prev,
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future],
        selected: null,
        wireFrom: null,
        placeClicks: [],
      });
    },
    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      set({
        project: next,
        future: s.future.slice(1),
        past: [...s.past, s.project],
        selected: null,
      });
    },
    loadJson: (raw) => {
      const project = parseProject(JSON.parse(raw));
      commit(project, { selected: null, jsonOpen: false });
    },
  };
});
