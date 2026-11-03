import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A bar pinned to the bottom of the screen that lines up with the page content — never slides under
 * the sidebar on computers. Follows the enclosing <main> as the window or sidebar changes size.
 * Adds the iPhone home-bar safe area at the bottom.
 */
export default function ContentBar({ className = "", style, children }: { className?: string; style?: React.CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const main = el?.parentElement?.closest("main") as HTMLElement | null;
    if (!main) return;
    const update = () => {
      const r = main.getBoundingClientRect();
      setBox((b) => (b && Math.abs(b.left - r.left) < 0.5 && Math.abs(b.width - r.width) < 0.5 ? b : { left: r.left, width: r.width }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    window.addEventListener("resize", update);
    // the sidebar animates open/closed: re-measure when its transition ends
    document.addEventListener("transitionend", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); document.removeEventListener("transitionend", update); };
  }, []);
  return (
    <div ref={ref} className={`fixed bottom-0 z-30 ${className}`}
      style={{ left: box?.left ?? 0, width: box?.width ?? "100%", paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))", ...style }}>
      {children}
    </div>
  );
}
