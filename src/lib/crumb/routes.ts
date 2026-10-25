/** True for the editor shell. Every other path renders the in-app not-found view. */
export function isEditorPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/index.html";
}
