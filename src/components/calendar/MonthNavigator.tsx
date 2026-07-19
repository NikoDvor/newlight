import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthNavigatorProps {
  cursor: Date;
  view?: "month" | "week";
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Shared ‹ Month YYYY › + Today toolbar. Uses semantic tokens only. */
export function MonthNavigator({
  cursor,
  view = "month",
  onPrev,
  onNext,
  onToday,
}: MonthNavigatorProps) {
  const label =
    view === "month"
      ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : cursor.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex items-center gap-1 min-w-0">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous"
        onClick={onPrev}
        className="h-9 w-9 min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-foreground text-base font-semibold px-1 truncate min-w-0">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next"
        onClick={onNext}
        className="h-9 w-9 min-h-11 min-w-11 rounded-full text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToday}
        className="h-9 min-h-11 px-3 ml-1 text-xs rounded-full text-muted-foreground hover:text-foreground"
      >
        Today
      </Button>
    </div>
  );
}
