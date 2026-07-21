import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

type Kind = "close-prep" | "pay-sign";

type LeadRow = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  pipeline_stage: string | null;
  status: string | null;
  crm_deal_id: string | null;
};

async function fetchEligible(userId: string, kind: Kind): Promise<LeadRow[]> {
  let q = (supabase as any)
    .from("nl_bdr_leads")
    .select("id,business_name,contact_name,pipeline_stage,status,crm_deal_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (kind === "close-prep") {
    q = q.in("pipeline_stage", ["hot", "won"]);
  } else {
    q = q.not("crm_deal_id", "is", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as LeadRow[];
}

export function FormLeadPickerCard({
  kind,
  name,
  badge,
  description,
  icon: Icon,
}: {
  kind: Kind;
  name: string;
  badge: string;
  description: string;
  icon: LucideIcon;
}) {
  const { user } = useWorkspace();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<LeadRow[]>([]);

  const routeFor = (lead: LeadRow) =>
    kind === "close-prep"
      ? `/employee/close-prep/${lead.id}`
      : `/employee/pay-sign/${lead.crm_deal_id}`;

  const emptyMsg =
    kind === "close-prep"
      ? "No hot leads yet — mark a lead Hot in My Leads first."
      : "No deals ready yet — complete Close Prep first.";

  const handleOpen = async () => {
    if (!user?.id) {
      toast.error("Please sign in first.");
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchEligible(user.id, kind);
      if (rows.length === 0) {
        toast.message(emptyMsg);
      } else if (rows.length === 1) {
        navigate(routeFor(rows[0]));
      } else {
        setChoices(rows);
        setOpen(true);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-2 py-0.5 mb-2">
              {badge}
            </span>
            <p className="text-sm font-semibold text-foreground">{name}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 mb-3 flex-1">{description}</p>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          onClick={handleOpen}
          disabled={loading}
        >
          {loading ? "Loading…" : <>Open <ArrowRight className="h-3.5 w-3.5" /></>}
        </Button>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {kind === "close-prep" ? "Pick a lead for Close Prep" : "Pick a deal for Pay & Sign"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {choices.map((lead) => (
              <button
                key={lead.id}
                onClick={() => {
                  setOpen(false);
                  navigate(routeFor(lead));
                }}
                className="text-left rounded-lg border border-border/60 bg-card/70 hover:bg-primary/10 hover:border-primary/40 transition-colors p-3"
              >
                <p className="text-sm font-semibold text-foreground truncate">
                  {lead.business_name || "(no business name)"}
                </p>
                {lead.contact_name && (
                  <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>
                )}
                <p className="text-[10px] uppercase tracking-wide text-primary mt-1">
                  {lead.pipeline_stage || lead.status || "—"}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
