import { Lock, Phone, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface LockedFeatureProps {
  title: string;
  children?: React.ReactNode;
}

export function LockedFeature({ title, children }: LockedFeatureProps) {
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
        <p className="section-title">Feature Locked</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Contact Expert to Unlock</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="h-10 px-5 rounded-lg font-medium text-sm">
              Contact Expert
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="center">
            <a
              href="https://calendly.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-secondary transition-colors"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Book a Call
            </a>
            <a
              href="sms:+18058363557"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-secondary transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              Text (805) 836-3557
            </a>
          </PopoverContent>
        </Popover>
      </div>
    </motion.div>
  );
}
