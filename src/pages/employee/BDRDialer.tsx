import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ChevronLeft, ChevronRight, Loader2, Check, BookOpen, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  niche: string | null;
}

// Outcome -> objection_type mapping. null objection_type means non-objection outcome.
const OUTCOMES: { label: string; objection: string | null }[] = [
  { label: "Won", objection: null },
  { label: "Lost", objection: null },
  { label: "Gatekeeper", objection: "Gatekeeper" },
  { label: "Not Interested / Don't See the Value", objection: "Not Interested" },
  { label: "Need to Think / Need to Talk to Someone", objection: "Need to Think" },
  { label: "Too Expensive / What's Your Pricing", objection: "Pricing" },
  { label: "Bad Experience / Already Have Someone / In-House Team", objection: "Already Have Someone" },
  { label: "Stacked Objections", objection: "Stacked Objections" },
];

export default function BDRDialer() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id, business_name, owner_name, phone, city, niche")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    })();
  }, []);

  const lead = leads[index];
  const outcomeDef = useMemo(() => OUTCOMES.find(o => o.label === outcome), [outcome]);

  const goto = (delta: number) => {
    setOutcome("");
    setIndex(i => Math.max(0, Math.min(leads.length - 1, i + delta)));
  };

  const handleSubmit = useCallback(async () => {
    if (!lead || !outcomeDef || !userId) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("bdr_call_outcomes").insert({
        bdr_user_id: userId,
        lead_id: lead.id,
        outcome: outcomeDef.label,
        objection_type: outcomeDef.objection,
      });
      if (error) throw error;

      // Threshold check for in-app unlock notification
      if (outcomeDef.objection) {
        const { count } = await (supabase as any)
          .from("bdr_call_outcomes")
          .select("id", { count: "exact", head: true })
          .eq("bdr_user_id", userId)
          .eq("objection_type", outcomeDef.objection);
        if (count === 50) {
          toast({
            title: "🎉 Training module unlocked",
            description: `You've logged 50 "${outcomeDef.objection}" objections. The extension training module is now unlocked in the Training Center.`,
          });
        } else if (count && count < 50) {
          toast({ title: "Outcome logged", description: `${count}/50 toward ${outcomeDef.objection} unlock.` });
        } else {
          toast({ title: "Outcome logged" });
        }
      } else {
        toast({ title: "Outcome logged" });
      }

      setOutcome("");
      // Auto-advance to next lead if available
      if (index < leads.length - 1) setIndex(i => i + 1);
    } catch (e: any) {
      toast({ title: "Failed to log outcome", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [lead, outcomeDef, userId, index, leads.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">BDR Dialer</h1>
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <p className="text-white/50 text-sm">No leads in your queue. Add leads from the My Leads page to start dialing.</p>
            <Button className="mt-4" onClick={() => navigate("/employee/leads")}>Go to My Leads</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">BDR Dialer</h1>
          <p className="text-xs text-white/50 mt-1">Lead {index + 1} of {leads.length}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/employee/training")} className="text-white/60">
          <BookOpen className="h-4 w-4 mr-1" /> Training
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={lead.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}
        >
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.12)" }}>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.15)" }}>
                  <Building2 className="h-5 w-5 text-[hsl(var(--nl-sky))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-lg font-semibold truncate">{lead.business_name}</p>
                  <p className="text-sm text-white/60 truncate">{lead.owner_name || "Unknown contact"}</p>
                  {(lead.city || lead.niche) && (
                    <p className="text-[11px] text-white/40 mt-0.5 truncate">
                      {[lead.niche, lead.city].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.04] p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Phone</p>
                  <p className="text-white font-mono text-base">{lead.phone || "No number"}</p>
                </div>
                <a
                  href={lead.phone ? `tel:${lead.phone}` : undefined}
                  aria-disabled={!lead.phone}
                  onClick={(e) => {
                    if (!lead.phone) { e.preventDefault(); return; }
                    // Fire-and-forget: mark lead as called the moment the call is initiated
                    (supabase as any)
                      .from("nl_bdr_leads")
                      .update({ called: true })
                      .eq("id", lead.id)
                      .eq("user_id", userId)
                      .then(() => {});
                  }}
                  className={`inline-flex items-center justify-center h-12 w-12 rounded-full transition-colors ${
                    lead.phone ? "bg-emerald-500 hover:bg-emerald-600" : "bg-white/10 cursor-not-allowed"
                  }`}
                >
                  <Phone className="h-5 w-5 text-white" />
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-white/50">Call outcome</label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                    <SelectValue placeholder="Select outcome…" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white max-h-[60vh]">
                    {OUTCOMES.map(o => (
                      <SelectItem key={o.label} value={o.label} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSubmit}
                  disabled={!outcome || submitting}
                  className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Submit Outcome
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => goto(-1)} disabled={index === 0} className="text-white/70">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button variant="ghost" onClick={() => goto(1)} disabled={index >= leads.length - 1} className="text-white/70">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
