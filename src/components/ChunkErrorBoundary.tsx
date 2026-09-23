import { Component, ReactNode } from "react";

const RELOAD_KEY = "nl_chunk_reload_at";
const RELOAD_WINDOW_MS = 60_000;

/**
 * A stale client (old index.html still in memory) can request a lazy chunk
 * hash that no longer exists after a deploy. Browsers surface that as
 * "Failed to fetch dynamically imported module". The fix is a full reload so
 * the client picks up the new index.html — guarded so we never loop.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(
    message,
  );
}

export function reloadForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (last && Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — fall through to a single best-effort reload.
  }
  window.location.reload();
  return true;
}

/** Installs global listeners for dynamic-import failures outside React render. */
export function installChunkErrorHandler() {
  const handle = (reason: unknown) => {
    if (isChunkLoadError(reason)) reloadForChunkError();
  };
  window.addEventListener("error", (event) => handle(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => handle(event.reason));
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ChunkErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      if (reloadForChunkError()) return;
    }
    console.error("[ChunkErrorBoundary]", error);
  }

  render() {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This page couldn&apos;t load. A newer version may be available.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Reload
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
