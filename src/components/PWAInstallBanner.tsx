import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState } from "react";

export function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const { branding, activeClientName } = useWorkspace();
  const [dismissed, setDismissed] = useState(false);
  if (!canInstall || dismissed) return null;

  const appName = branding.app_display_name || branding.company_name || activeClientName || "NewLight";

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p className="text-sm font-medium text-foreground">📱 Add {appName} to your home screen for the best experience</p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={install} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Download className="h-3.5 w-3.5" /> Install App
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss install banner">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
