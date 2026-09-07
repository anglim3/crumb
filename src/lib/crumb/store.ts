import { create } from "zustand";
import { getPart } from "./catalog.ts";
import { EMPTY_PROJECT, EXAMPLE_555, EXAMPLES } from "./examples.ts";
import { holeId, parseHole } from "./holes.ts";
import {
  emptyLibrary,
  type LibraryFile,
  migrateSession,
  parseLibrary,
  removeLibrary,
  upsertLibrary,
} from "./library.ts";
import { addWire, leadHoles, parseProject, placeDip, placeLeadedHoles, placeModule, removePart, removeWire, setBoard, updatePart, movePart } from "./mutate.ts";
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
  library: LibraryFile;
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
  setName: (name: string) => void;
  duplicateSelected: () => void;
  moveSelected: (dRow: number) => void;
  hydrateLibrary: (raw: unknown, session: Project | null) => void;
  saveProject: () => void;
  openLibraryEntry: (id: string) => void;
  openExample: (name: string) => void;
  newProject: () => void;
  deleteLibraryEntry: (id: string) => void;
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
  if (def.pins.length >= 4) return 4;
  if (def.pins.length === 3) return 3;
  return 2;
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
    library: emptyLibrary(),
    setProject: (project) => commit(project, { selected: null, wireFrom: null, placeClicks: [] }),
    setTool: (tool) => set({ tool, wireFrom: tool === "wire" ? get().wireFrom : null, placeClicks: [] }),
    setPendingDef: (pendingDef) => set({ pendingDef, tool: pendingDef ? "place" : get().tool, placeClicks: [] }),
    setWireColor: (wireColor) => set({ wireColor }),
    setSelected: (selected) => set({ selected }),
    setHoverHole: (hoverHole) => set({ hoverHole }),
    setHighlightNet: (highlightNet) => set({ highlightNet }),
    setJsonOpen: (jsonOpen) => set({ jsonOpen }),
    changeBoard: (size) => commit(setBoard(get().project, size)),
    cancelPending: () => set({ tool: "select", pendingDef: null, wireFrom: null, placeClicks: [], selected: null }),
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
        commit(placeLeadedHoles(s.project, s.pendingDef, clicks), {
          placeClicks: [],
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
      try {
        const project = parseProject(JSON.parse(raw));
        commit(project, { selected: null, jsonOpen: false });
      } catch {
        /* ignore bad files */
      }
    },
    setName: (name) => {
      const s = get();
      if (s.project.name === name) return;
      commit({ ...s.project, name });
    },
    duplicateSelected: () => {
      const s = get();
      const part = s.project.parts.find((p) => p.id === s.selected);
      if (!part) return;
      const bump = (hole: string, by: number) => {
        const parsed = parseHole(hole);
        if (!parsed) return hole;
        return holeId({ ...parsed, row: parsed.row + by });
      };
      if (part.kind === "dip") {
        commit(placeDip(s.project, part.def, bump(part.anchor, 2)));
        return;
      }
      if (part.kind === "leaded") {
        commit(placeLeadedHoles(s.project, part.def, leadHoles(part).map((h) => bump(h, 2)), part.value));
        return;
      }
      commit(placeModule(s.project, part.def, part.slot, part.offsetRow + 5));
    },
    moveSelected: (dRow) => {
      const s = get();
      if (!s.selected || !dRow) return;
      if (!s.project.parts.some((p) => p.id === s.selected)) return;
      commit(movePart(s.project, s.selected, dRow));
    },
    hydrateLibrary: (raw, session) => {
      const file = migrateSession(parseLibrary(raw), session);
      const active = file.entries.find((e) => e.id === file.activeId);
      if (active) {
        set({
          library: file,
          project: structuredClone(active.project),
          past: [],
          future: [],
          selected: null,
          wireFrom: null,
          placeClicks: [],
        });
        return;
      }
      set({ library: file });
    },
    saveProject: () => {
      const s = get();
      set({ library: upsertLibrary(s.library, s.project, s.library.activeId) });
    },
    openLibraryEntry: (id) => {
      const s = get();
      const entry = s.library.entries.find((e) => e.id === id);
      if (!entry) return;
      commit(structuredClone(entry.project), {
        library: { ...s.library, activeId: id },
        selected: null,
        wireFrom: null,
        placeClicks: [],
      });
    },
    openExample: (name) => {
      const next = EXAMPLES.find((ex) => ex.name === name);
      if (!next) return;
      commit(structuredClone(next), {
        library: { ...get().library, activeId: null },
        selected: null,
        wireFrom: null,
        placeClicks: [],
      });
    },
    newProject: () => {
      commit({ ...EMPTY_PROJECT, name: "Untitled" }, {
        library: { ...get().library, activeId: null },
        selected: null,
        wireFrom: null,
        placeClicks: [],
      });
    },
    deleteLibraryEntry: (id) => {
      const s = get();
      const library = removeLibrary(s.library, id);
      if (s.library.activeId === id) {
        commit({ ...EMPTY_PROJECT, name: "Untitled" }, {
          library,
          selected: null,
          wireFrom: null,
          placeClicks: [],
        });
        return;
      }
      set({ library });
    },
  };
});
