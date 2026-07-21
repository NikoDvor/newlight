import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function CheckForUpdatesButton({ className = "" }: { className?: string }) {
  const { checkForUpdates } = usePWAInstall();
  const [checking, setChecking] = useState(false);

  const handleClick = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await checkForUpdates();
      if (result === "update-found") {
        toast.success("Update available — reloading with the new version.");
      } else if (result === "up-to-date") {
        toast("You're on the latest version.");
      } else {
        // No service worker (dev/preview or unsupported). Force-reload as fallback.
        toast("Reloading to fetch the latest version…");
        setTimeout(() => window.location.reload(), 400);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checking}
      title="Check for updates"
      aria-label="Check for updates"
      className={`p-2 rounded-xl transition-all duration-200 hover:bg-white/10 group disabled:opacity-60 ${className}`}
    >
      <RefreshCw className={`h-4 w-4 text-white/60 group-hover:text-white transition-colors ${checking ? "animate-spin" : ""}`} />
    </button>
  );
}
