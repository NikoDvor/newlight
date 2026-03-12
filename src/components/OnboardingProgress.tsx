import { motion } from "framer-motion";
import { Check, Circle, Building2, Globe, MapPin, Star, CreditCard, Users as UsersIcon, Workflow, Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingProgressProps {
  steps: {
    business_info: boolean;
    website_connected: boolean;
    google_business_connected: boolean;
    review_platform_connected: boolean;
    ad_account_connected: boolean;
    crm_setup: boolean;
    team_setup: boolean;
    launch_ready: boolean;
  };
}

const stepMeta = [
  { key: "business_info", label: "Business Information", icon: Building2 },
  { key: "website_connected", label: "Website Connection", icon: Globe },
  { key: "google_business_connected", label: "Google Business", icon: MapPin },
  { key: "review_platform_connected", label: "Review Platform", icon: Star },
  { key: "ad_account_connected", label: "Ad Account", icon: CreditCard },
  { key: "crm_setup", label: "CRM Setup", icon: Workflow },
  { key: "team_setup", label: "Team Members", icon: UsersIcon },
  { key: "launch_ready", label: "Launch Readiness", icon: Rocket },
] as const;

export function OnboardingProgress({ steps }: OnboardingProgressProps) {
  const completed = stepMeta.filter(s => steps[s.key]).length;
  const percentage = Math.round((completed / stepMeta.length) * 100);

  return (
    <motion.div className="card-widget"
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Onboarding Progress</p>
          <p className="text-xs text-muted-foreground mt-0.5">{completed} of {stepMeta.length} steps complete</p>
        </div>
        <span className="metric-value text-2xl">{percentage}%</span>
      </div>

      <Progress value={percentage} className="h-2 mb-5 bg-secondary" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stepMeta.map((step, i) => {
          const done = steps[step.key];
          return (
            <motion.div key={step.key}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors"
              style={{
                background: done ? "hsla(211,96%,56%,.06)" : "hsla(210,40%,94%,.4)",
                border: `1px solid ${done ? "hsla(211,96%,56%,.12)" : "transparent"}`
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{
                background: done ? "hsla(211,96%,56%,.12)" : "hsla(210,40%,94%,.6)"
              }}>
                {done ? (
                  <Check className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                ) : (
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
