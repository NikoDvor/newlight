import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { mockLeads, STAGE_ORDER, type Lead, type LeadStage } from "@/lib/salesData";
import { StatusChip } from "@/components/StatusChip";
import { User, Building2, Tag, ArrowRight, GripVertical } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STAGE_COLORS: Record<LeadStage, string> = {
  "New Lead": "border-t-blue-400",
  Contacted: "border-t-sky-400",
  "Proposal Booked": "border-t-amber-400",
  "Proposal Sent": "border-t-violet-400",
  Won: "border-t-emerald-400",
  Lost: "border-t-red-400",
};

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const grouped = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

  const handleDragStart = (id: string) => setDragging(id);
  const handleDrop = (stage: LeadStage) => {
    if (!dragging) return;
    setLeads((prev) => prev.map((l) => (l.id === dragging ? { ...l, stage } : l)));
    setDragging(null);
  };

  const moveToStage = (id: string, stage: LeadStage) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    setSelectedLead((prev) => (prev?.id === id ? { ...prev, stage } : prev));
  };

  return (
    <div>
      <PageHeader title="Pipeline" description="Drag leads between stages to update their status" />

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {STAGE_ORDER.map((stage) => (
          <div
            key={stage}
            className="min-w-[260px] flex-1 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage)}
          >
            <div className={`rounded-xl border border-border bg-card ${STAGE_COLORS[stage]} border-t-2`}>
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <h3 className="text-sm font-semibold">{stage}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">{grouped[stage].length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {grouped[stage].map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className="card-widget card-widget-clickable cursor-pointer p-3 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {lead.company}
                        </p>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lead.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{lead.source}</span>
                      <span className="text-xs font-medium tabular-nums">{lead.value}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{lead.owner}</span>
                    </div>
                    <p className="text-[11px] text-accent mt-1">→ {lead.nextTask}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lead Detail Drawer */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
                <SheetDescription>{selectedLead.company}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusChip status={selectedLead.workflowStatus} />
                  {selectedLead.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="metric-label">Email</p>
                    <p className="text-sm mt-1">{selectedLead.email}</p>
                  </div>
                  <div>
                    <p className="metric-label">Phone</p>
                    <p className="text-sm mt-1">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <p className="metric-label">Source</p>
                    <p className="text-sm mt-1">{selectedLead.source}</p>
                  </div>
                  <div>
                    <p className="metric-label">Value</p>
                    <p className="text-sm font-semibold mt-1 tabular-nums">{selectedLead.value}</p>
                  </div>
                  <div>
                    <p className="metric-label">Owner</p>
                    <p className="text-sm mt-1">{selectedLead.owner}</p>
                  </div>
                  <div>
                    <p className="metric-label">Next Task</p>
                    <p className="text-sm mt-1 text-accent">{selectedLead.nextTask}</p>
                  </div>
                </div>

                <div>
                  <p className="metric-label mb-2">Move to Stage</p>
                  <Select value={selectedLead.stage} onValueChange={(v) => moveToStage(selectedLead.id, v as LeadStage)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="metric-label mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedLead.notes}</p>
                </div>

                <div>
                  <p className="metric-label mb-2">Add Note</p>
                  <Textarea placeholder="Write a note…" className="min-h-[80px]" />
                  <Button size="sm" className="mt-2">Save Note</Button>
                </div>

                <div>
                  <p className="section-title mb-3">Timeline Activity</p>
                  <div className="space-y-3">
                    {[
                      { text: "Lead created from website inquiry", time: "Mar 1, 2026" },
                      { text: "Assigned to " + selectedLead.owner, time: "Mar 1, 2026" },
                      { text: "Initial outreach email sent", time: "Mar 2, 2026" },
                      { text: `Status changed to ${selectedLead.stage}`, time: "Mar 5, 2026" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm">{item.text}</p>
                          <p className="text-xs text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => moveToStage(selectedLead.id, "Won")}>
                    Mark Won
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => moveToStage(selectedLead.id, "Lost")}>
                    Mark Lost
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
