/** True for the editor shell. /examples/ and /how-it-works/ are separate HTML files, not client routes. */
export function isEditorPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/index.html";
}

/** SPA fallback for a static page requested without a trailing slash. */
export function staticPagePath(pathname: string): string | null {
  if (pathname === "/examples" || pathname === "/how-it-works") return `${pathname}/`;
  return null;
}
