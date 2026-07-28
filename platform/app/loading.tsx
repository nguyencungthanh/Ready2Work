export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-6">
      <div className="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        Loading…
      </div>
    </main>
  );
}
