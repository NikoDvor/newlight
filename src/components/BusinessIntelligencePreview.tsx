// ── Client-Safe Business Intelligence Preview ──
// Uses clientIntelligenceEngine — NO pricing ever shown.

import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, TrendingUp, Zap, Shield, Gauge, BarChart3 } from "lucide-react";
import { generateClientIntelligence, type ClientIntelligenceOutput } from "@/lib/clientIntelligenceEngine";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const DEFAULT_PROFILE: WorkspaceProfile = {
  industry: "agencies_professional",
  niche: null,
  archetype: "retainers",
  zoomTier: "z2",
  legacyProfileType: "consultative_sales",
  legacyIndustryValue: "",
  metadata: { revenueModel: "retainer", salesCycle: "medium", ticketSize: "medium", complexityLevel: "medium", complianceLevel: "none" },
};

function IntelCard({ icon: Icon, label, value, sub, delay = 0 }: {
  icon: any; label: string; value: string; sub?: string; delay?: number;
}) {
  return (
    <motion.div
      className="rounded-xl p-4 relative overflow-hidden group"
      style={{
        background: "hsla(211,96%,60%,.04)",
        border: "1px solid hsla(211,96%,60%,.08)",
      }}
      variants={fadeUp}
      whileHover={{ scale: 1.02, borderColor: "hsla(211,96%,60%,.18)" }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle at 50% 0%, hsla(211,96%,60%,.06) 0%, transparent 70%)" }} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "hsla(211,96%,60%,.08)", border: "1px solid hsla(211,96%,60%,.1)" }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 5, repeat: Infinity, delay }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 68%)" }} />
          </motion.div>
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(210,50%,70%,.4)" }}>{label}</span>
        </div>
        <p className="text-lg font-bold" style={{
          background: "linear-gradient(135deg, hsl(211 96% 72%), hsl(197 88% 58%))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "hsla(210,40%,65%,.4)" }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

function ModuleEmphasisBar({ name, priority }: { name: string; priority: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] w-20 shrink-0" style={{ color: "hsla(210,40%,70%,.5)" }}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(211,96%,60%,.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: priority >= 4
              ? "linear-gradient(90deg, hsl(211 96% 58%), hsl(197 88% 55%))"
              : "hsla(211,96%,60%,.3)",
          }}
          initial={{ width: 0 }}
          whileInView={{ width: `${(priority / 5) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-[9px] font-bold tabular-nums w-4 text-right" style={{ color: "hsla(211,96%,65%,.4)" }}>{priority}</span>
    </div>
  );
}

interface Props {
  clientId: string;
  /** Pass profile directly (admin preview) or let component fetch it */
  profile?: WorkspaceProfile;
}

export function BusinessIntelligencePreview({ clientId, profile: externalProfile }: Props) {
  const [profile, setProfile] = useState<WorkspaceProfile | null>(externalProfile ?? null);

  useEffect(() => {
    if (externalProfile) { setProfile(externalProfile); return; }
    supabase
      .from("workspace_profiles")
      .select("profile_type, config_overrides")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setProfile(DEFAULT_PROFILE); return; }
        const ov = (data.config_overrides && typeof data.config_overrides === "object" && !Array.isArray(data.config_overrides))
          ? data.config_overrides as Record<string, any> : {};
        setProfile({
          industry: ov.industry || DEFAULT_PROFILE.industry,
          niche: ov.niche || null,
          archetype: ov.archetype || DEFAULT_PROFILE.archetype,
          zoomTier: ov.zoomTier || DEFAULT_PROFILE.zoomTier,
          legacyProfileType: (data as any).profile_type || "",
          legacyIndustryValue: ov.legacyIndustryValue || "",
          metadata: ov.metadata || DEFAULT_PROFILE.metadata,
        });
      });
  }, [clientId, externalProfile]);

  const intel: ClientIntelligenceOutput | null = useMemo(() => {
    if (!profile) return null;
    return generateClientIntelligence(profile);
  }, [profile]);

  if (!intel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-3.5 w-3.5" style={{ color: "hsla(211,96%,68%,.4)" }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "hsla(210,50%,70%,.4)" }}>
          Business Intelligence
        </span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, hsla(211,96%,60%,.12), transparent)" }} />
        <div className="flex items-center gap-1.5">
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(211 96% 62%)" }}
            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(211,96%,62%,.35)" }}>
            Analyzing
          </span>
        </div>
      </div>

      {/* Intelligence cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <IntelCard icon={TrendingUp} label="Revenue Opportunity" value={intel.revenueOpportunity} sub="Identified potential" delay={0} />
        <IntelCard icon={BarChart3} label="Growth Potential" value={`${intel.growthPotentialPct}%`} sub="Based on your profile" delay={0.5} />
        <IntelCard icon={Zap} label="Automations" value={String(intel.automationsSuggested)} sub="Recommended" delay={1} />
        <IntelCard icon={Brain} label="Insights Detected" value={String(intel.insightsGenerated)} sub="AI-identified" delay={1.5} />
        <IntelCard icon={Gauge} label="Complexity" value={intel.businessComplexityLabel} sub="System level" delay={2} />
        <IntelCard icon={Shield} label="Compliance" value={intel.complianceSensitivityLabel} sub="Sensitivity" delay={2.5} />
      </motion.div>

      {/* Module emphasis */}
      <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,60%,.03)", border: "1px solid hsla(211,96%,60%,.06)" }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "hsla(210,50%,70%,.35)" }}>
          Module Emphasis
        </p>
        <div className="space-y-2">
          {Object.entries(intel.moduleEmphasis)
            .sort(([, a], [, b]) => b - a)
            .map(([mod, priority]) => (
              <ModuleEmphasisBar key={mod} name={mod} priority={priority} />
            ))}
        </div>
      </div>

      {/* Estimate label */}
      <p className="text-center text-[9px] mt-3 font-medium uppercase tracking-[0.12em]" style={{ color: "hsla(211,96%,60%,.25)" }}>
        {intel.estimateLabel}
      </p>
    </motion.div>
  );
}
