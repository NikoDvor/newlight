import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, FileSignature, Trophy, ListChecks, Loader2,
  Copy, CheckCircle2, AlertTriangle, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const ACTIVE_STAGES = [
  "new_lead", "contacted", "qualified", "appointment_set",
  "appointment_attended", "proposal_sent", "negotiation",
];

interface BookingLink { id: string; slug: string; }
interface Template { id: string; template_name: string; }

export default function OnboardingPipelineSetup() {
  const { activeClientId } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [openDeals, setOpenDeals] = useState(0);
  const [wonDeals, setWonDeals] = useState(0);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const [linksRes, tplRes, openRes, wonRes] = await Promise.all([
        supabase.from("calendar_booking_links")
          .select("id, slug")
          .eq("client_id", activeClientId)
          .eq("is_active", true)
          .limit(1),
        supabase.from("client_agreement_templates")
          .select("id, template_name")
          .eq("client_id", activeClientId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase.from("crm_deals")
          .select("id", { count: "exact", head: true })
          .eq("client_id", activeClientId)
          .in("pipeline_stage", ACTIVE_STAGES),
        supabase.from("crm_deals")
          .select("id", { count: "exact", head: true })
          .eq("client_id", activeClientId)
          .eq("pipeline_stage", "closed_won"),
      ]);
      if (!active) return;
      setBookingLink(linksRes.data?.[0] ?? null);
      setTemplate(tplRes.data ?? null);
      setOpenDeals(openRes.count ?? 0);
      setWonDeals(wonRes.count ?? 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [activeClientId]);

  const copyLink = () => {
    if (!bookingLink) return;
    navigator.clipboard.writeText(`https://newlight-app.com/book/${bookingLink.slug}`);
    toast.success("Booking link copied");
  };

  const statusBadge = (ok: boolean) =>
    ok
      ? <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Configured</Badge>
      : <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Needs setup</Badge>;

  const stageBadge = (n: number, ok: boolean) => (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
      ok ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
    }`}>{n}</div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your pipeline…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <ListChecks className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Onboarding Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            The same 4-stage process NewLight uses to convert appointments into signed, paying clients.
            Configure your own booking, terms, and agreement below.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stage 1 — Discovery Booking */}
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-start gap-4">
            {stageBadge(1, !!bookingLink)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Discovery Booking</h2>
                </div>
                {statusBadge(!!bookingLink)}
              </div>
              {bookingLink ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs bg-muted/60 rounded px-2 py-1">
                    newlight-app.com/book/{bookingLink.slug}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Create your booking calendar so prospects can schedule discovery appointments directly.
                  </p>
                  <Button size="sm" asChild>
                    <Link to="/calendar-management">Create Booking Calendar <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Stage 2 — Qualification & Terms */}
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-start gap-4">
            {stageBadge(2, true)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Qualification &amp; Terms</h2>
                <Badge className="bg-primary/10 text-primary border-primary/30">Per-deal</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Every deal gets its own terms when you're ready to close it — no setup needed here.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs bg-muted/60 rounded-full px-3 py-1 text-muted-foreground">
                  {openDeals} deal{openDeals === 1 ? "" : "s"} currently in your pipeline
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/crm">Go to CRM <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stage 3 — Agreement & Signature */}
        <Card className={`p-5 shadow-sm ${template ? "border-border/60" : "border-amber-500/50"}`}>
          <div className="flex items-start gap-4">
            {stageBadge(3, !!template)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Agreement &amp; Signature</h2>
                </div>
                {statusBadge(!!template)}
              </div>
              {!template && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Required before Stage 4 can function.
                </p>
              )}
              {template ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    Active template: <span className="font-medium text-foreground">{template.template_name}</span>
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/agreement-template">Edit Template</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Set up your own agreement so deals can be generated and sent for e-signature.
                  </p>
                  <Button size="sm" asChild>
                    <Link to="/agreement-template">Set Up Your Agreement <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </>
              )}
              <p className="text-xs text-muted-foreground/80">
                This is your own agreement — NewLight provides the pipeline, not the legal content.
              </p>
            </div>
          </div>
        </Card>

        {/* Stage 4 — Won & Onboarded */}
        <Card className="p-5 border-border/60 shadow-sm">
          <div className="flex items-start gap-4">
            {stageBadge(4, wonDeals > 0)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Won &amp; Onboarded</h2>
                </div>
                {wonDeals > 0 && (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Once a deal is signed, mark it Closed Won in your CRM — that's the finish line.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs bg-muted/60 rounded-full px-3 py-1 text-muted-foreground">
                  {wonDeals} deal{wonDeals === 1 ? "" : "s"} closed won, all-time
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/pipeline-insights">View Pipeline Insights <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/80">
                See your conversion rates and where deals fall out.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
