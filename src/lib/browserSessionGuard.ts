// Browser-session auth guard.
//
// src/integrations/supabase/client.ts is auto-generated (it may be overwritten
// on any Supabase integration resync), so we do NOT edit it. Instead this module
// runs at boot — BEFORE the Supabase client module is imported — and enforces the
// policy externally:
//
//   installed PWA (display-mode: standalone / navigator.standalone)
//       -> leave the persisted session alone (indefinite persistence, unchanged)
//   ordinary browser tab
//       -> the session must not survive closing the browser. We keep the token in
//          localStorage while the browser is alive (so auto-refresh and multi-tab
//          both keep working), and drop it on the first load of a brand-new
//          browser session.
//
// "Brand-new browser session" = no sessionStorage marker AND the localStorage
// heartbeat is stale. The heartbeat is what distinguishes "user opened a second
// tab" (heartbeat fresh, keep session) from "user quit the browser and came
// back later" (heartbeat stale, clear session).

const MARKER_KEY = "nl.browser-session.active";
const HEARTBEAT_KEY = "nl.browser-session.heartbeat";
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 90_000;

function detectInstalled(): boolean {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function clearPersistedAuth() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token/.test(key)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export function installBrowserSessionGuard() {
  if (typeof window === "undefined") return;

  // Installed app: indefinite persistence, exactly as before.
  if (detectInstalled()) return;

  let markerPresent = false;
  let lastBeat = 0;
  try {
    markerPresent = sessionStorage.getItem(MARKER_KEY) === "1";
    lastBeat = Number(localStorage.getItem(HEARTBEAT_KEY) || 0);
  } catch {
    /* ignore */
  }

  const heartbeatFresh = lastBeat > 0 && Date.now() - lastBeat < STALE_AFTER_MS;

  // Fresh browser launch (not a new tab of a live browser) -> forget the login.
  if (!markerPresent && !heartbeatFresh) clearPersistedAuth();

  const beat = () => {
    try {
      sessionStorage.setItem(MARKER_KEY, "1");
      localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  beat();
  window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") beat();
  });
  window.addEventListener("pagehide", beat);
}
