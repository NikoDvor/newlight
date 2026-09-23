import { createRoot } from "react-dom/client";
// Must run before anything imports the Supabase client singleton.
import { installBrowserSessionGuard } from "./lib/browserSessionGuard";

installBrowserSessionGuard();

import App from "./App.tsx";
import "./index.css";
import { BUILD_TAG } from "./buildTag";
import { installChunkErrorHandler } from "./components/ChunkErrorBoundary";

// Recover from stale lazy-chunk requests after a deploy (outside React render).
installChunkErrorHandler();


// Expose build tag for cache-vs-deployment diagnostics.
// Type `window.__NL_BUILD__` in the browser console to see which build is running.
(window as unknown as { __NL_BUILD__: string }).__NL_BUILD__ = BUILD_TAG;

createRoot(document.getElementById("root")!).render(<App />);
