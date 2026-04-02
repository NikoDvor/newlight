import { motion } from "framer-motion";

interface DataCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function DataCard({ title, children, className = "", action }: DataCardProps) {
  return (
    <motion.div
      className={`card-widget ${className}`}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">{title}</h3>
        {action}
      </div>
      {children}
    </motion.div>
  );
}
