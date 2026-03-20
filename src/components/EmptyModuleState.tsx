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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center max-w-lg mx-auto mt-6"
    >
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: "hsla(211,96%,56%,.08)" }}
      >
        <Icon className="h-8 w-8" style={{ color: "hsl(211 96% 56%)" }} />
      </div>
      <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>

      {features && features.length > 0 && (
        <div className="text-left space-y-2 mb-6 max-w-xs mx-auto">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "hsla(211,96%,56%,.08)" }}
              >
                <span className="text-[10px] font-bold" style={{ color: "hsl(211 96% 56%)" }}>
                  {i + 1}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{f}</p>
            </div>
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
