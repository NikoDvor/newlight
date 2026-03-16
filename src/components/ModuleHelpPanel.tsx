import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, ChevronDown, X } from "lucide-react";

interface ModuleHelpPanelProps {
  moduleName: string;
  description: string;
  tips?: string[];
  variant?: "light" | "dark";
}

export function ModuleHelpPanel({ moduleName, description, tips, variant = "light" }: ModuleHelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isDark = variant === "dark";

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: isDark ? "hsla(211,96%,60%,.1)" : "hsla(211,96%,56%,.06)",
          color: isDark ? "hsla(211,96%,80%,.8)" : "hsl(211 96% 56%)",
          border: `1px solid ${isDark ? "hsla(211,96%,60%,.15)" : "hsla(211,96%,56%,.1)"}`,
        }}
      >
        <Info className="h-3 w-3" />
        How {moduleName} works
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 p-4 rounded-xl"
              style={{
                background: isDark ? "hsla(211,96%,60%,.06)" : "hsla(211,96%,56%,.03)",
                border: `1px solid ${isDark ? "hsla(211,96%,60%,.1)" : "hsla(211,96%,56%,.08)"}`,
              }}
            >
              <div className="flex items-start justify-between">
                <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-foreground/70"}`}>
                  {description}
                </p>
                <button onClick={() => setIsOpen(false)} className="ml-2 shrink-0">
                  <X className={`h-3 w-3 ${isDark ? "text-white/30" : "text-muted-foreground"}`} />
                </button>
              </div>
              {tips && tips.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {tips.map((tip, i) => (
                    <li key={i} className={`text-[11px] flex items-start gap-2 ${isDark ? "text-white/50" : "text-muted-foreground"}`}>
                      <span style={{ color: "hsl(211 96% 56%)" }}>•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
