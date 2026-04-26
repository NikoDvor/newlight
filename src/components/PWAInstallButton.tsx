import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton({ className = "" }: { className?: string }) {
  const { canInstall, install } = usePWAInstall();
  if (!canInstall) return null;
  return (
    <Button type="button" size="sm" onClick={install} className={`gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}>
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Download App</span>
      <span className="sm:hidden">App</span>
    </Button>
  );
}
