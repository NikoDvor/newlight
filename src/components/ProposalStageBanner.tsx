// ── Client-Facing Proposal Stage Banner ──
// Shows premium guided messaging based on the client's current lifecycle stage.
// Never exposes pricing before reveal.

import { motion } from "framer-motion";
import { Sparkles, Clock, FileText, CheckCircle2, CreditCard, Rocket } from "lucide-react";

type Stage = "preparing" | "proposal_ready" | "setup_pending" | "payment_ready" | "active";

interface Props {
  proposalStatus: string;
  agreementStatus: string;
  paymentStatus: string;
  implementationStatus: string;
}

function resolveStage(p: Props): Stage {
  if (p.paymentStatus === "paid") return "active";
  if (["approved", "accepted"].includes(p.proposalStatus) && p.paymentStatus !== "paid") {
    if (p.agreementStatus === "signed") return "payment_ready";
    return "setup_pending";
  }
  if (["sent", "viewed"].includes(p.proposalStatus)) return "proposal_ready";
  return "preparing";
}

const STAGE_CONFIG: Record<Stage, { icon: any; title: string; subtitle: string; accent: string }> = {
  preparing: {
    icon: Clock,
    title: "Your custom plan is being prepared",
    subtitle: "Our team is building a tailored growth strategy for your business. You'll be the first to know when it's ready.",
    accent: "hsla(211,96%,60%,.15)",
  },
  proposal_ready: {
    icon: FileText,
    title: "Your proposal is ready for review",
    subtitle: "Your personalized growth plan has been prepared. Review it during your next meeting with our team.",
    accent: "hsla(197,92%,68%,.15)",
  },
  setup_pending: {
    icon: Sparkles,
    title: "Complete your final setup to unlock activation",
    subtitle: "Your proposal has been approved. Complete the remaining setup steps to finalize your system launch.",
    accent: "hsla(270,80%,65%,.15)",
  },
  payment_ready: {
    icon: CreditCard,
    title: "Your activation step is now ready",
    subtitle: "All setup is complete. Finalize your payment to launch your growth system.",
    accent: "hsla(140,60%,50%,.15)",
  },
  active: {
    icon: Rocket,
    title: "Your system is live",
    subtitle: "Your growth engine is active and tracking performance. Check your dashboard for real-time insights.",
    accent: "hsla(140,60%,50%,.15)",
  },
};

export function ProposalStageBanner(props: Props) {
  const stage = resolveStage(props);
  const config = STAGE_CONFIG[stage];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: config.accent,
        border: `1px solid ${config.accent.replace(/[\d.]+\)$/, "0.3)")}`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: config.accent.replace(/[\d.]+\)$/, "0.4)"),
            boxShadow: `0 0 20px ${config.accent}`,
          }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{config.title}</h3>
          <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-lg">{config.subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
