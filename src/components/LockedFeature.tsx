import { Lock, Phone, Calendar, Zap, Wrench } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

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
        <p className="text-sm text-muted-foreground mt-1 mb-4">Unlock with Enterprise Growth System</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="default" size="sm" className="h-9 px-4 rounded-lg font-medium text-sm btn-gradient">
            <Link to="/proposal-booking">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Contact Expert
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-lg font-medium text-sm">
            <Link to="/proposal-booking">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Request Setup
            </Link>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg font-medium text-sm">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Activate This System
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="center">
              <Link to="/proposal-booking" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-secondary transition-colors">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Book a Strategy Call
              </Link>
              <a href="sms:+18058363557" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-secondary transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Text (805) 836-3557
              </a>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </motion.div>
  );
}
