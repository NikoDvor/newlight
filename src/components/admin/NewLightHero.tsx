import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface NewLightHeroProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function NewLightHero({ title, subtitle, children }: NewLightHeroProps) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl mb-8"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Layered background */}
      <div className="absolute inset-0 nl-hero-bg" />
      <div className="absolute inset-0 nl-hero-grid" />
      <div className="absolute inset-0 nl-hero-orb nl-hero-orb--a" />
      <div className="absolute inset-0 nl-hero-orb nl-hero-orb--b" />

      {/* Content */}
      <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="nl-hero-badge">
              <Zap className="h-3 w-3" />
              <span>Powered by NewLight</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
            style={{ letterSpacing: "-0.025em" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              className="text-sm text-white/50 max-w-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {children && (
          <motion.div
            className="flex items-center gap-3 shrink-0"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px nl-hero-accent-line" />
    </motion.div>
  );
}

/** Small reusable "Powered by NewLight" chip for other surfaces */
export function PoweredByNewLight({ className = "" }: { className?: string }) {
  return (
    <div className={`nl-hero-badge ${className}`}>
      <Zap className="h-3 w-3" />
      <span>Powered by NewLight</span>
    </div>
  );
}
