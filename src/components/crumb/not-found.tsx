export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
      <p className="font-display text-3xl leading-none tracking-tight">Not found</p>
      <p className="max-w-sm text-sm text-muted">This address is not part of the editor.</p>
      <a href="/" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm text-accent-fg">
        Back to editor
      </a>
    </main>
  );
}
