import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Workflow, Target, PhoneCall, BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TrainingContentRenderer } from "@/components/training/TrainingContentRenderer";

export interface PKChapter {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content?: string | null;
  module_id: string;
}

interface Props {
  chapters: PKChapter[];
}

// Maps each "Dive Deeper — X" chapter to a compact summary + icon shown in the overview.
// Content is NOT rewritten — the deep content comes straight from the chapter's own content field.
const OVERVIEW_ITEMS: Array<{
  match: RegExp;
  shortLabel: string;
  oneLiner: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  {
    match: /the offer/i,
    shortLabel: "The Offer",
    oneLiner:
      "We bring service-based businesses ready-to-buy customers — and take on all the risk to do it.",
    icon: Target,
    accent: "from-primary/25 to-primary/5",
  },
  {
    match: /how we do it/i,
    shortLabel: "How We Do It",
    oneLiner:
      "A six-step system: Build System, Ignite Visibility, Launch the Attack, Qualify Leads, Maximize Close Rate, Run the Growth.",
    icon: Workflow,
    accent: "from-[hsl(var(--accent))]/25 to-[hsl(var(--accent))]/5",
  },
  {
    match: /zero risk|guarantee/i,
    shortLabel: "Zero Risk Guarantee",
    oneLiner:
      "We make their initial payment back in 90 days — or we work for free until we do. No specific numeric guarantee, ever.",
    icon: ShieldCheck,
    accent: "from-[hsl(152,60%,50%)]/25 to-[hsl(152,60%,50%)]/5",
  },
  {
    match: /selling points/i,
    shortLabel: "Selling Points",
    oneLiner:
      "Zero-risk 90-day guarantee, one system replacing every scattered tool, AI-powered visibility competitors aren't running, and a free branded demo app for hesitant prospects.",
    icon: Sparkles,
    accent: "from-[hsl(48,96%,60%)]/25 to-[hsl(48,96%,60%)]/5",
  },
  {
    match: /get ahold|get a hold|contact/i,
    shortLabel: "How We Get Ahold of Clients",
    oneLiner:
      "Outbound cold and warm calling to business owners who fit the target profile — the rep is the human outreach layer.",
    icon: PhoneCall,
    accent: "from-[hsl(var(--warning))]/25 to-[hsl(var(--warning))]/5",
  },
];

export function ProductKnowledgeOverview({ chapters }: Props) {
  const sorted = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters]
  );

  const overviewChapter = sorted[0]; // "Product Knowledge — Top-Level Overview"
  const deepChapters = sorted.slice(1);

  // Pair each deep chapter with an overview item by title match
  const pairs = deepChapters.map((chapter) => {
    const meta =
      OVERVIEW_ITEMS.find((item) => item.match.test(chapter.chapter_title)) || {
        shortLabel: chapter.chapter_title.replace(/^Dive Deeper\s*[—-]\s*/i, ""),
        oneLiner: "Open to see the deeper explanation for this topic.",
        icon: BookOpen,
        accent: "from-primary/20 to-primary/5",
        match: /.^/,
      };
    return { chapter, meta };
  });

  return (
    <section className="mb-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background/40 to-background/20 p-4 sm:p-6 shadow-[0_0_40px_hsl(var(--primary)/0.08)]">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
            Quick Overview · Optional Depth
          </Badge>
          <h2 className="text-xl font-semibold text-foreground">Product Knowledge — At a Glance</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            The four things every salesman needs to know cold. Tap "Dive Deeper" on any card to
            expand the full explanation in place.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wider">
          {deepChapters.length} deep-dives available
        </Badge>
      </div>

      {/* Top-level overview chapter rendered first (short prose) */}
      {overviewChapter?.content && (
        <div className="mb-6 rounded-xl border border-primary/15 bg-card/60 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Top-Level Overview
            </h3>
          </div>
          <div className="prose prose-invert max-w-none text-sm">
            <TrainingContentRenderer content={overviewChapter.content} />
          </div>
        </div>
      )}

      {/* Accordion — one item per Dive Deeper chapter */}
      <Accordion type="multiple" className="space-y-3">
        {pairs.map(({ chapter, meta }, idx) => {
          const Icon = meta.icon;
          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
            >
              <AccordionItem
                value={chapter.id}
                className={`rounded-xl border border-primary/20 bg-gradient-to-br ${meta.accent} px-4 sm:px-5 shadow-sm hover:border-primary/40 transition-colors overflow-hidden`}
              >
                <AccordionTrigger className="hover:no-underline py-4 [&[data-state=open]>div>svg.chev]:rotate-180">
                  <div className="flex flex-1 items-start gap-4 text-left">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/60 text-primary shadow-inner">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {meta.shortLabel}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-primary/40 bg-primary/10 text-[10px] font-semibold uppercase tracking-wider text-primary"
                        >
                          Dive Deeper
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {meta.oneLiner}
                      </p>
                    </div>
                  </div>

                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="mt-1 rounded-lg border border-primary/15 bg-background/70 p-4 sm:p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        Chapter {chapter.chapter_number}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">
                        {chapter.chapter_title}
                      </span>
                    </div>
                    <div className="prose prose-invert max-w-none text-sm">
                      <TrainingContentRenderer content={chapter.content || ""} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          );
        })}
      </Accordion>

      {deepChapters.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
          No deep-dive chapters authored yet.
        </div>
      )}
    </section>
  );
}
