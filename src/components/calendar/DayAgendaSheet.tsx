import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface DayAgendaSheetProps {
  day: Date;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
  eventCount: number;
}

/**
 * On mobile → shadcn Sheet from the bottom (matches the "bottom-feeling panel"
 * treatment from the spec).
 * On desktop → renders `children` inline; the container hosting this component
 * decides layout. The `open` prop is only consulted on mobile.
 */
export function DayAgendaSheet({
  day,
  open,
  onOpenChange,
  children,
  eventCount,
}: DayAgendaSheetProps) {
  const isMobile = useIsMobile();

  const title = day.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const subtitle = `${eventCount} ${eventCount === 1 ? "event" : "events"}`;

  if (!isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <div className="text-base font-semibold text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-card border-border pb-safe"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-left flex items-baseline justify-between">
            <span>{title}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {subtitle}
            </span>
          </SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
