import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function PWAInstallPrompt() {
  const { branding, activeClientId } = useWorkspace();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const key = `pwa-dismissed-${activeClientId || "default"}`;
    if (sessionStorage.getItem(key)) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      // Show iOS instructions after a delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Chrome/Edge/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [activeClientId]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    const key = `pwa-dismissed-${activeClientId || "default"}`;
    sessionStorage.setItem(key, "1");
  };

  if (dismissed || !showPrompt) return null;

  const appName = branding.app_display_name || branding.company_name || "Your App";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div
          className="rounded-2xl border p-4 shadow-xl backdrop-blur-xl"
          style={{
            background: "hsla(220, 40%, 13%, 0.95)",
            borderColor: `${branding.primary_color || "hsl(211,96%,56%)"}20`,
            boxShadow: `0 8px 32px -8px ${branding.primary_color || "hsl(211,96%,56%)"}30`,
          }}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-white/40" />
          </button>

          {showIOSGuide ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${branding.primary_color || "#3B82F6"}20` }}
                >
                  <Share className="h-5 w-5" style={{ color: branding.primary_color || "#3B82F6" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Install {appName}</p>
                  <p className="text-[11px] text-white/50">Follow these steps:</p>
                </div>
              </div>
              <div className="space-y-2 pl-1">
                {[
                  "Tap the Share button in Safari",
                  "Scroll down and tap \"Add to Home Screen\"",
                  "Tap \"Add\" to install",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: branding.primary_color || "#3B82F6" }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xs text-white/70">{step}</span>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-xs h-8"
              >
                Got it
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${branding.primary_color || "#3B82F6"}20` }}
              >
                {branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt={appName}
                    className="h-8 w-8 rounded-lg object-contain"
                  />
                ) : (
                  <Smartphone className="h-6 w-6" style={{ color: branding.primary_color || "#3B82F6" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">Install {appName}</p>
                <p className="text-[11px] text-white/50">
                  Add to your home screen for the full app experience
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleInstall}
                className="shrink-0 gap-1.5 text-xs h-9"
                style={{
                  background: `linear-gradient(135deg, ${branding.primary_color || "#3B82F6"}, ${branding.secondary_color || "#06B6D4"})`,
                  color: "white",
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
