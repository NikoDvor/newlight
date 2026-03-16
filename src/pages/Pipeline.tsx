import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SetupBanner } from "@/components/SetupBanner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { onDealStageChanged } from "@/lib/crmAutomations";
import { Building2, GripVertical, Briefcase, Plus, DollarSign } from "lucide-react";

const STAGES = [
  { key: "new_lead", label: "New Lead", color: "border-t-blue-400" },
  { key: "contacted", label: "Contacted", color: "border-t-cyan-400" },
  { key: "qualified", label: "Qualified", color: "border-t-emerald-400" },
  { key: "appointment_booked", label: "Appt Booked", color: "border-t-violet-400" },
  { key: "proposal_sent", label: "Proposal Sent", color: "border-t-amber-400" },
  { key: "negotiation", label: "Negotiation", color: "border-t-orange-400" },
  { key: "closed_won", label: "Won", color: "border-t-green-400" },
  { key: "closed_lost", label: "Lost", color: "border-t-red-400" },
];

export default function Pipeline() {
  const navigate = useNavigate();
  const { activeClientId } = useWorkspace();
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      supabase.from("crm_deals").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_contacts").select("id, full_name, email, phone").eq("client_id", activeClientId).limit(500),
    ]);
    setDeals(dRes.data || []);
    setContacts(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const getContactName = (id: string) => contacts.find(c => c.id === id)?.full_name || "Unlinked";

  const moveDealStage = async (dealId: string, stage: string) => {
    const deal = deals.find(d => d.id === dealId);
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, pipeline_stage: stage } : d));
    setSelectedDeal((prev: any) => prev?.id === dealId ? { ...prev, pipeline_stage: stage } : prev);
    await supabase.from("crm_deals").update({ pipeline_stage: stage }).eq("id", dealId);
    if (deal) await onDealStageChanged(activeClientId!, dealId, stage, deal, contacts);
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Pipeline" description="Drag deals between stages to update their status" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Pipeline.</p>
        </div>
      </div>
    );
  }

  const totalPipeline = deals.filter(d => !["closed_won", "closed_lost"].includes(d.pipeline_stage)).reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

  return (
    <div>
      <PageHeader title="Pipeline" description="Drag deals between stages to update their status">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Open Pipeline</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: "hsl(197 92% 48%)" }}>${totalPipeline.toLocaleString()}</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/crm")}>
            <Plus className="h-4 w-4" /> Add Deal
          </Button>
        </div>
      </PageHeader>

      {deals.length === 0 && (
        <SetupBanner icon={Briefcase} title="Create Your First Deal"
          description="Add deals to your pipeline to start tracking revenue opportunities visually."
          actionLabel="Go to CRM" onAction={() => navigate("/crm")} />
      )}

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
        {STAGES.map(({ key, label, color }) => {
          const stageDeals = deals.filter(d => d.pipeline_stage === key);
          const stageValue = stageDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
          return (
            <div key={key} className="min-w-[230px] flex-1 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const id = e.dataTransfer.getData("dealId"); if (id) moveDealStage(id, key); }}>
              <div className={`rounded-xl border border-border bg-card ${color} border-t-2`}>
                <div className="px-3 py-2.5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold">{label}</h3>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{stageDeals.length}</span>
                  </div>
                  <p className="text-[10px] tabular-nums mt-0.5" style={{ color: "hsl(197 92% 48%)" }}>${stageValue.toLocaleString()}</p>
                </div>
                <div className="p-2 space-y-2 min-h-[180px]">
                  {stageDeals.map(deal => (
                    <div key={deal.id} draggable
                      onDragStart={e => { e.dataTransfer.setData("dealId", deal.id); setDragging(deal.id); }}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => setSelectedDeal(deal)}
                      className="card-widget card-widget-clickable cursor-grab active:cursor-grabbing p-3 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{deal.deal_name}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            {deal.contact_id ? getContactName(deal.contact_id) : "No contact"}
                          </p>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium tabular-nums" style={{ color: "hsl(197 92% 48%)" }}>
                          ${Number(deal.deal_value || 0).toLocaleString()}
                        </span>
                        {deal.close_probability != null && (
                          <span className="text-[10px] text-muted-foreground">{deal.close_probability}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-8">No deals</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Drawer */}
      <Sheet open={!!selectedDeal} onOpenChange={open => !open && setSelectedDeal(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedDeal && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedDeal.deal_name}</SheetTitle>
                <SheetDescription>
                  {selectedDeal.contact_id ? getContactName(selectedDeal.contact_id) : "No linked contact"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Value</p>
                    <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: "hsl(197 92% 48%)" }}>
                      ${Number(selectedDeal.deal_value || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Probability</p>
                    <p className="text-sm mt-1">{selectedDeal.close_probability || 0}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{selectedDeal.status || "open"}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Expected Close</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedDeal.expected_close_date || "—"}</p>
                  </div>
                </div>

                {selectedDeal.contact_id && (
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate(`/crm/contacts/${selectedDeal.contact_id}`)}>
                    View Contact →
                  </Button>
                )}

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">Move to Stage</p>
                  <Select value={selectedDeal.pipeline_stage} onValueChange={v => moveDealStage(selectedDeal.id, v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => moveDealStage(selectedDeal.id, "closed_won")}>Mark Won</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => moveDealStage(selectedDeal.id, "closed_lost")}>Mark Lost</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
