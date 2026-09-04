export function Loading() {
  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-4" aria-label="Loading">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-4">
          <span className="h-4 animate-pulse rounded bg-neutral-100" />
          <span className="h-4 animate-pulse rounded bg-neutral-100" />
          <span className="h-4 animate-pulse rounded bg-neutral-100" />
          <span className="h-4 animate-pulse rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
