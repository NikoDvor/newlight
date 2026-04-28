import { motion } from "framer-motion";

interface WidgetGridProps {
  children: React.ReactNode;
  columns?: string;
}

export function WidgetGrid({ children, columns }: WidgetGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:gap-6 md:[grid-template-columns:var(--widget-grid-columns)]"
      style={{ "--widget-grid-columns": columns || "repeat(auto-fit, minmax(300px, 1fr))" } as React.CSSProperties}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}
