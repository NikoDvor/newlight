import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

interface PWAInstallContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  updateAvailable: boolean;
  updateNow: () => void;
  dismissUpdate: () => void;
  install: () => Promise<boolean>;
}

const PWAInstallContext = createContext<PWAInstallContextValue>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  updateAvailable: false,
  updateNow: () => undefined,
  dismissUpdate: () => undefined,
  install: async () => false,
});

const standaloneQuery = "(display-mode: standalone)";
const updateDismissedKey = "newlight-pwa-update-dismissed";

function isPreviewOrFramed() {
  const isFramed = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  return isFramed || window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
}

function detectInstalled() {
  return window.matchMedia?.(standaloneQuery).matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detectIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    setIsInstalled(detectInstalled());
    setIsIOS(detectIOS());

    const media = window.matchMedia?.(standaloneQuery);
    const updateInstalled = () => setIsInstalled(detectInstalled());
    media?.addEventListener?.("change", updateInstalled);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const appInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);

    return () => {
      media?.removeEventListener?.("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (isPreviewOrFramed()) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      }).catch(() => undefined);
      return;
    }

    let cancelled = false;
    let cleanupVisibility: (() => void) | null = null;

    // Use vite-plugin-pwa's registerSW so onNeedRefresh fires when a NEW
    // service worker has installed and is WAITING to activate. That's the
    // exact "stale precache" case that caused the last deploy to look stuck.
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (cancelled) return;
        // If the user previously dismissed an update, silently apply this one
        // instead of nagging again on the very next deploy.
        if (localStorage.getItem(updateDismissedKey) === "true") {
          localStorage.removeItem(updateDismissedKey);
          void updateSW(true);
          return;
        }
        setUpdateAvailable(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Poll for updates when the tab becomes visible again so returning
        // users pick up new deploys without a hard refresh.
        const visibilityChange = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => undefined);
          }
        };
        document.addEventListener("visibilitychange", visibilityChange);
        cleanupVisibility = () => document.removeEventListener("visibilitychange", visibilityChange);
      },
    });

    updateSWRef.current = updateSW;

    return () => {
      cancelled = true;
      cleanupVisibility?.();
      updateSWRef.current = null;
    };
  }, []);

  const install = useCallback(async () => {
    if (isInstalled) return true;
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") setIsInstalled(true);
      return choice.outcome === "accepted";
    }
    if (isIOS) {
      window.alert('Tap the Share button in Safari, then choose "Add to Home Screen".');
      return false;
    }
    window.alert('Use your browser menu and choose "Install app" or "Add to Home screen".');
    return false;
  }, [deferredPrompt, isInstalled, isIOS]);

  const updateNow = useCallback(() => {
    localStorage.removeItem(updateDismissedKey);
    setUpdateAvailable(false);
    const waitingWorker = waitingWorkerRef.current;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    localStorage.setItem(updateDismissedKey, "true");
    setUpdateAvailable(false);
  }, []);

  const value = useMemo(() => ({
    canInstall: !isInstalled,
    isInstalled,
    isIOS,
    updateAvailable,
    updateNow,
    dismissUpdate,
    install,
  }), [isInstalled, isIOS, updateAvailable, updateNow, dismissUpdate, install]);

  return <PWAInstallContext.Provider value={value}>{children}</PWAInstallContext.Provider>;
}

export const usePWAInstall = () => useContext(PWAInstallContext);
