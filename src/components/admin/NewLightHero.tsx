import { motion } from "framer-motion";

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
      {/* Layered background — deeper, richer */}
      {/* Static glow: the moving background already animates; animated blurred orbs and a
          repainting shimmer on top of it made admin pages lag on laptops. */}
      <div className="absolute inset-0 nl-hero-bg" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 45% 70% at 88% 0%, hsla(211,96%,60%,.20), transparent 70%), radial-gradient(ellipse 35% 60% at 15% 100%, hsla(197,92%,68%,.13), transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 px-4 py-6 sm:px-10 sm:py-14 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-2 sm:space-y-3">
          <motion.h1
            className="text-2xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ letterSpacing: "-0.03em" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              className="text-xs sm:text-base text-white/50 max-w-xl leading-relaxed"
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
            className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </div>

      {/* Bottom accent line — brighter */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] nl-hero-accent-line" />
      {/* Top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: "linear-gradient(90deg, transparent 10%, hsla(211,96%,70%,.2) 50%, transparent 90%)"
      }} />
    </motion.div>
  );
}

