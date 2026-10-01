import { BOARD_SPECS } from "@/lib/crumb/board";
import { CLASS_LABEL, CLASS_ORDER, getPart, searchParts } from "@/lib/crumb/catalog";
import { EXAMPLES } from "@/lib/crumb/examples";
import { applyBoot, libraryAutosave, PROJECT_KEY } from "@/lib/crumb/boot";
import { LIBRARY_KEY } from "@/lib/crumb/library";
import { encodeShare } from "@/lib/crumb/mutate";
import { downloadPng, downloadText, renderProjectSvg } from "@/lib/crumb/render-svg";
import { buildSteps } from "@/lib/crumb/steps";
import { useCrumb, WIRE_COLORS } from "@/lib/crumb/store";
import type { BoardSize, PartDef, Project } from "@/lib/crumb/types";
import { computeNets } from "@/lib/crumb/nets";
import { detectShorts } from "@/lib/crumb/shorts";
import { validateProject } from "@/lib/crumb/validate";
import { cn } from "@/lib/utils";
import { BoardView } from "./board-view";
import { Cable, Check, FolderOpen, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function Workspace() {
  const project = useCrumb((s) => s.project);
  const library = useCrumb((s) => s.library);
  const tool = useCrumb((s) => s.tool);
  const pendingDef = useCrumb((s) => s.pendingDef);
  const wireFrom = useCrumb((s) => s.wireFrom);
  const placeClicks = useCrumb((s) => s.placeClicks);
  const deleteSelected = useCrumb((s) => s.deleteSelected);
  const cancelPending = useCrumb((s) => s.cancelPending);
  const undo = useCrumb((s) => s.undo);
  const redo = useCrumb((s) => s.redo);
  const issues = useMemo(() => validateProject(project), [project]);
  const shorts = useMemo(() => detectShorts(project), [project]);
  const steps = useMemo(() => buildSteps(project), [project]);
  const [hydrated, setHydrated] = useState(false);
  const holdLibrary = useCrumb((s) => s.holdLibrary);

  useEffect(() => {
    let projectRaw: string | null = null;
    let libraryRaw: string | null = null;
    try {
      projectRaw = localStorage.getItem(PROJECT_KEY);
      libraryRaw = localStorage.getItem(LIBRARY_KEY);
    } catch {
      /* ignore */
    }
    try {
      applyBoot(window.location.hash, { projectRaw, libraryRaw });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
      const libraryJson = libraryAutosave(library, project, holdLibrary);
      if (libraryJson != null) localStorage.setItem(LIBRARY_KEY, libraryJson);
    } catch {
      /* ignore */
    }
  }, [project, library, hydrated, holdLibrary]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") cancelPending();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        useCrumb.getState().saveProject();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "w") useCrumb.getState().setTool("wire");
      if (e.key === "d") useCrumb.getState().duplicateSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelPending, deleteSelected, undo, redo]);
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg lg:h-dvh lg:overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 max-h-[42vh] overflow-y-auto border-t border-border print:hidden lg:order-1 lg:max-h-none lg:min-h-0 lg:w-72 lg:border-r lg:border-t-0">
          <PartsPane />
        </aside>
        <main className="order-1 flex min-h-[48vh] flex-1 flex-col lg:order-2 lg:min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 text-xs text-muted">
            <p>
              {tool === "place" && pendingDef
                ? `Placing ${getPart(pendingDef)?.name ?? pendingDef}${
                    placeClicks.length
                      ? ` — ${placeClicks.length + 1}/${getPart(pendingDef)?.pins.length ?? 2}`
                      : getPart(pendingDef)?.dipPins
                        ? ": click pin-1 hole"
                        : ": click each lead hole"
                  }`
                : tool === "wire"
                  ? wireFrom
                    ? `Wire from ${wireFrom} — click the other hole`
                    : "Click a start hole, then an end hole"
                  : "Hover a hole to see its net. Click to select."}
            </p>
            <p className="font-mono tabular-nums">
              {shorts.length > 0 ? (
                <span className="text-bad">{shorts.length} short{shorts.length === 1 ? "" : "s"}</span>
              ) : (
                <>
                  {project.parts.length} parts · {project.wires.length} wires
                </>
              )}
            </p>
          </div>
          <div className="min-h-0 flex-1 px-3 pb-3 lg:h-0">
            <BoardView />
          </div>
        </main>
        <aside className="order-3 max-h-[40vh] overflow-y-auto border-t border-border print:hidden lg:max-h-none lg:min-h-0 lg:w-80 lg:border-l lg:border-t-0">
          <Inspector issues={issues} steps={steps} shorts={shorts} />
        </aside>
      </div>
    </div>
  );
}

function Header() {
  const project = useCrumb((s) => s.project);
  const setProject = useCrumb((s) => s.setProject);
  const changeBoard = useCrumb((s) => s.changeBoard);
  const tool = useCrumb((s) => s.tool);
  const setTool = useCrumb((s) => s.setTool);
  const jsonOpen = useCrumb((s) => s.jsonOpen);
  const setJsonOpen = useCrumb((s) => s.setJsonOpen);
  const deleteSelected = useCrumb((s) => s.deleteSelected);
  const undo = useCrumb((s) => s.undo);
  const redo = useCrumb((s) => s.redo);
  const past = useCrumb((s) => s.past);
  const future = useCrumb((s) => s.future);
  const setName = useCrumb((s) => s.setName);
  const duplicateSelected = useCrumb((s) => s.duplicateSelected);
  const loadJson = useCrumb((s) => s.loadJson);
  const library = useCrumb((s) => s.library);
  const saveProject = useCrumb((s) => s.saveProject);
  const openLibraryEntry = useCrumb((s) => s.openLibraryEntry);
  const openExample = useCrumb((s) => s.openExample);
  const newProject = useCrumb((s) => s.newProject);
  const deleteLibraryEntry = useCrumb((s) => s.deleteLibraryEntry);
  const exampleMatch = EXAMPLES.find((e) => e.name === project.name && !library.activeId);
  const pickerValue = library.activeId ? `user:${library.activeId}` : exampleMatch ? `ex:${exampleMatch.name}` : "draft";

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 print:hidden">
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-none tracking-tight">Crumb</p>
        <input
          className="mt-1 h-8 w-full max-w-56 rounded-md border border-border bg-surface px-2 text-xs text-fg"
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Project name"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        Board
        <select
          className="h-10 rounded-md border border-border bg-surface px-2 text-fg"
          value={project.board}
          onChange={(e) => changeBoard(e.target.value as BoardSize)}
        >
          {(Object.keys(BOARD_SPECS) as BoardSize[]).map((size) => (
            <option key={size} value={size}>
              {BOARD_SPECS[size].label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-muted">
        Project
        <select
          className="h-10 max-w-52 rounded-md border border-border bg-surface px-2 text-fg"
          value={pickerValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "draft") return;
            if (value.startsWith("ex:")) openExample(value.slice(3));
            if (value.startsWith("user:")) openLibraryEntry(value.slice(5));
          }}
        >
          <option value="draft">{library.activeId ? "—" : project.name || "Untitled draft"}</option>
          <optgroup label="Examples">
            {EXAMPLES.map((ex) => (
              <option key={ex.name} value={`ex:${ex.name}`}>
                {ex.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="My projects">
            {library.entries.length === 0 && (
              <option value="draft" disabled>
                None saved yet
              </option>
            )}
            {library.entries.map((entry) => (
              <option key={entry.id} value={`user:${entry.id}`}>
                {entry.project.name || entry.id}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={saveProject} title="Save to this browser">
        <span className="inline-flex items-center gap-1.5">
          <Save className="size-3.5" />
          Save
        </span>
      </button>
      {library.activeId && (
        <button
          type="button"
          className="h-10 rounded-md bg-surface px-3 text-sm"
          title="Delete saved project"
          onClick={() => deleteLibraryEntry(library.activeId!)}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm disabled:opacity-40" onClick={undo} disabled={!past.length}>
          <span className="inline-flex items-center gap-1.5">
            <Undo2 className="size-3.5" />
            Undo
          </span>
        </button>
        <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm disabled:opacity-40" onClick={redo} disabled={!future.length}>
          <span className="inline-flex items-center gap-1.5">
            <Redo2 className="size-3.5" />
            Redo
          </span>
        </button>
        <button
          type="button"
          className={cn("h-10 rounded-md px-3 text-sm", tool === "select" ? "bg-accent text-accent-fg" : "bg-surface")}
          onClick={() => setTool("select")}
        >
          Select
        </button>
        <button
          type="button"
          className={cn("h-10 rounded-md px-3 text-sm", tool === "wire" ? "bg-accent text-accent-fg" : "bg-surface")}
          onClick={() => setTool("wire")}
        >
          <span className="inline-flex items-center gap-1.5">
            <Cable className="size-3.5" />
            Wire
          </span>
        </button>
        <details className="relative">
          <summary className="h-10 list-none rounded-md bg-surface px-3 text-sm cursor-pointer inline-flex items-center">
            More
          </summary>
          <div className="absolute right-0 z-20 mt-1 flex w-44 flex-col gap-1 rounded-md border border-border bg-bg p-2">
            <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={duplicateSelected}>
              Duplicate
            </button>
            <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={deleteSelected}>
              Delete
            </button>
            <label className="h-10 rounded-md bg-surface px-3 text-sm inline-flex items-center gap-1.5 cursor-pointer">
              <FolderOpen className="size-3.5" />
              Open
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  file.text().then((text) => loadJson(text)).catch(() => undefined);
                  e.target.value = "";
                }}
              />
            </label>
            <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={newProject}>
              New
            </button>
            <button type="button" className={cn("h-10 rounded-md px-3 text-sm", jsonOpen ? "bg-accent text-accent-fg" : "bg-surface")} onClick={() => setJsonOpen(!jsonOpen)}>
              JSON
            </button>
            <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={() => downloadText(`${project.name.replace(/\s+/g, "-").toLowerCase()}.json`, JSON.stringify(project, null, 2), "application/json")}>
              .json
            </button>
            <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={() => downloadText(`${project.name.replace(/\s+/g, "-").toLowerCase()}.svg`, renderProjectSvg(project), "image/svg+xml")}>
              SVG
            </button>
            <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={() => downloadPng(`${project.name.replace(/\s+/g, "-").toLowerCase()}.png`, project)}>
              PNG
            </button>
            <button
              type="button"
              className="h-10 rounded-md bg-surface px-3 text-sm"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#c=${encodeShare(project)}`;
                void navigator.clipboard.writeText(url);
              }}
            >
              Copy link
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}

function PartsPane() {
  const [q, setQ] = useState("");
  const [klass, setKlass] = useState<PartDef["class"] | "all">("dip");
  const pendingDef = useCrumb((s) => s.pendingDef);
  const setPendingDef = useCrumb((s) => s.setPendingDef);
  const wireColor = useCrumb((s) => s.wireColor);
  const setWireColor = useCrumb((s) => s.setWireColor);
  const parts = useMemo(() => {
    const found = searchParts(q);
    if (klass === "all") return found;
    return found.filter((p) => p.class === klass);
  }, [q, klass]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Parts</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search parts"
          className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "h-10 rounded-md px-3 text-sm",
              klass === "all" ? "bg-accent text-accent-fg" : "bg-surface",
            )}
            onClick={() => setKlass("all")}
          >
            All
          </button>
          {CLASS_ORDER.map((cls) => (
            <button
              key={cls}
              type="button"
              className={cn(
                "h-10 rounded-md px-3 text-sm",
                klass === cls ? "bg-accent text-accent-fg" : "bg-surface",
              )}
              onClick={() => setKlass(cls)}
            >
              {CLASS_LABEL[cls]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Wire color</p>
        <div className="flex flex-wrap gap-2">
          {WIRE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Wire ${c}`}
              className={cn("size-7 rounded-full border border-border", wireColor === c && "ring-2 ring-accent")}
              style={{ background: c }}
              onClick={() => setWireColor(c)}
            />
          ))}
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {parts.length === 0 && <li className="px-1 text-sm text-muted">No parts in this group</li>}
        {parts.map((part) => (
          <li key={part.id}>
            <button
              type="button"
              onClick={() => setPendingDef(part.id)}
              className={cn(
                "flex w-full flex-col items-start rounded-md px-3 py-2 text-left",
                pendingDef === part.id ? "bg-accent text-accent-fg" : "bg-surface hover:bg-surface-hover",
              )}
            >
              <span className="text-sm">{part.name}</span>
              <span className={cn("text-xs", pendingDef === part.id ? "text-accent-fg/80" : "text-muted")}>
                {CLASS_LABEL[part.class]} · {part.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Inspector({
  issues,
  steps,
  shorts,
}: {
  issues: ReturnType<typeof validateProject>;
  steps: ReturnType<typeof buildSteps>;
  shorts: ReturnType<typeof detectShorts>;
}) {
  const project = useCrumb((s) => s.project);
  const selected = useCrumb((s) => s.selected);
  const jsonOpen = useCrumb((s) => s.jsonOpen);
  const setProject = useCrumb((s) => s.setProject);
  const setHighlightNet = useCrumb((s) => s.setHighlightNet);
  const highlightNet = useCrumb((s) => s.highlightNet);
  const nets = useMemo(() => computeNets(project), [project]);
  const liveNets = nets.filter((n) => n.label || n.holes.length > 14);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [draft, setDraft] = useState("");
  const [jsonErr, setJsonErr] = useState<string | null>(null);
  const selectedPart = project.parts.find((p) => p.id === selected);
  const selectedDef = selectedPart ? getPart(selectedPart.def) : undefined;
  const updateSelected = useCrumb((s) => s.updateSelected);
  const patchSelected = useCrumb((s) => s.patchSelected);

  return (
    <div className="flex flex-col gap-6 p-4">
      {selectedPart && selectedDef && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Selected</p>
          <p className="mt-2 text-sm">
            {selectedPart.id} · {selectedDef.name}
          </p>
          {selectedPart.kind === "leaded" && (
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-xs text-muted">
                Value
                <input
                  className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={selectedPart.value ?? ""}
                  placeholder="1k"
                  onChange={(e) => patchSelected({ value: e.target.value })}
                  onBlur={() => updateSelected({ value: selectedPart.value })}
                />
              </label>
              <label className="text-xs text-muted">
                From
                <input
                  className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-fg"
                  value={selectedPart.from}
                  onChange={(e) => patchSelected({ from: e.target.value })}
                  onBlur={() => updateSelected({ from: selectedPart.from })}
                />
              </label>
              {selectedPart.mid !== undefined && (
                <label className="text-xs text-muted">
                  Mid
                  <input
                    className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-fg"
                    value={selectedPart.mid}
                    onChange={(e) => patchSelected({ mid: e.target.value })}
                    onBlur={() => updateSelected({ mid: selectedPart.mid })}
                  />
                </label>
              )}
              <label className="text-xs text-muted">
                To
                <input
                  className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-fg"
                  value={selectedPart.to}
                  onChange={(e) => patchSelected({ to: e.target.value })}
                  onBlur={() => updateSelected({ to: selectedPart.to })}
                />
              </label>
              <button
                type="button"
                className="h-10 rounded-md bg-surface px-3 text-sm"
                onClick={() => updateSelected({ from: selectedPart.to, to: selectedPart.from })}
              >
                Flip leads
              </button>
            </div>
          )}
          {selectedPart.kind === "dip" && (
            <label className="mt-3 block text-xs text-muted">
              Pin 1
              <input
                className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-fg"
                value={selectedPart.anchor}
                onChange={(e) => patchSelected({ anchor: e.target.value })}
                onBlur={() => updateSelected({ anchor: selectedPart.anchor })}
              />
            </label>
          )}
          <ul className="mt-2 font-mono text-xs text-muted">
            {selectedDef.pins.map((pin) => (
              <li key={pin.id}>
                {pin.number ?? pin.id} {pin.label}
                {pin.aliases?.length ? ` (${pin.aliases.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      {shorts.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-bad">Shorts</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-bad">
            {shorts.map((short, i) => (
              <li key={`${short.kind}-${i}`}>{short.message}</li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Checks</p>
        {issues.length === 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ok">
            <Check className="size-3.5" />
            Layout looks buildable
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {issues.map((issue, i) => (
              <li key={`${issue.code}-${i}`} className={issue.level === "error" ? "text-sm text-bad" : "text-sm text-warn"}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">BOM</p>
        <ul className="mt-2 font-mono text-xs text-muted">
          {Object.entries(
            project.parts.reduce<Record<string, number>>((acc, part) => {
              const def = getPart(part.def);
              const key = `${def?.name ?? part.def}${part.kind === "leaded" && part.value ? ` ${part.value}` : ""}`;
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([name, count]) => (
            <li key={name}>
              {count}× {name}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Nets</p>
        <ul className="mt-2 flex flex-col gap-1">
          {liveNets.slice(0, 12).map((net) => (
            <li key={net.id}>
              <button
                type="button"
                className={cn(
                  "h-10 w-full rounded-md px-3 text-left text-sm",
                  highlightNet === net.id ? "bg-accent text-accent-fg" : "bg-surface",
                )}
                onClick={() => setHighlightNet(highlightNet === net.id ? null : net.id)}
              >
                {net.label ?? net.id} · {net.holes.length} holes
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Build steps</p>
        <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm">
          {steps.map((step, i) => (
            <li key={`${step.title}-${i}`} className={done[i] ? "text-muted line-through" : ""}>
              <button type="button" className="text-left" onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}>
                <span className="font-medium">{step.title}</span>
                <p className="text-muted">{step.detail}</p>
              </button>
            </li>
          ))}
        </ol>
      </section>
      {jsonOpen && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Project file</p>
          <textarea
            className="mt-2 h-56 w-full rounded-md border border-border bg-surface p-3 font-mono text-xs text-fg"
            value={draft || JSON.stringify(project, null, 2)}
            onChange={(e) => {
              setDraft(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value) as Project;
                if (parsed.version !== 1 || !parsed.parts || !parsed.wires) throw new Error("Not a Crumb file");
                setProject(parsed);
                setJsonErr(null);
              } catch (err) {
                setJsonErr(err instanceof Error ? err.message : "Invalid JSON");
              }
            }}
          />
          {jsonErr && <p className="mt-1 text-xs text-bad">{jsonErr}</p>}
        </section>
      )}
      <p className="text-xs text-muted">MCP tools live in the repo as a local stdio server. Same JSON either way.</p>
    </div>
  );
}
