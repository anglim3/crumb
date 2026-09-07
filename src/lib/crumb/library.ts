import { parseProject } from "./mutate.ts";
import type { Project } from "./types.ts";

export const LIBRARY_KEY = "crumb.library.v1";

export type LibraryEntry = {
  id: string;
  updatedAt: number;
  project: Project;
};

export type LibraryFile = {
  version: 1;
  activeId: string | null;
  entries: LibraryEntry[];
};

export function emptyLibrary(): LibraryFile {
  return { version: 1, activeId: null, entries: [] };
}

export function parseLibrary(raw: unknown): LibraryFile {
  if (!raw || typeof raw !== "object") return emptyLibrary();
  const data = raw as Partial<LibraryFile>;
  if (data.version !== 1 || !Array.isArray(data.entries)) return emptyLibrary();
  const entries: LibraryEntry[] = [];
  for (const item of data.entries) {
    if (!item || typeof item !== "object") continue;
    if (typeof item.id !== "string" || !item.id) continue;
    try {
      entries.push({
        id: item.id,
        updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : 0,
        project: parseProject(item.project),
      });
    } catch {
      /* skip bad entry */
    }
  }
  const activeId = typeof data.activeId === "string" && entries.some((e) => e.id === data.activeId) ? data.activeId : null;
  return { version: 1, activeId, entries };
}

export function nextLibraryId(existing: LibraryEntry[]): string {
  const used = new Set(existing.map((e) => e.id));
  let n = existing.length + 1;
  while (used.has(`p${n}`)) n += 1;
  return `p${n}`;
}

export function upsertLibrary(file: LibraryFile, project: Project, id: string | null, now = Date.now()): LibraryFile {
  const next = structuredClone(project);
  if (id) {
    const idx = file.entries.findIndex((e) => e.id === id);
    if (idx >= 0) {
      const entries = file.entries.slice();
      entries[idx] = { id, updatedAt: now, project: next };
      return { version: 1, activeId: id, entries };
    }
  }
  const fresh = nextLibraryId(file.entries);
  return {
    version: 1,
    activeId: fresh,
    entries: [...file.entries, { id: fresh, updatedAt: now, project: next }],
  };
}

export function removeLibrary(file: LibraryFile, id: string): LibraryFile {
  const entries = file.entries.filter((e) => e.id !== id);
  return {
    version: 1,
    activeId: file.activeId === id ? null : file.activeId,
    entries,
  };
}

export function migrateSession(file: LibraryFile, session: Project | null): LibraryFile {
  if (!session || file.entries.length > 0) return file;
  if (!session.parts.length && !session.wires.length) return file;
  return upsertLibrary(file, session, null, Date.now());
}
