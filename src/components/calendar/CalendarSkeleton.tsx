import { Skeleton } from "@/components/ui/skeleton";

/** Calendar month-grid skeleton — replaces spinners on initial load. */
export function CalendarGridSkeleton() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden bg-card/70"
      style={{ border: "1px solid hsl(var(--cal-grid-line))" }}
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid hsl(var(--cal-grid-line))",
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              borderRight:
                i < 6 ? "1px solid hsl(var(--cal-grid-line))" : "none",
            }}
            className="py-2 px-2"
          >
            <Skeleton className="h-3 w-6 mx-auto" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} style={{ display: "flex" }}>
          {Array.from({ length: 7 }).map((_, c) => (
            <div
              key={c}
              style={{
                flex: "1 1 0",
                borderRight:
                  c < 6 ? "1px solid hsl(var(--cal-grid-line))" : "none",
                borderBottom:
                  r < 5 ? "1px solid hsl(var(--cal-grid-line))" : "none",
                minHeight: "3.5rem",
              }}
              className="p-2 space-y-2"
            >
              <Skeleton className="h-4 w-5 rounded-full" />
              <Skeleton className="h-1.5 w-8 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CalendarAgendaSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
        >
          <Skeleton className="h-10 w-14 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2 w-2/5" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}
