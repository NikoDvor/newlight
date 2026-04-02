import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyModuleStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
  actionLabel?: string;
  onAction?: () => void;
  actionLink?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryLink?: string;
}

export function EmptyModuleState({
  icon: Icon,
  title,
  description,
  features,
  actionLabel,
  onAction,
  actionLink,
  secondaryLabel,
  onSecondary,
  secondaryLink,
}: EmptyModuleStateProps) {
  const ActionBtn = actionLabel ? (
    <Button size="sm" className="btn-gradient h-9 text-xs gap-1.5" onClick={onAction}>
      {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  ) : null;

  const SecondaryBtn = secondaryLabel ? (
    <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onSecondary}>
      {secondaryLabel}
    </Button>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center max-w-lg mx-auto mt-6"
      style={{
        boxShadow: "0 1px 3px 0 hsla(215,50%,35%,.04), inset 0 1px 0 0 hsla(0,0%,100%,.6)"
      }}
    >
      <motion.div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{
          background: "linear-gradient(135deg, hsla(211,96%,56%,.10), hsla(197,92%,68%,.06))",
          boxShadow: "0 0 24px -6px hsla(211,96%,60%,.12)"
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Icon className="h-8 w-8 text-primary" />
      </motion.div>
      <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>

      {features && features.length > 0 && (
        <div className="text-left space-y-2.5 mb-6 max-w-xs mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
            >
              <div
                className="h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "hsla(211,96%,56%,.08)" }}
              >
                <span className="text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{f}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {actionLink ? <Link to={actionLink}>{ActionBtn}</Link> : ActionBtn}
        {secondaryLink ? <Link to={secondaryLink}>{SecondaryBtn}</Link> : SecondaryBtn}
      </div>
    </motion.div>
  );
}
