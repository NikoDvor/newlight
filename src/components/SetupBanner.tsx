import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SetupBannerProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function SetupBanner({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: SetupBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/10 p-5 mb-6"
      style={{ background: "linear-gradient(135deg, hsla(211,96%,56%,.04), hsla(197,92%,58%,.02))" }}
    >
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.1)" }}>
          <Icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {actionLabel && onAction && (
              <Button size="sm" className="btn-gradient h-8 text-[11px] gap-1" onClick={onAction}>
                {actionLabel} <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            {secondaryLabel && onSecondary && (
              <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DemoDataLabel() {
  return (
    <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-2"
      style={{ background: "hsla(211,96%,56%,.08)", color: "hsl(211 96% 56%)" }}>
      EXAMPLE DATA
    </span>
  );
}
