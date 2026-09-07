export function nextId(existing: string[], prefix: string): string {
  let n = 1;
  const used = new Set(existing);
  while (used.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}
