/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

interface PWAInstallContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  install: () => Promise<boolean>;
}

const PWAInstallContext = createContext<PWAInstallContextValue>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  install: async () => false,
});

const standaloneQuery = "(display-mode: standalone)";

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

  const value = useMemo(() => ({
    canInstall: !isInstalled,
    isInstalled,
    isIOS,
    install,
  }), [isInstalled, isIOS, install]);

  return <PWAInstallContext.Provider value={value}>{children}</PWAInstallContext.Provider>;
}

export const usePWAInstall = () => useContext(PWAInstallContext);
