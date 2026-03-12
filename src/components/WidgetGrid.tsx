import { motion } from "framer-motion";

interface WidgetGridProps {
  children: React.ReactNode;
  columns?: string;
}

export function WidgetGrid({ children, columns }: WidgetGridProps) {
  return (
    <motion.div
      className="grid gap-6"
      style={{ gridTemplateColumns: columns || "repeat(auto-fit, minmax(300px, 1fr))" }}
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
