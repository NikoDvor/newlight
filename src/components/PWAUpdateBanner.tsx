import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAUpdateBanner() {
  const { updateAvailable, updateNow, dismissUpdate } = usePWAInstall();

  if (!updateAvailable) return null;

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-background/95 px-3 py-2 shadow-lg shadow-primary/10 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
  );
}