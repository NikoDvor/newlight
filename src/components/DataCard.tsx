import { motion } from "framer-motion";

interface DataCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DataCard({ title, children, className = "" }: DataCardProps) {
  return (
    <motion.div
      className={`card-widget ${className}`}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <h3 className="section-title mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}
