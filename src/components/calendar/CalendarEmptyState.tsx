import { CalendarDays } from "lucide-react";
import { ReactNode } from "react";

interface CalendarEmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function CalendarEmptyState({
  title = "No events scheduled",
  description = "Tap a day to add one.",
  icon,
  action,
  compact,
}: CalendarEmptyStateProps) {
  return (
    <div
      className={
        "rounded-2xl text-center " +
        (compact ? "py-8" : "py-10") +
        " bg-card/40"
      }
      style={{ border: "1px dashed hsl(var(--cal-grid-line))" }}
    >
      <div className="flex flex-col items-center gap-2 px-4">
        <span className="text-muted-foreground/50">
          {icon ?? <CalendarDays className="h-5 w-5" />}
        </span>
        <div className="text-sm font-medium text-foreground/80">{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground max-w-xs">
            {description}
          </div>
        )}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
