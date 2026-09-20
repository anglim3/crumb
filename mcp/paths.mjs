/**
 * Fail-closed project-path sandbox for the Crumb MCP server.
 *
 * Relative paths are resolved against the allowlist root (repo/workspace),
 * not process cwd, so a misplaced cwd cannot widen the sandbox.
 * Existing path components are realpath'd; the final location must stay
 * inside the real root. That catches absolute escapes, `..` traversal, and
 * symlinks that point outside.
 */
import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

export class PathNotAllowedError extends Error {
  constructor() {
    super("Path is not allowed");
    this.name = "PathNotAllowedError";
  }
}

export function isInsideRoot(rootReal, candidate) {
  if (typeof rootReal !== "string" || typeof candidate !== "string") return false;
  if (!rootReal || !candidate) return false;
  const rel = relative(rootReal, candidate);
  if (rel === "") return true;
  if (isAbsolute(rel)) return false;
  return !rel.split(sep).includes("..");
}

function realpathOrThrow(path) {
  try {
    return realpathSync(path);
  } catch {
    throw new PathNotAllowedError();
  }
}

function lstatOrNull(path) {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

/**
 * Realpath the longest existing prefix, then rejoin missing trailing
 * components. Dangling or unreadable symlinks fail closed.
 */
export function resolveExistingPrefix(absolute) {
  let current = absolute;
  const missing = [];
  for (;;) {
    const st = lstatOrNull(current);
    if (st) {
      const real = realpathOrThrow(current);
      return missing.length ? resolve(real, ...missing) : real;
    }
    const parent = dirname(current);
    if (parent === current) throw new PathNotAllowedError();
    missing.unshift(basename(current));
    current = parent;
  }
}

/**
 * @param {string} userPath requested filesystem path (relative or absolute)
 * @param {string} rootDir allowlist root (repo / workspace)
 * @returns {string} real path (existing prefix realpath'd) under the root
 */
export function resolveAllowedPath(userPath, rootDir) {
  if (typeof userPath !== "string" || userPath.length === 0 || userPath.includes("\0")) {
    throw new PathNotAllowedError();
  }
  if (typeof rootDir !== "string" || rootDir.length === 0 || rootDir.includes("\0")) {
    throw new PathNotAllowedError();
  }

  const rootLex = resolve(rootDir);
  const rootReal = realpathOrThrow(rootDir);
  const absolute = isAbsolute(userPath) ? resolve(userPath) : resolve(rootReal, userPath);

  // Prefix check on the unresolved path (necessary, not sufficient).
  // Accept either the lexical root or its realpath so a symlinked workspace
  // still works when the caller passes the symlink path.
  if (!isInsideRoot(rootReal, absolute) && !isInsideRoot(rootLex, absolute)) {
    throw new PathNotAllowedError();
  }

  const candidate = resolveExistingPrefix(absolute);
  if (!isInsideRoot(rootReal, candidate)) {
    throw new PathNotAllowedError();
  }
  return candidate;
}
