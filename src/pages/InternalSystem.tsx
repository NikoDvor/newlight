import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Target, Handshake, Rocket, Cog, Heart, ArrowRight, Pencil, Map, BookOpen, CheckCircle2, CircleDashed, AlertTriangle,
} from "lucide-react";

type Status = "active" | "draft" | "needs_update";

interface Stage {
  key: string;
  title: string;
  icon: any;
  tools: string[];
  inputs: string[];
  outputs: string[];
  owner: string;
  status: Status;
  steps: string[];
  accent: string;
}

const INITIAL_STAGES: Stage[] = [
  {
    key: "lead_gen",
    title: "Lead Generation",
    icon: Target,
    tools: ["SEO", "Paid Ads", "Social"],
    inputs: ["Market signals", "Ad spend"],
    outputs: ["New leads → CRM"],
    owner: "Marketing",
    status: "draft",
    steps: ["Define ICP", "Launch channels", "Capture leads"],
    accent: "from-sky-500/20 to-blue-500/5",
  },
  {
    key: "sales",
    title: "Sales",
    icon: Handshake,
    tools: ["CRM", "Calendar", "Proposals"],
    inputs: ["Qualified leads"],
    outputs: ["Closed deals → Onboarding"],
    owner: "Sales",
    status: "draft",
    steps: ["Qualify", "Demo", "Proposal", "Close"],
    accent: "from-violet-500/20 to-purple-500/5",
  },
  {
    key: "onboarding",
    title: "Onboarding",
    icon: Rocket,
    tools: ["Setup Portal", "Forms", "Intake"],
    inputs: ["Won deals", "Client data"],
    outputs: ["Activated account → Fulfillment"],
    owner: "Success",
    status: "draft",
    steps: ["Kickoff", "Collect assets", "Configure", "Launch"],
    accent: "from-emerald-500/20 to-teal-500/5",
  },
  {
    key: "fulfillment",
    title: "Fulfillment",
    icon: Cog,
    tools: ["Workforce", "Automations", "Calendar"],
    inputs: ["Live accounts", "Service requests"],
    outputs: ["Delivered work → Retention"],
    owner: "Operations",
    status: "draft",
    steps: ["Assign", "Execute", "Review", "Deliver"],
    accent: "from-amber-500/20 to-orange-500/5",
  },
  {
    key: "retention",
    title: "Retention",
    icon: Heart,
    tools: ["Reviews", "Reactivation", "Reporting"],
    inputs: ["Active clients", "Usage data"],
    outputs: ["Renewals & referrals"],
    owner: "Success",
    status: "draft",
    steps: ["Check-ins", "QBRs", "Reactivation", "Referrals"],
    accent: "from-rose-500/20 to-pink-500/5",
  },
];

const STATUS_META: Record<Status, { label: string; icon: any; cls: string }> = {
  active: { label: "Active", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  draft: { label: "Draft", icon: CircleDashed, cls: "bg-white/10 text-white/60 border-white/20" },
  needs_update: { label: "Needs Update", icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>
      <m.icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

export default function InternalSystem() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [tab, setTab] = useState<"map" | "sop">("map");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Stage | null>(null);

  const saveEdit = (updated: Stage) => {
    setStages((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Internal System"
        description="Your operating backbone — a visual map of how the business runs, with SOPs for every stage."
      />

      <div className="flex items-center gap-2 border-b border-white/10">
        <button
          onClick={() => setTab("map")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "map" ? "border-primary text-white" : "border-transparent text-white/50 hover:text-white/80"
          }`}
        >
          <Map className="h-4 w-4" /> System Map
        </button>
        <button
          onClick={() => setTab("sop")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "sop" ? "border-primary text-white" : "border-transparent text-white/50 hover:text-white/80"
          }`}
        >
          <BookOpen className="h-4 w-4" /> SOP Center
        </button>
      </div>

      {tab === "map" && (
        <SystemMap stages={stages} expanded={expanded} setExpanded={setExpanded} />
      )}

      {tab === "sop" && (
        <SOPCenter stages={stages} onEdit={setEditing} />
      )}

      <EditStageDialog stage={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
    </div>
  );
}

function SystemMap({
  stages, expanded, setExpanded,
}: { stages: Stage[]; expanded: string | null; setExpanded: (k: string | null) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 overflow-x-auto">
      <div className="flex items-stretch gap-3 min-w-max pb-2">
        {stages.map((s, idx) => {
          const isOpen = expanded === s.key;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-stretch gap-3">
              <button
                onClick={() => setExpanded(isOpen ? null : s.key)}
                className={`group relative text-left w-[260px] rounded-2xl border border-white/10 bg-gradient-to-br ${s.accent} p-4 hover:border-white/25 transition-all hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <StatusPill status={s.status} />
                </div>
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-[11px] text-white/50 mt-0.5">Owner: {s.owner}</p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {s.tools.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] border-white/15 text-white/70 bg-white/5">
                      {t}
                    </Badge>
                  ))}
                </div>

                {isOpen && (
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2 text-[11px]">
                    <div>
                      <div className="text-white/40 uppercase tracking-wider text-[9px] mb-1">Inputs</div>
                      <ul className="text-white/70 space-y-0.5">
                        {s.inputs.map((i) => <li key={i}>• {i}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-white/40 uppercase tracking-wider text-[9px] mb-1">Outputs</div>
                      <ul className="text-white/70 space-y-0.5">
                        {s.outputs.map((o) => <li key={o}>• {o}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-white/40 uppercase tracking-wider text-[9px] mb-1">All Tools</div>
                      <div className="flex flex-wrap gap-1">
                        {s.tools.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] border-white/15 text-white/70 bg-white/5">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </button>

              {idx < stages.length - 1 && (
                <div className="flex items-center">
                  <ArrowRight className="h-4 w-4 text-white/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-white/40 mt-4">Click any node to expand its data flow and active tools.</p>
    </div>
  );
}

function SOPCenter({ stages, onEdit }: { stages: Stage[]; onEdit: (s: Stage) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {stages.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.key}
            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${s.accent} p-5 flex flex-col`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white">{s.title} SOP</h3>
              </div>
              <StatusPill status={s.status} />
            </div>

            <div className="text-[11px] text-white/50 mb-3">
              <span className="text-white/40">Owner:</span> <span className="text-white/80">{s.owner}</span>
            </div>

            <div className="space-y-2 mb-4 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Process Steps</div>
              <ol className="space-y-1">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/75">
                    <span className="h-4 w-4 shrink-0 rounded-full bg-white/10 text-[10px] flex items-center justify-center text-white/60 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Tools</div>
              <div className="flex flex-wrap gap-1">
                {s.tools.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] border-white/15 text-white/70 bg-white/5">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(s)}
              className="w-full bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Pencil className="h-3 w-3 mr-1.5" />
              Edit SOP
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function EditStageDialog({
  stage, onClose, onSave,
}: { stage: Stage | null; onClose: () => void; onSave: (s: Stage) => void }) {
  const [draft, setDraft] = useState<Stage | null>(null);

  if (stage && (!draft || draft.key !== stage.key)) {
    setDraft({ ...stage });
  }
  if (!stage || !draft) return null;

  return (
    <Dialog open={!!stage} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {stage.title} SOP</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Owner</label>
            <Input
              value={draft.owner}
              onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Status</label>
            <div className="flex gap-2">
              {(Object.keys(STATUS_META) as Status[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setDraft({ ...draft, status: st })}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    draft.status === st ? STATUS_META[st].cls : "border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  {STATUS_META[st].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Process Steps (one per line)</label>
            <Textarea
              rows={5}
              value={draft.steps.join("\n")}
              onChange={(e) => setDraft({ ...draft, steps: e.target.value.split("\n").filter(Boolean) })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Tools (comma separated)</label>
            <Input
              value={draft.tools.join(", ")}
              onChange={(e) => setDraft({ ...draft, tools: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(draft)}>Save SOP</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
