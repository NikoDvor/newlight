import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WorkspaceIntelligencePanel } from "@/components/admin/WorkspaceIntelligencePanel";
import { ProposalOfferBuilder } from "@/components/admin/ProposalOfferBuilder";
import { ProposalQuotePreview } from "@/components/admin/ProposalQuotePreview";
import { generateProposalFromWizard } from "@/lib/proposalWizard";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import type { QuoteOutput } from "@/lib/workspaceQuoteEngine";
import { ArrowLeft, Brain, Package, Eye, Loader2 } from "lucide-react";

const DEFAULT_PROFILE: WorkspaceProfile = {
  industry: "agencies_professional",
  niche: null,
  archetype: "retainers",
  zoomTier: "z2",
  legacyProfileType: "consultative_sales",
  legacyIndustryValue: "",
  metadata: { revenueModel: "retainer", salesCycle: "medium", ticketSize: "medium", complexityLevel: "medium", complianceLevel: "none" },
};

export default function AdminProposalWizard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get("dealId") ?? undefined;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [deal, setDeal] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [profile, setProfile] = useState<WorkspaceProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState("intelligence");
  const [currentQuote, setCurrentQuote] = useState<QuoteOutput | null>(null);
  const [currentModules, setCurrentModules] = useState<string[]>([]);
  const [currentNotes, setCurrentNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const [{ data: c }, { data: wp }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", clientId).single(),
        supabase.from("workspace_profiles").select("*").eq("client_id", clientId).maybeSingle(),
      ]);
      setClient(c);
      if (wp) {
        // Profile data is stored in config_overrides JSON field
        const overrides = (wp.config_overrides && typeof wp.config_overrides === "object" && !Array.isArray(wp.config_overrides))
          ? wp.config_overrides as Record<string, any>
          : {};
        if (overrides.industry || overrides.archetype) {
          setProfile({
            industry: overrides.industry || DEFAULT_PROFILE.industry,
            niche: overrides.niche || null,
            archetype: overrides.archetype || DEFAULT_PROFILE.archetype,
            zoomTier: overrides.zoomTier || DEFAULT_PROFILE.zoomTier,
            legacyProfileType: (wp as any).profile_type || overrides.legacyProfileType || "",
            legacyIndustryValue: overrides.legacyIndustryValue || "",
            metadata: overrides.metadata || DEFAULT_PROFILE.metadata,
          });
        }
      }

      if (dealId) {
        const { data: d } = await supabase.from("crm_deals").select("*, crm_contacts(id, full_name, email), crm_companies(id, company_name)").eq("id", dealId).single();
        setDeal(d);
        if (d?.crm_contacts) setContact(d.crm_contacts);
      }
      setLoading(false);
    };
    load();
  }, [clientId, dealId]);

  const handleQuoteChange = (quote: QuoteOutput, modules: string[], notes: string) => {
    setCurrentQuote(quote);
    setCurrentModules(modules);
    setCurrentNotes(notes);
    setActiveTab("preview");
  };

  const handleGenerateProposal = async () => {
    if (!clientId || !currentQuote) return;
    setGenerating(true);
    try {
      const result = await generateProposalFromWizard({
        clientId,
        dealId: dealId || undefined,
        contactId: contact?.id,
        companyId: deal?.crm_companies?.id,
        servicePackage: currentModules.join(", "),
        setupFee: String(currentQuote.totalUpfront),
        monthlyFee: String(currentQuote.totalMonthly),
        contractTerm: "6 months",
        salesNotes: currentNotes,
        businessName: client?.business_name,
      });
      if (result) {
        toast.success(`Proposal v${result.version} ${result.action}`);
        navigate(`/admin/proposals/${result.proposalId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate proposal");
    }
    setGenerating(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Proposal Wizard</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {client?.business_name ?? "Client"} {deal ? `— ${deal.deal_name}` : ""}
            </p>
          </div>
          <Badge className="text-[9px] bg-amber-500/20 text-amber-400">Admin Only — Not Client-Facing</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="intelligence" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Intelligence
          </TabsTrigger>
          <TabsTrigger value="builder" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs gap-1.5">
            <Package className="h-3.5 w-3.5" /> Offer Builder
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Quote Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="mt-4">
          <WorkspaceIntelligencePanel profile={profile} />
        </TabsContent>

        <TabsContent value="builder" className="mt-4">
          <ProposalOfferBuilder profile={profile} onQuoteChange={handleQuoteChange} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {currentQuote ? (
            <div className="space-y-4">
              <ProposalQuotePreview quote={currentQuote} profile={profile} internalNotes={currentNotes} selectedModules={currentModules} />
              <Button
                className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11"
                onClick={handleGenerateProposal}
                disabled={generating}
              >
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : "Generate Proposal from This Quote"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <Eye className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Build your offer first, then preview the quote here.</p>
              <Button variant="ghost" className="text-[hsl(var(--nl-neon))] text-xs mt-2" onClick={() => setActiveTab("builder")}>
                Go to Offer Builder →
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
