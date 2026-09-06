import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, CreditCard, Mail, ShieldAlert, ClipboardList,
} from "lucide-react";

/**
 * Client-scoped onboarding progress hero.
 * Bucket rules are ported (read-only) from AdminOnboardingCommandCenter's
 * classifyClient()/getNextBestAction() so admin + client views agree on status.
 * Admin files are intentionally untouched.
 */

export interface SetupHeroClient {
  business_name?: string | null;
  payment_status?: string | null;
  portal_access_enabled?: boolean | null;
  portal_invite_status?: string | null;
  portal_last_login_at?: string | null;
  implementation_status?: string | null;
}

export interface SetupHeroCategory {
  category: string;
  label: string;
  complete: number;
  total: number;
}

interface Props {
  client: SetupHeroClient | null;
  total: number;
  complete: number;
  needsAttention: number;
  overdue: number;
  blocked: number;
  categories: SetupHeroCategory[];
}

type Tone = "critical" | "warning" | "info" | "good";

const TONE: Record<Tone, { ring: string; text: string; bg: string; border: string }> = {
  critical: { ring: "0 72% 58%", text: "hsl(0 72% 66%)", bg: "hsla(0,72%,58%,.09)", border: "hsla(0,72%,58%,.28)" },
  warning: { ring: "38 92% 56%", text: "hsl(38 92% 62%)", bg: "hsla(38,92%,56%,.09)", border: "hsla(38,92%,56%,.28)" },
  info: { ring: "var(--nl-sky)", text: "hsl(var(--nl-sky))", bg: "hsla(197,92%,68%,.08)", border: "hsla(197,92%,68%,.24)" },
  good: { ring: "160 64% 46%", text: "hsl(160 64% 54%)", bg: "hsla(160,64%,46%,.09)", border: "hsla(160,64%,46%,.26)" },
};

function statusStatement(p: Props): { tone: Tone; icon: any; headline: string; detail: string } {
  const { client: c, total, complete, needsAttention, overdue, blocked } = p;

  // awaiting_payment
  if (c?.payment_status !== "paid")
    return {
      tone: "warning", icon: CreditCard,
      headline: "We're waiting on your payment to get started",
      detail: "Once payment clears, your setup checklist opens up and our team begins building your workspace.",
    };

  // impl_blocked
  if (blocked > 0 || c?.implementation_status === "waiting_on_client")
    return {
      tone: "critical", icon: ShieldAlert,
      headline: blocked > 0
        ? `${blocked} ${blocked === 1 ? "item is" : "items are"} stuck and can't move forward`
        : "Your build is paused until we hear back from you",
      detail: "Your team has left a note on each one explaining what's needed. Scroll down to see them.",
    };

  // overdue
  if (overdue > 0)
    return {
      tone: "critical", icon: AlertTriangle,
      headline: `${overdue} ${overdue === 1 ? "item is" : "items are"} past due`,
      detail: "These are holding up the rest of your setup — sending them over is the fastest way to move things along.",
    };

  // client_action
  if (needsAttention > 0)
    return {
      tone: "warning", icon: ClipboardList,
      headline: `${needsAttention} ${needsAttention === 1 ? "item needs" : "items need"} your attention`,
      detail: "Everything else is with our team. Fill these in and we'll take it from there.",
    };

  // portal_not_sent / invite_no_login (informational for the client)
  if (c?.portal_invite_status === "sent" && !c?.portal_last_login_at)
    return {
      tone: "info", icon: Mail,
      headline: "Your setup portal is open and ready",
      detail: "Work through the checklist below whenever you're ready — you can save and come back anytime.",
    };

  if (total > 0 && complete >= total)
    return {
      tone: "good", icon: CheckCircle2,
      headline: "Everything's in — your build is underway",
      detail: "Our team is reviewing what you sent and configuring your workspace. We'll reach out if anything's unclear.",
    };

  return {
    tone: "good", icon: Clock,
    headline: "You're on track — nothing needs you right now",
    detail: "Our team is working through the remaining setup. We'll let you know the moment we need something.",
  };
}

function Ring({ pct, tone, complete, total }: { pct: number; tone: Tone; complete: number; total: number }) {
  const R = 82;
  const C = 2 * Math.PI * R;
  const stroke = TONE[tone].ring;
  return (
    <div className="relative h-[200px] w-[200px] shrink-0">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="setupRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${stroke})`} />
            <stop offset="100%" stopColor="hsl(var(--nl-electric))" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" stroke="hsl(var(--muted-foreground) / 0.14)" />
        <motion.circle
          cx="100" cy="100" r={R} fill="none" strokeWidth="12" strokeLinecap="round"
          stroke="url(#setupRingGrad)"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * pct) / 100 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">{pct}%</span>
        <span className="mt-1 text-xs text-muted-foreground">{complete} of {total} complete</span>
      </div>
    </div>
  );
}

export function SetupProgressHero(props: Props) {
  const { total, complete, categories } = props;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
  const state = useMemo(() => statusStatement(props), [props]);
  const tone = TONE[state.tone];
  const Icon = state.icon;

  const ranked = useMemo(
    () =>
      categories
        .filter(c => c.total > 0)
        .map(c => ({ ...c, pct: Math.round((c.complete / c.total) * 100) }))
        .sort((a, b) => b.pct - a.pct || b.total - a.total),
    [categories]
  );

  return (
    <section
      className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
      style={{
        borderColor: "hsla(197,92%,68%,.14)",
        background:
          "radial-gradient(120% 140% at 12% 0%, hsla(217,90%,62%,.14) 0%, transparent 58%), hsl(var(--card))",
      }}
    >
      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center">
        <Ring pct={pct} tone={state.tone} complete={complete} total={total} />

        <div className="min-w-0 flex-1 space-y-4 text-center lg:text-left">
          <div>
            <h2 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
              {props.client?.business_name ? `${props.client.business_name}'s onboarding` : "Your onboarding"}
            </h2>
          </div>

          <div
            className="rounded-xl border p-4 text-left"
            style={{ background: tone.bg, borderColor: tone.border }}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: tone.text }} />
              <div className="min-w-0">
                <p className="text-base font-semibold leading-snug" style={{ color: tone.text }}>
                  {state.headline}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{state.detail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {ranked.length > 0 && (
        <div className="mt-8 border-t pt-6" style={{ borderColor: "hsla(197,92%,68%,.1)" }}>
          <p className="mb-4 text-sm font-medium text-foreground">Where things stand, area by area</p>
          <div className="space-y-2.5">
            {ranked.map(c => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-muted-foreground sm:w-36">{c.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted-foreground/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${c.pct}%`,
                      background:
                        c.pct === 100
                          ? "hsl(160 64% 46%)"
                          : "linear-gradient(90deg, hsl(var(--nl-electric)), hsl(var(--nl-sky)))",
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {c.complete}/{c.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
