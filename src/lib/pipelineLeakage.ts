// ─────────────────────────────────────────────────────────────────
// Shared pipeline leakage detection.
// Both AI Insights (narrative bullets) and Growth Advisor ("Fix What's
// Leaking") read from this single detection function so the thresholds
// and wording never drift between the two pages.
// ─────────────────────────────────────────────────────────────────

import { LOST_REASONS, toCanonStage } from "@/lib/pipelineRevenue";

export type LeakageType =
  | "stage_bottleneck"
  | "aging_deals"
  | "loss_reason"
  | "close_rate_decline"
  | "low_show_up_rate";

export interface LeakageFlag {
  type: LeakageType;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface TakeawayDeal {
  pipeline_stage: string | null;
  deal_value: number | null;
  created_at: string | null;
  updated_at: string | null;
  lost_reason: string | null;
}

const DAY_MS = 86_400_000;

function lostReasonLabel(raw: string): string {
  const found = LOST_REASONS.find((r) => r.value === raw);
  return found ? found.label.toLowerCase() : raw.replace(/_/g, " ").toLowerCase();
}

export function detectLeakage({
  deals,
  appointments,
}: {
  deals: TakeawayDeal[];
  appointments?: { status: string }[];
}): LeakageFlag[] {
  const out: LeakageFlag[] = [];

  if (deals.length > 0) {
    const canon = deals.map((d) => ({ ...d, stage: toCanonStage(d.pipeline_stage) }));
    const count = (s: string) => canon.filter((d) => d.stage === s).length;
    const cold = count("cold");
    const warm = count("warm");
    const hot = count("hot");
    const won = count("won");
    const lost = count("lost");

    // 1. Biggest stage-to-stage drop-off.
    const transitions = [
      {
        label: "Cold to Warm",
        from: cold + warm + hot + won,
        to: warm + hot + won,
        note: "leads aren't converting into booked conversations",
      },
      {
        label: "Warm to Hot",
        from: warm + hot + won,
        to: hot + won,
        note: "most deals are stalling after the first meeting",
      },
      {
        label: "Hot to Won",
        from: hot + won,
        to: won,
        note: "deals are reaching the finish line but not closing",
      },
    ].filter((t) => t.from >= 3);

    if (transitions.length > 0) {
      const worst = transitions.reduce((a, b) => (b.to / b.from < a.to / a.from ? b : a));
      const pct = Math.round((worst.to / worst.from) * 100);
      out.push({
        type: "stage_bottleneck",
        severity: pct < 25 ? "high" : pct < 50 ? "medium" : "low",
        message: `${worst.label} is your biggest drop-off at only ${pct}% — ${worst.note}.`,
      });
    }

    // 2. Aging / stuck open deals.
    const now = Date.now();
    const open = canon.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const aging = open
      .map((d) => ({
        d,
        days: Math.floor(
          (now - new Date(d.updated_at || d.created_at || Date.now()).getTime()) / DAY_MS
        ),
      }))
      .filter((x) => x.days >= 21)
      .sort((a, b) => b.days - a.days);
    if (aging.length > 0) {
      const oldest = aging[0].days;
      out.push({
        type: "aging_deals",
        severity: oldest >= 60 ? "high" : oldest >= 35 ? "medium" : "low",
        message: `${aging.length} open deal${aging.length === 1 ? " has" : "s have"} not moved in over three weeks — the oldest has been sitting untouched for ${oldest} days. Reach out or close them out so your pipeline reflects reality.`,
      });
    }

    // 3. Top recurring loss reason.
    if (lost > 0) {
      const tally = new Map<string, number>();
      canon
        .filter((d) => d.stage === "lost" && d.lost_reason)
        .forEach((d) =>
          tally.set(d.lost_reason as string, (tally.get(d.lost_reason as string) ?? 0) + 1)
        );
      if (tally.size > 0) {
        const [reason, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
        out.push({
          type: "loss_reason",
          severity: n / lost >= 0.5 ? "high" : "medium",
          message: `${lostReasonLabel(reason)} is the reason you lose most often — ${n} of ${lost} lost deal${lost === 1 ? "" : "s"} ended there. Worth addressing it earlier in the conversation.`,
        });
      }
    }

    // 4. Close-rate trend vs the prior period (needs enough closed history).
    const closedIn = (startDaysAgo: number, endDaysAgo: number) =>
      canon.filter((d) => {
        if (d.stage !== "won" && d.stage !== "lost") return false;
        const t = new Date(d.updated_at || d.created_at || 0).getTime();
        if (!t) return false;
        const age = (now - t) / DAY_MS;
        return age >= endDaysAgo && age < startDaysAgo;
      });
    const recent = closedIn(30, 0);
    const prior = closedIn(60, 30);
    if (recent.length >= 3 && prior.length >= 3) {
      const rate = (arr: typeof recent) =>
        (arr.filter((d) => d.stage === "won").length / arr.length) * 100;
      const r = Math.round(rate(recent));
      const p = Math.round(rate(prior));
      const diff = r - p;
      if (Math.abs(diff) >= 3) {
        out.push({
          type: "close_rate_decline",
          severity: diff > 0 ? "low" : diff <= -10 ? "high" : "medium",
          message:
            diff > 0
              ? `Your close rate is trending up — ${r}% over the last 30 days versus ${p}% the month before. Whatever changed recently is working.`
              : `Your close rate slipped to ${r}% over the last 30 days, down from ${p}% the month before. Worth reviewing what changed.`,
        });
      } else {
        out.push({
          type: "close_rate_decline",
          severity: "low",
          message: `Your close rate is holding steady at about ${r}% month over month.`,
        });
      }
    }
  }

  // 5. Show-up rate — only when there's enough real appointment history.
  if (appointments && appointments.length > 0) {
    const decided = appointments.filter(
      (a) => a.status === "completed" || a.status === "no_show"
    );
    if (decided.length >= 5) {
      const noShows = decided.filter((a) => a.status === "no_show").length;
      const showUp = ((decided.length - noShows) / decided.length) * 100;
      if (showUp < 70) {
        out.push({
          type: "low_show_up_rate",
          severity: showUp < 50 ? "high" : "medium",
          message: `Only ${Math.round(showUp)}% of your booked appointments actually happen — ${noShows} of ${decided.length} were no-shows. Every missed meeting is a paid-for lead that never got a conversation.`,
        });
      }
    }
  }

  return out;
}

export const LEAKAGE_FIXES: Record<
  LeakageType,
  { title: string; description: string; caveat?: string }[]
> = {
  stage_bottleneck: [
    {
      title: "Tighten follow-up cadence at that stage",
      description:
        "Queue every deal sitting at the leaking stage in the Follow-Up Queue so nobody waits on a reply that never comes.",
    },
    {
      title: "Revisit the pitch or offer at that stage",
      description:
        "If people consistently stop here, what they're hearing at this point isn't landing. Rewrite that part of the conversation and test it on the next ten deals.",
    },
    {
      title: "Set a stage-specific check-in cadence",
      description:
        "Decide how often a deal at this stage gets touched — for example every three days — and hold to it rather than following up ad hoc.",
    },
  ],
  aging_deals: [
    {
      title: "Review and close out stale deals",
      description:
        "Work through the Pipeline board and mark the dead ones lost. A clean pipeline gives you honest numbers to plan against.",
    },
    {
      title: "Add a Follow-Up Queue task per stale deal",
      description:
        "Give each deal that's still alive one concrete next action with a date, rather than leaving it open indefinitely.",
    },
    {
      title: "Set a personal touch-every-N-days goal",
      description:
        "Pick a maximum age you'll tolerate on an open deal — say 14 days — and sweep the board against it once a week.",
    },
  ],
  loss_reason: [
    {
      title: "Address the objection directly in the conversation",
      description:
        "Bring it up yourself before the prospect does, early enough that it doesn't become the reason things quietly end.",
    },
    {
      title: "Review lost deals weekly for the pattern",
      description:
        "Use the Pipeline board's Lost view once a week and look for what the losses have in common beyond the tagged reason.",
    },
    {
      title: "Adjust pricing/offer or add objection-handling material",
      description:
        "If the reason is price or a competitor, either the offer needs to change or you need a prepared answer that holds up. Guessing between the two is what keeps the pattern going.",
    },
  ],
  close_rate_decline: [
    {
      title: "Review recent lost deals for a common thread",
      description:
        "Pull the deals lost in the last 30 days and read them together — a drop usually traces back to one repeated cause.",
    },
    {
      title: "Get coaching or a call review for recent reps",
      description:
        "Listen back to or sit in on a handful of recent conversations. Delivery drifts faster than anyone notices from a dashboard.",
    },
    {
      title: "Compare volume vs. quality mix",
      description:
        "A falling close rate with rising deal count often means lead quality changed, not that selling got worse. Check both before changing the pitch.",
    },
  ],
  low_show_up_rate: [
    {
      title: "Tighten appointment reminder cadence",
      description:
        "Set the reminder schedule on the calendar — a confirmation at booking plus a reminder 24 hours and 1 hour before.",
      caveat:
        "Automated reminder delivery isn't live yet. Configure it now and it's ready the moment sending is turned on.",
    },
    {
      title: "Capture a reason every time an appointment is marked no-show",
      description:
        "A short note each time builds the picture — wrong time, wrong person, cold lead — so you can fix the actual cause.",
    },
    {
      title: "Add a manual same-day confirmation touch",
      description:
        "A quick call or text the morning of the meeting. This works today and doesn't depend on the reminder system.",
    },
  ],
};
