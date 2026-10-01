import { upsertLibrary, type LibraryFile } from "./library.ts";
import { decodeShare, parseProject } from "./mutate.ts";
import { useCrumb } from "./store.ts";
import type { Project } from "./types.ts";

export const PROJECT_KEY = "crumb.project.v1";

export type StoredSnapshot = {
  projectRaw: string | null;
  libraryRaw: string | null;
};

export type BootPlan = {
  /** Parsed `crumb.library.v1` value, or null when nothing valid is stored. */
  libraryRaw: unknown;
  /**
   * Session project for a normal boot. Null for a share view so a leftover
   * session is not migrated into the library while the share is open.
   */
  session: Project | null;
  /** Original session JSON. Loaded when the library has no active entry. */
  sessionRaw: string | null;
  /** Shared document to show instead of the saved session. */
  share: Project | null;
  /** When true, autosave must not write `crumb.library.v1`. */
  holdLibrary: boolean;
};

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseSession(raw: string | null): Project | null {
  const data = parseJson(raw);
  if (data == null) return null;
  try {
    return parseProject(data);
  } catch {
    return null;
  }
}

/**
 * A `#c=` hash is a session view of someone else's board. Hydrate the library
 * from storage, but do not treat a bad hash as a fresh empty editor — that
 * path used to persist the stock example over the saved project and library.
 */
export function resolveBoot(hash: string, stored: StoredSnapshot): BootPlan {
  const libraryRaw = parseJson(stored.libraryRaw);
  const session = parseSession(stored.projectRaw);
  const body = hash.replace(/^#/, "");
  if (!body.startsWith("c=")) {
    return { libraryRaw, session, sessionRaw: stored.projectRaw, share: null, holdLibrary: false };
  }
  try {
    const share = decodeShare(body.slice(2));
    return { libraryRaw, session: null, sessionRaw: null, share, holdLibrary: true };
  } catch {
    return { libraryRaw, session, sessionRaw: stored.projectRaw, share: null, holdLibrary: false };
  }
}

/** JSON to write to `crumb.library.v1`, or null when the saved library must stay untouched. */
export function libraryAutosave(library: LibraryFile, project: Project, holdLibrary: boolean): string | null {
  if (holdLibrary) return null;
  const file = library.activeId ? upsertLibrary(library, project, library.activeId) : library;
  return JSON.stringify(file);
}

/** Cold start used by the editor. A share loads into the session and holds library writes. */
export function applyBoot(hash: string, stored: StoredSnapshot): void {
  const plan = resolveBoot(hash, stored);
  useCrumb.getState().hydrateLibrary(plan.libraryRaw, plan.share ? null : plan.session);
  if (plan.share) {
    useCrumb.getState().loadSharedProject(plan.share);
    return;
  }
  useCrumb.setState({ holdLibrary: false });
  if (!useCrumb.getState().library.activeId && plan.sessionRaw) {
    useCrumb.getState().loadJson(plan.sessionRaw);
  }
}
