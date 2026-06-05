import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hide splash screen once React mounts
const hideSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 400);
  }
};

createRoot(document.getElementById("root")!).render(<App />);

// Hide after a brief moment to let the first paint render
requestAnimationFrame(() => {
  setTimeout(hideSplash, 300);
});

// Safety: force-hide splash if still visible after 4s (covers slow mobile loads)
setTimeout(hideSplash, 4000);
