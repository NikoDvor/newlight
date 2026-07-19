import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAUpdateBanner() {
  const { updateAvailable, updateNow, dismissUpdate } = usePWAInstall();

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] pt-safe px-3 sm:px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto mt-2 max-w-3xl rounded-lg border border-primary/30 bg-background/95 px-3 py-2 shadow-lg shadow-primary/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">A new version is available</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={updateNow} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <RefreshCw className="h-3.5 w-3.5" /> Update Now
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={dismissUpdate} aria-label="Dismiss update notification">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
