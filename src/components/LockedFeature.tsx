import { Lock, Phone, Calendar, Zap, Wrench, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface LockedFeatureProps {
  title: string;
  children?: React.ReactNode;
  /** Premium client-safe lock message */
  lockMessage?: string;
  /** Link to setup/resolve area */
  setupLink?: string;
  /** Compact inline lock badge instead of full overlay */
  variant?: "overlay" | "badge";
}

export function LockedFeature({
  title,
  children,
  lockMessage = "Complete setup to unlock this feature",
  setupLink = "/setup-center",
  variant = "overlay",
}: LockedFeatureProps) {
  if (variant === "badge") {
    return (
      <div className="relative">
        {children || (
          <div className="opacity-40 pointer-events-none select-none p-4">
            <p className="section-title">{title}</p>
            <div className="mt-3 space-y-2">
              <div className="h-3 bg-secondary rounded w-3/4" />
              <div className="h-3 bg-secondary rounded w-1/2" />
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge
            variant="outline"
            className="text-[9px] px-2 py-0.5 gap-1"
            style={{
              color: "hsl(var(--muted-foreground))",
              background: "hsla(210,40%,94%,.6)",
              borderColor: "hsla(210,40%,80%,.2)",
            }}
          >
            <Lock className="h-2.5 w-2.5" />
            Locked until setup
          </Badge>
        </div>
        <Link to={setupLink}>
          <Button
            size="sm"
            variant="ghost"
            className="absolute bottom-3 right-3 h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
          >
            Set up <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      className="card-widget relative overflow-hidden min-h-[200px]"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Blurred background content */}
      <div className="opacity-30 pointer-events-none select-none">
        <p className="section-title">{title}</p>
        {children || (
          <div className="mt-4 space-y-3">
            <div className="h-4 bg-secondary rounded w-3/4" />
            <div className="h-4 bg-secondary rounded w-1/2" />
            <div className="h-8 bg-secondary rounded w-full mt-4" />
            <div className="h-8 bg-secondary rounded w-full" />
          </div>
        )}
      </div>

      {/* Lock overlay */}
      <div className="locked-overlay">
        <Lock className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="section-title">Locked until setup</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs text-center">{lockMessage}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="default" size="sm" className="h-9 px-4 rounded-lg font-medium text-sm btn-gradient">
            <Link to={setupLink}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Complete Setup
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-lg font-medium text-sm">
            <Link to="/proposal-booking">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Contact Expert
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/** Inline lock badge for use inside cards/sections */
export function LockBadge({ message = "Locked until setup" }: { message?: string }) {
  return (
    <Badge
      variant="outline"
      className="text-[9px] px-2 py-0.5 gap-1 shrink-0"
      style={{
        color: "hsl(var(--muted-foreground))",
        background: "hsla(210,40%,94%,.5)",
        borderColor: "hsla(210,40%,80%,.15)",
      }}
    >
      <Lock className="h-2.5 w-2.5" />
      {message}
    </Badge>
  );
}
