import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "nl_active_session_id";
const HEARTBEAT_KEY = "nl_session_heartbeat";

function detectDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    return /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }
  return "desktop";
}

export async function startSession(userId: string, clientId: string | null): Promise<void> {
  try {
    // Avoid double-creating if a recent session row already exists for this tab
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return;

    const { data, error } = await supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
        client_id: clientId,
        device_type: detectDeviceType(),
        user_agent: navigator.userAgent.slice(0, 500),
      })
      .select("id, login_at")
      .single();

    if (!error && data) {
      sessionStorage.setItem(STORAGE_KEY, data.id);
      sessionStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
    }
  } catch {
    /* non-blocking */
  }
}

export async function endSession(): Promise<void> {
  try {
    const id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) return;
    const start = Number(sessionStorage.getItem(HEARTBEAT_KEY) || Date.now());
    const duration = Math.max(0, Math.round((Date.now() - start) / 1000));
    await supabase
      .from("user_sessions")
      .update({ logout_at: new Date().toISOString(), duration_seconds: duration })
      .eq("id", id);
  } catch {
    /* ignore */
  } finally {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(HEARTBEAT_KEY);
  }
}

export function installSessionLifecycleHandlers() {
  if (typeof window === "undefined") return;
  const handler = () => {
    const id = sessionStorage.getItem(STORAGE_KEY);
    const start = Number(sessionStorage.getItem(HEARTBEAT_KEY) || Date.now());
    if (!id) return;
    const duration = Math.max(0, Math.round((Date.now() - start) / 1000));
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${id}`;
      const payload = JSON.stringify({
        logout_at: new Date().toISOString(),
        duration_seconds: duration,
      });
      // Use fetch with keepalive — sendBeacon doesn't support PATCH
      fetch(url, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${(window as any).__nl_token__ ?? ""}`,
        },
        body: payload,
      });
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("pagehide", handler);
  window.addEventListener("beforeunload", handler);
}
