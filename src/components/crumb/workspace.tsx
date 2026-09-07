import { BOARD_SPECS } from "@/lib/crumb/board";
import { CLASS_LABEL, getPart, searchParts } from "@/lib/crumb/catalog";
import { EMPTY_PROJECT, EXAMPLES } from "@/lib/crumb/examples";
import { downloadText, renderProjectSvg } from "@/lib/crumb/render-svg";
import { buildSteps } from "@/lib/crumb/steps";
import { useCrumb, WIRE_COLORS } from "@/lib/crumb/store";
import type { BoardSize, PartDef, Project } from "@/lib/crumb/types";
import { detectShorts } from "@/lib/crumb/shorts";
import { validateProject } from "@/lib/crumb/validate";
import { cn } from "@/lib/utils";
import { BoardView } from "./board-view";
import { Cable, Check, Download, FileJson, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function Workspace() {
  const project = useCrumb((s) => s.project);
  const tool = useCrumb((s) => s.tool);
  const pendingDef = useCrumb((s) => s.pendingDef);
  const wireFrom = useCrumb((s) => s.wireFrom);
  const deleteSelected = useCrumb((s) => s.deleteSelected);
  const cancelPending = useCrumb((s) => s.cancelPending);
  const issues = useMemo(() => validateProject(project), [project]);
  const shorts = useMemo(() => detectShorts(project), [project]);
  const steps = useMemo(() => buildSteps(project), [project]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") cancelPending();
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "w") useCrumb.getState().setTool("wire");
      if (e.key === "v") useCrumb.getState().setTool("select");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelPending, deleteSelected]);
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 max-h-[42vh] overflow-y-auto border-t border-border lg:order-1 lg:max-h-none lg:w-72 lg:border-r lg:border-t-0">
          <PartsPane />
        </aside>
        <main className="order-1 min-h-[48vh] flex-1 lg:order-2">
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-muted">
            <p>
              {tool === "place" && pendingDef
                ? `Placing ${getPart(pendingDef)?.name ?? pendingDef}: click pin-1 hole, or two holes for a leaded part`
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
          <div className="h-[min(70vh,720px)] px-3 pb-3">
            <BoardView />
          </div>
        </main>
        <aside className="order-3 max-h-[40vh] overflow-y-auto border-t border-border lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
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

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl leading-none tracking-tight">Crumb</p>
        <p className="mt-1 text-xs text-muted">Breadboard layouts you can actually build</p>
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
        Example
        <select
          className="h-10 rounded-md border border-border bg-surface px-2 text-fg"
          value={EXAMPLES.find((e) => e.name === project.name)?.name ?? ""}
          onChange={(e) => {
            const next = EXAMPLES.find((ex) => ex.name === e.target.value);
            if (next) setProject(structuredClone(next));
          }}
        >
          <option value="">Custom</option>
          {EXAMPLES.map((ex) => (
            <option key={ex.name} value={ex.name}>
              {ex.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
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
        <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={deleteSelected}>
          <span className="inline-flex items-center gap-1.5">
            <Trash2 className="size-3.5" />
            Delete
          </span>
        </button>
        <button
          type="button"
          className="h-10 rounded-md bg-surface px-3 text-sm"
          onClick={() => setProject({ ...EMPTY_PROJECT, name: "Untitled" })}
        >
          New
        </button>
        <button
          type="button"
          className={cn("h-10 rounded-md px-3 text-sm", jsonOpen ? "bg-accent text-accent-fg" : "bg-surface")}
          onClick={() => setJsonOpen(!jsonOpen)}
        >
          <span className="inline-flex items-center gap-1.5">
            <FileJson className="size-3.5" />
            JSON
          </span>
        </button>
        <button
          type="button"
          className="h-10 rounded-md bg-surface px-3 text-sm"
          onClick={() => downloadText(`${project.name.replace(/\s+/g, "-").toLowerCase()}.json`, JSON.stringify(project, null, 2), "application/json")}
        >
          <span className="inline-flex items-center gap-1.5">
            <Download className="size-3.5" />
            .json
          </span>
        </button>
        <button
          type="button"
          className="h-10 rounded-md bg-surface px-3 text-sm"
          onClick={() => downloadText(`${project.name.replace(/\s+/g, "-").toLowerCase()}.svg`, renderProjectSvg(project), "image/svg+xml")}
        >
          SVG
        </button>
      </div>
    </header>
  );
}

function PartsPane() {
  const [q, setQ] = useState("");
  const pendingDef = useCrumb((s) => s.pendingDef);
  const setPendingDef = useCrumb((s) => s.setPendingDef);
  const wireColor = useCrumb((s) => s.wireColor);
  const setWireColor = useCrumb((s) => s.setWireColor);
  const parts = searchParts(q);
  const groups = groupParts(parts);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Catalog</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search parts"
          className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
        />
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
      {Object.entries(groups).map(([cls, list]) => (
        <div key={cls}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {CLASS_LABEL[cls as PartDef["class"]] ?? cls}
          </p>
          <ul className="flex flex-col gap-1">
            {list.map((part) => (
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
                    {part.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupParts(parts: PartDef[]): Record<string, PartDef[]> {
  const out: Record<string, PartDef[]> = {};
  for (const p of parts) {
    out[p.class] ??= [];
    out[p.class].push(p);
  }
  return out;
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
  const [draft, setDraft] = useState("");
  const [jsonErr, setJsonErr] = useState<string | null>(null);
  const selectedPart = project.parts.find((p) => p.id === selected);
  const selectedDef = selectedPart ? getPart(selectedPart.def) : undefined;

  return (
    <div className="flex flex-col gap-6 p-4">
      {selectedPart && selectedDef && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Selected</p>
          <p className="mt-2 text-sm">
            {selectedPart.id} · {selectedDef.name}
          </p>
          <ul className="mt-2 font-mono text-xs text-muted">
            {selectedDef.pins.map((pin) => (
              <li key={pin.id}>
                {pin.number ?? pin.id} {pin.label}
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
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Build steps</p>
        <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm">
          {steps.map((step, i) => (
            <li key={`${step.title}-${i}`}>
              <span className="font-medium">{step.title}</span>
              <p className="text-muted">{step.detail}</p>
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
