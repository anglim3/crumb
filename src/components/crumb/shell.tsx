import { BOARD_SPECS } from "@/lib/crumb/board";
import { EXAMPLE_NOTES, EXAMPLES } from "@/lib/crumb/examples";
import type { Project } from "@/lib/crumb/types";

export const HINT_KEY = "crumb.hint.dismissed.v1";

/** True when the visitor has dismissed the first-run hint. Storage failures count as not dismissed. */
export function hintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberHintDismissed(): void {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* private mode or blocked storage — the hint still hides for this visit */
  }
}

export function FirstRunHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-surface px-4 py-2 text-sm print:hidden"
      role="status"
    >
      <p>This layout stays in this browser. Press ? for hole addresses, wiring, and shortcuts.</p>
      <button type="button" className="h-10 shrink-0 rounded-md bg-bg px-3 text-sm" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export function EmptyBoard({ onLoadExample, onStartFresh }: { onLoadExample: () => void; onStartFresh: () => void }) {
  return (
    <div className="absolute inset-3 z-20 flex items-center justify-center print:hidden">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg p-5 shadow-lg">
        <p className="font-display text-lg leading-tight">Empty board</p>
        <p className="mt-2 text-sm text-muted">
          Load an example to copy a known-good layout, or start with a blank board and place parts from the list.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="h-10 rounded-md bg-accent px-3 text-sm text-accent-fg"
            onClick={onLoadExample}
          >
            Load an example
          </button>
          <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={onStartFresh}>
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExampleGallery({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4 print:hidden" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="example-gallery-title"
        className="mt-14 max-h-[min(80vh,40rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-bg p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <p id="example-gallery-title" className="font-display text-lg leading-none">
            Examples
          </p>
          <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
        <ul className="mt-3 flex flex-col gap-1" aria-label="Example layouts">
          {EXAMPLES.map((project) => (
            <li key={project.name}>
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-md bg-surface px-3 py-2 text-left hover:bg-surface-hover"
                onClick={() => onPick(project.name)}
              >
                <span className="text-sm">{project.name}</span>
                <span className="text-xs text-muted">{EXAMPLE_NOTES[project.name] ?? "Example layout"}</span>
                <ExampleMeta project={project} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ExampleMeta({ project }: { project: Project }) {
  return (
    <span className="font-mono text-xs text-muted">
      {BOARD_SPECS[project.board].label} · {project.parts.length} parts · {project.wires.length} wires
    </span>
  );
}

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4 print:hidden" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="mt-14 max-h-[min(80vh,40rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-bg p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <p id="help-title" className="font-display text-lg leading-none">
            How the board works
          </p>
          <button type="button" className="h-10 rounded-md bg-surface px-3 text-sm" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
        <section className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Shortcuts</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Kbd>?</Kbd> open this panel
            </li>
            <li>
              <Kbd>Esc</Kbd> cancel the current tool, or close this panel
            </li>
            <li>
              <Kbd>Ctrl</Kbd> <Kbd>Z</Kbd> undo · <Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd> <Kbd>Z</Kbd> or <Kbd>Ctrl</Kbd>{" "}
              <Kbd>Y</Kbd> redo
            </li>
            <li>
              <Kbd>Ctrl</Kbd> <Kbd>S</Kbd> save into this browser
            </li>
            <li>
              <Kbd>Delete</Kbd> remove the selected part or wire
            </li>
            <li>
              <Kbd>W</Kbd> wire tool · <Kbd>D</Kbd> duplicate the selected part
            </li>
          </ul>
          <p className="mt-2 text-sm text-muted">
            On a Mac, use Command instead of Ctrl. Tab to the parts list. Enter on a catalog part starts placement.
            Enter on a part under “On the board” selects it; Delete removes it.
          </p>
        </section>
        <section className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Holes and addresses</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <span className="font-mono">10-e</span> is row 10, column e.
            </li>
            <li>
              Columns a–e on a row are one strip. Columns f–j are another. The gutter between e and f keeps them apart.
            </li>
            <li>
              <span className="font-mono">LP-12</span> / <span className="font-mono">LM-12</span> are the left + and −
              rails. <span className="font-mono">RP</span> / <span className="font-mono">RM</span> are the right rails.
            </li>
            <li>
              Half and full boards split each rail at the middle. Jumper the two halves if they need to be one net.
            </li>
            <li>
              <span className="font-mono">u1.VCC</span> is a pin on a placed part.{" "}
              <span className="font-mono">m1.pos</span> is a pin on an off-board module.
            </li>
            <li>
              DIP pin 1 sits on column e (column f for the Nano ESP32). <span className="font-mono">nano</span> and{" "}
              <span className="font-mono">nano-esp32</span> are different pinouts.
            </li>
          </ul>
        </section>
        <section className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Wiring</p>
          <p className="mt-2 text-sm">
            Choose Wire, click a start hole, then click the end hole. A second click on the same hole cancels that
            start. Power jumpers are red, ground jumpers are black. Hover a hole to light its net. A short glows when +
            meets −, a part’s supply pins share a net, or both leads of a part sit on one strip.
          </p>
        </section>
        <section className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Zoom and touch</p>
          <p className="mt-2 text-sm">
            The scroll wheel and a trackpad pinch zoom the board. Drag empty space, or use two fingers, to pan. The +
            and − buttons step the zoom; the percent button fits the board again. Drag a part while Select is active to
            move it by rows. Touch drags follow the part, not the page.
          </p>
        </section>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-border bg-surface px-1 font-mono text-xs">{children}</kbd>;
}

export function AppFooter() {
  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted print:hidden">
      <p className="basis-full">
        Vibe-coded: built mostly by prompting an AI and reviewing the output.{" "}
        <a
          className="hover:text-fg hover:underline"
          href="https://github.com/anglim3/crumb/blob/main/README.md#how-this-was-made"
          target="_blank"
          rel="noreferrer"
        >
          How this was made
        </a>
      </p>
      <a
        className="hover:text-fg hover:underline"
        href="https://github.com/anglim3/crumb"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
      <a
        className="hover:text-fg hover:underline"
        href="https://github.com/anglim3/crumb/issues"
        target="_blank"
        rel="noreferrer"
      >
        Issues
      </a>
      <a
        className="hover:text-fg hover:underline"
        href="https://github.com/anglim3/crumb/blob/main/LICENSE"
        target="_blank"
        rel="noreferrer"
      >
        MIT License
      </a>
    </footer>
  );
}
