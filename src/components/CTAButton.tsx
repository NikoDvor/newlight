import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Rocket, Eye, Settings, Upload, Video, CheckCircle, Phone, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type CTAVariant = "book-strategy" | "apply-enterprise" | "see-how" | "complete-setup" | "connect-accounts" | "upload-assets" | "book-kickoff" | "review-workspace" | "approve-launch" | "contact-expert" | "request-setup" | "activate-system";

const ctaConfig: Record<CTAVariant, { label: string; icon: any; to: string; className?: string }> = {
  "book-strategy": { label: "Book Strategy Call", icon: Calendar, to: "/proposal-booking", className: "btn-gradient" },
  "apply-enterprise": { label: "Apply for Enterprise Setup", icon: Rocket, to: "/proposal-booking", className: "btn-gradient" },
  "see-how": { label: "See How It Works", icon: Eye, to: "/enterprise", className: "" },
  "complete-setup": { label: "Complete Setup", icon: Settings, to: "/onboarding" },
  "connect-accounts": { label: "Connect Accounts", icon: Zap, to: "/integrations" },
  "upload-assets": { label: "Upload Brand Assets", icon: Upload, to: "/settings" },
  "book-kickoff": { label: "Book Kickoff", icon: Video, to: "/meetings" },
  "review-workspace": { label: "Review Workspace", icon: CheckCircle, to: "/onboarding" },
  "approve-launch": { label: "Approve Launch", icon: Rocket, to: "/onboarding" },
  "contact-expert": { label: "Contact Expert", icon: Phone, to: "/proposal-booking" },
  "request-setup": { label: "Request Setup", icon: Wrench, to: "/proposal-booking" },
  "activate-system": { label: "Activate This System", icon: Zap, to: "/proposal-booking" },
};

interface CTAButtonProps {
  variant: CTAVariant;
  size?: "sm" | "default" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function CTAButton({ variant, size = "default", className, fullWidth }: CTAButtonProps) {
  const config = ctaConfig[variant];
  const Icon = config.icon;

  return (
    <Button asChild size={size} className={cn(config.className, fullWidth && "w-full", className)}>
      <Link to={config.to}>
        <Icon className="h-4 w-4 mr-2" />
        {config.label}
      </Link>
    </Button>
  );
}
