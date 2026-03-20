import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Globe, TrendingUp, Users, Calendar, Lightbulb, BarChart3, ArrowUpRight,
  ArrowUp, ArrowDown, Minus, Search, Target, MapPin, AlertTriangle, Loader2
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_TRENDS = [
  { title: "Video content dominates engagement", detail: "Short-form video posts get 3.2x more engagement than static images.", category: "Content" },
  { title: "Local search volume surging", detail: "'Near me' searches increased 28% in your market area.", category: "SEO" },
  { title: "Review velocity matters more than ever", detail: "Google algorithm now weighs recency heavily. 5+ monthly reviews rank 23% higher.", category: "Reviews" },
  { title: "AI-powered chat becoming standard", detail: "42% of competitors now use chatbots. 35% more lead captures from website visitors.", category: "Technology" },
];

const BUYER_INSIGHTS = [
  { insight: "78% of customers research online before calling", action: "Strengthen website content and reviews" },
  { insight: "Average buyer reads 4.2 reviews before choosing", action: "Increase review generation velocity" },
  { insight: "Mobile traffic accounts for 72% of visits", action: "Prioritize mobile experience optimization" },
  { insight: "Customers prefer text over phone calls by 3:1", action: "Enable SMS booking and follow-up" },
];

export default function MarketResearch() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [contentOpps, setContentOpps] = useState<any[]>([]);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase.from("seo_keywords").select("*").eq("client_id", activeClientId).order("position", { ascending: true }).limit(20),
      supabase.from("seo_competitors").select("*").eq("client_id", activeClientId).order("authority_score", { ascending: false }).limit(10),
      supabase.from("seo_issues").select("*").eq("client_id", activeClientId).eq("status", "open").limit(10),
      supabase.from("seo_content_opportunities").select("*").eq("client_id", activeClientId).limit(10),
      supabase.from("seo_local_visibility").select("*").eq("client_id", activeClientId).limit(10),
    ]).then(([kw, comp, iss, co, loc]) => {
      setKeywords(kw.data || []);
      setCompetitors(comp.data || []);
      setIssues(iss.data || []);
      setContentOpps(co.data || []);
      setLocalItems(loc.data || []);
      setLoading(false);
    });
  }, [activeClientId]);

  const avgPosition = keywords.length > 0
    ? (keywords.reduce((s, k) => s + (k.position || 50), 0) / keywords.length).toFixed(1)
    : "—";
  const totalVolume = keywords.reduce((s, k) => s + (k.search_volume || 0), 0);
  const openIssues = issues.length;
  const competitorCount = competitors.length;

  const hasRealData = keywords.length > 0 || competitors.length > 0;

  return (
    <div>
      <PageHeader title="Market Research" description="AI-powered market intelligence driven by your SEO and competitive data">
        {activeClientId && (
          <Button variant="outline" size="sm" onClick={() => navigate("/seo")}>
            <Search className="h-3.5 w-3.5 mr-1" /> SEO Dashboard
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
            <MetricCard label="Tracked Keywords" value={String(keywords.length)} change={hasRealData ? `Avg pos: ${avgPosition}` : "Add via SEO module"} changeType={hasRealData ? "positive" : "neutral"} icon={Search} />
            <MetricCard label="Total Search Volume" value={totalVolume > 0 ? totalVolume.toLocaleString() : "—"} change="Monthly est." changeType="neutral" icon={TrendingUp} />
            <MetricCard label="Competitors Tracked" value={String(competitorCount)} change={competitorCount > 0 ? "Active monitoring" : "Add via SEO"} changeType={competitorCount > 0 ? "positive" : "neutral"} icon={Users} />
            <MetricCard label="Open SEO Issues" value={String(openIssues)} change={openIssues > 0 ? "Need attention" : "All clear"} changeType={openIssues > 0 ? "negative" : "positive"} icon={AlertTriangle} />
          </WidgetGrid>

          {/* Keyword Intelligence */}
          {keywords.length > 0 && (
            <DataCard title="Keyword Intelligence" className="mt-6">
              <div className="space-y-1">
                {keywords.slice(0, 10).map((kw, i) => (
                  <motion.div key={kw.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <span className="text-xs font-bold text-muted-foreground w-6 text-right">#{kw.position || "?"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{kw.keyword}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{kw.search_volume?.toLocaleString() || "—"} vol</span>
                    {kw.position_change != null && kw.position_change !== 0 && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${kw.position_change > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {kw.position_change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(kw.position_change)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </DataCard>
          )}

          {/* Competitor Landscape */}
          {competitors.length > 0 && (
            <DataCard title="Competitive Landscape" className="mt-6">
              <div className="space-y-1">
                {competitors.map((c, i) => (
                  <motion.div key={c.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.domain}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">DA: {c.authority_score || "?"}</span>
                    <span className="text-[10px] text-muted-foreground">{c.keywords_count?.toLocaleString() || "?"} kw</span>
                    <span className="text-[10px] text-muted-foreground">{c.estimated_traffic?.toLocaleString() || "?"} traffic</span>
                  </motion.div>
                ))}
              </div>
            </DataCard>
          )}

          {/* Content Opportunities from SEO */}
          {contentOpps.length > 0 && (
            <DataCard title="Content Opportunities" className="mt-6">
              <div className="space-y-2">
                {contentOpps.map((c, i) => (
                  <motion.div key={c.id || i} className="p-3 rounded-xl bg-secondary/30 border border-border"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">{c.topic_title}</p>
                      <Badge variant="outline" className="text-[10px]">{c.priority || "medium"}</Badge>
                    </div>
                    {c.target_keyword && <p className="text-[10px] text-muted-foreground">Target: {c.target_keyword}</p>}
                  </motion.div>
                ))}
              </div>
            </DataCard>
          )}

          {/* Local Visibility */}
          {localItems.length > 0 && (
            <DataCard title="Local Visibility Signals" className="mt-6">
              <div className="space-y-2">
                {localItems.map((l, i) => (
                  <div key={l.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm text-foreground flex-1">{l.location_name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{l.visibility_status}</Badge>
                  </div>
                ))}
              </div>
            </DataCard>
          )}

          {/* Fallback: Market Trends (always shown for context) */}
          <DataCard title="Market Trends" className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {FALLBACK_TRENDS.map((t, i) => (
                <motion.div key={i} className="rounded-xl p-4 bg-secondary/30 border border-border"
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ y: -2 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.detail}</p>
                </motion.div>
              ))}
            </div>
          </DataCard>

          <DataCard title="Buyer Behavior Insights" className="mt-6">
            <div className="space-y-3">
              {BUYER_INSIGHTS.map((b, i) => (
                <motion.div key={i} className="py-3 border-b border-border last:border-0"
                  initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm text-foreground">{b.insight}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <ArrowUpRight className="h-3 w-3 text-accent" />
                        <span className="text-[10px] font-medium text-accent">{b.action}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </DataCard>

          {!hasRealData && activeClientId && (
            <motion.div className="mt-6 rounded-2xl p-6 text-center border border-dashed border-border bg-secondary/20"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground mb-1">No SEO data yet</p>
              <p className="text-xs text-muted-foreground mb-3">Add keywords and competitors in the SEO module to power real market intelligence.</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/seo")}>
                <Search className="h-3.5 w-3.5 mr-1" /> Go to SEO Dashboard
              </Button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
