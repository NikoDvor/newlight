import { PageHeader } from "@/components/PageHeader";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { motion } from "framer-motion";
import { Building2, Globe, MapPin, Star, CreditCard, Users, Workflow, Rocket, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const wizardSteps = [
  { key: "business_info", label: "Business Information", icon: Building2, description: "Tell us about your business to customize your workspace." },
  { key: "website_connected", label: "Website Connection", icon: Globe, description: "Connect your website so we can monitor performance and SEO." },
  { key: "google_business_connected", label: "Google Business", icon: MapPin, description: "Link your Google Business Profile for local visibility tracking." },
  { key: "review_platform_connected", label: "Review Platform", icon: Star, description: "Connect your review platforms to monitor and respond to reviews." },
  { key: "ad_account_connected", label: "Ad Account", icon: CreditCard, description: "Connect Google Ads or Meta Ads for campaign management." },
  { key: "crm_setup", label: "CRM Setup", icon: Workflow, description: "Configure your sales pipeline and lead management." },
  { key: "team_setup", label: "Team Members", icon: Users, description: "Invite your team to collaborate in the workspace." },
  { key: "launch_ready", label: "Launch Readiness", icon: Rocket, description: "Review your setup and go live with your workspace." },
] as const;

export default function Onboarding() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [activeStep, setActiveStep] = useState(0);

  const toggleStep = (key: string) => {
    setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const progress = {
    business_info: !!completed.business_info,
    website_connected: !!completed.website_connected,
    google_business_connected: !!completed.google_business_connected,
    review_platform_connected: !!completed.review_platform_connected,
    ad_account_connected: !!completed.ad_account_connected,
    crm_setup: !!completed.crm_setup,
    team_setup: !!completed.team_setup,
    launch_ready: !!completed.launch_ready,
  };

  return (
    <div>
      <PageHeader title="Onboarding" description="Set up your workspace step by step" />

      <OnboardingProgress steps={progress} />

      <div className="mt-6 space-y-3">
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
              transition={{ delay: i * 0.04 }}
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
                  <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-foreground"}`}>
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
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); toggleStep(step.key); }}
                      className="h-7 text-[10px] rounded-lg">
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
