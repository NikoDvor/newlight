import { PageHeader } from "@/components/PageHeader";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { motion } from "framer-motion";
import {
  Building2, Globe, MapPin, Star, CreditCard, Users, Workflow, Rocket,
  Check, BarChart3, Palette, Phone, Video, Search, Share2, DollarSign,
  Calendar, Plug
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

const wizardSteps = [
  { key: "business_info", label: "Business Information", icon: Building2, description: "Company name, industry, location, and contact details." },
  { key: "branding", label: "Branding Setup", icon: Palette, description: "Upload your logo, set brand colors, and customize your workspace." },
  { key: "website_connected", label: "Website / Domain", icon: Globe, description: "Connect your website URL and verify domain ownership." },
  { key: "google_analytics", label: "Google Analytics", icon: BarChart3, description: "Connect Google Analytics for traffic and conversion tracking." },
  { key: "search_console", label: "Search Console", icon: Search, description: "Link Google Search Console for SEO performance data." },
  { key: "google_business_connected", label: "Google Business Profile", icon: MapPin, description: "Connect your GBP for local visibility and review tracking." },
  { key: "meta_connected", label: "Meta / Instagram / Facebook", icon: Share2, description: "Connect your Meta accounts for social and ad management." },
  { key: "google_ads", label: "Google Ads", icon: CreditCard, description: "Link Google Ads for campaign tracking and optimization." },
  { key: "stripe_connected", label: "Stripe", icon: DollarSign, description: "Connect Stripe for revenue tracking and payment processing." },
  { key: "twilio_connected", label: "Twilio", icon: Phone, description: "Connect Twilio for SMS and voice automation." },
  { key: "zoom_connected", label: "Zoom", icon: Video, description: "Connect Zoom for meeting scheduling and recording." },
  { key: "team_setup", label: "Team Members", icon: Users, description: "Invite team members and set their access levels." },
  { key: "kickoff_booking", label: "Kickoff Booking", icon: Calendar, description: "Book your kickoff session with your growth strategist." },
  { key: "launch_ready", label: "Launch Readiness", icon: Rocket, description: "Review your setup and approve launch." },
] as const;

export default function Onboarding() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [activeStep, setActiveStep] = useState(0);

  const toggleStep = (key: string) => {
    setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const percentage = Math.round((completedCount / wizardSteps.length) * 100);

  return (
    <div>
      <PageHeader title="Onboarding Wizard" description="Complete your workspace setup step by step" />

      {/* Progress summary */}
      <motion.div className="card-widget mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Setup Progress</p>
            <p className="text-xs text-muted-foreground mt-0.5">{completedCount} of {wizardSteps.length} steps complete</p>
          </div>
          <span className="metric-value text-2xl">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2 bg-secondary" />
      </motion.div>

      {/* Steps */}
      <div className="space-y-3">
        {wizardSteps.map((step, i) => {
          const done = !!completed[step.key];
          const isActive = activeStep === i;

          return (
            <motion.div
              key={step.key}
              className="card-widget cursor-pointer"
              onClick={() => setActiveStep(i)}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              style={{
                borderColor: isActive ? "hsla(211,96%,56%,.2)" : undefined,
                boxShadow: isActive ? "var(--shadow-glow)" : undefined,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: done ? "hsla(211,96%,56%,.12)" : "hsla(210,40%,94%,.6)"
                }}>
                  {done ? <Check className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} /> : <step.icon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Step {i + 1}: {step.label}
                  </p>
                  {isActive && (
                    <motion.p className="text-xs text-muted-foreground mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {step.description}
                    </motion.p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {done ? (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "hsla(211,96%,56%,.08)", color: "hsl(211 96% 46%)" }}>Complete</span>
                  ) : (
                    <Button size="sm" variant={isActive ? "default" : "outline"} onClick={(e) => { e.stopPropagation(); toggleStep(step.key); }}
                      className={`h-7 text-[10px] rounded-lg ${isActive ? "btn-gradient" : ""}`}>
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
