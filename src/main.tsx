import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BUILD_TAG } from "./buildTag";

// Expose build tag for cache-vs-deployment diagnostics.
// Type `window.__NL_BUILD__` in the browser console to see which build is running.
(window as unknown as { __NL_BUILD__: string }).__NL_BUILD__ = BUILD_TAG;

createRoot(document.getElementById("root")!).render(<App />);
