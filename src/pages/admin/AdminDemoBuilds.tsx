import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Zap, CheckCircle2, AlertCircle, Building2, Globe, MapPin,
  Palette, Plus, Eye, ArrowRight, Hammer, Clock, CalendarCheck
} from "lucide-react";
import { LogoUploader } from "@/components/LogoUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type DemoBuild = {
  id: string;
  business_name: string;
  website: string | null;
  primary_location: string | null;
  business_type: string | null;
  main_service: string | null;
  primary_goal: string | null;
  status: string;
  workspace_slug: string;
  created_at: string;
  logo_url: string | null;
  primary_color: string | null;
};

const statusColors: Record<string, string> = {
  build_in_progress: "text-yellow-400 bg-yellow-400/10",
  demo_ready: "text-[hsl(var(--nl-sky))] bg-[hsla(211,96%,60%,.12)]",
  awaiting_closing: "text-[hsl(var(--nl-neon))] bg-[hsla(211,96%,60%,.12)]",
  closed: "text-emerald-400 bg-emerald-400/10",
};

const statusLabels: Record<string, string> = {
  build_in_progress: "Build In Progress",
  demo_ready: "Demo Ready",
  awaiting_closing: "Awaiting Closing",
  closed: "Closed",
};

export default function AdminDemoBuilds() {
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<DemoBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: "", website: "", primary_location: "", business_type: "",
    main_service: "", primary_goal: "", booking_link: "", logo_url: "",
    primary_color: "#3B82F6", secondary_color: "#06B6D4",
    social_links: "", notes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fetchBuilds = async () => {
    const { data } = await supabase
      .from("demo_builds")
      .select("id, business_name, website, primary_location, business_type, main_service, primary_goal, status, workspace_slug, created_at, logo_url, primary_color")
      .order("created_at", { ascending: false });
    setBuilds((data as DemoBuild[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBuilds(); }, []);

  const handleSubmit = async () => {
    if (!form.business_name) { toast.error("Business name is required"); return; }
    setSubmitting(true);
    const slug = form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let socialJson = {};
    try { if (form.social_links) socialJson = JSON.parse(form.social_links); } catch { /* ignore */ }

    const { error } = await supabase.from("demo_builds").insert({
      business_name: form.business_name,
      workspace_slug: slug,
      website: form.website || null,
      primary_location: form.primary_location || null,
      business_type: form.business_type || null,
      main_service: form.main_service || null,
      primary_goal: form.primary_goal || null,
      booking_link: form.booking_link || null,
      logo_url: form.logo_url || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      social_links: socialJson,
      notes: form.notes || null,
      status: "build_in_progress",
    } as any);

    if (error) { toast.error(error.message); } else {
      toast.success("Demo build created!");
      setForm({ business_name: "", website: "", primary_location: "", business_type: "", main_service: "", primary_goal: "", booking_link: "", logo_url: "", primary_color: "#3B82F6", secondary_color: "#06B6D4", social_links: "", notes: "" });
      setShowForm(false);
      fetchBuilds();

      // Create audit log
      await supabase.from("audit_logs").insert({ action: "demo_build_created", module: "demo_builds", metadata: { business_name: form.business_name, slug } });
    }
    setSubmitting(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("demo_builds").update({ status: newStatus } as any).eq("id", id);
    toast.success(`Status updated to ${statusLabels[newStatus]}`);
    fetchBuilds();
  };

  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
  const labelCls = "text-xs text-white/50 mb-1 block";

  const summaryStats = [
    { label: "In Progress", count: builds.filter(b => b.status === "build_in_progress").length, icon: Hammer, color: "text-yellow-400" },
    { label: "Demo Ready", count: builds.filter(b => b.status === "demo_ready").length, icon: Eye, color: "text-[hsl(var(--nl-sky))]" },
    { label: "Awaiting Closing", count: builds.filter(b => b.status === "awaiting_closing").length, icon: Clock, color: "text-[hsl(var(--nl-neon))]" },
    { label: "Closed", count: builds.filter(b => b.status === "closed").length, icon: CalendarCheck, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Demo Builds</h1>
          <p className="text-sm text-white/50 mt-1">Pre-closing tailored workspace builder</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
          <Plus className="h-4 w-4 mr-1" /> New Demo Build
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-white">{s.count}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* New Build Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Hammer className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                <span className="text-sm font-semibold text-white">Pre-Closing App Build Form</span>
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Business Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={labelCls}>Business Name *</label><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Acme Corp" className={inputCls} disabled={submitting} /></div>
                  <div><label className={labelCls}>Website</label><div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://example.com" className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
                  <div><label className={labelCls}>Primary City / Location</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.primary_location} onChange={e => set("primary_location", e.target.value)} placeholder="City, State" className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
                  <div><label className={labelCls}>Business Type / Industry</label><Input value={form.business_type} onChange={e => set("business_type", e.target.value)} placeholder="e.g. Dental, Auto, Restaurant" className={inputCls} disabled={submitting} /></div>
                  <div><label className={labelCls}>Main Service or Offer</label><Input value={form.main_service} onChange={e => set("main_service", e.target.value)} placeholder="What they sell/offer" className={inputCls} disabled={submitting} /></div>
                  <div><label className={labelCls}>Primary Goal</label><Input value={form.primary_goal} onChange={e => set("primary_goal", e.target.value)} placeholder="e.g. More leads, better reviews" className={inputCls} disabled={submitting} /></div>
                  <div><label className={labelCls}>Booking Link (optional)</label><Input value={form.booking_link} onChange={e => set("booking_link", e.target.value)} placeholder="https://calendly.com/..." className={inputCls} disabled={submitting} /></div>
                  <div><label className={labelCls}>Social Links (JSON, optional)</label><Input value={form.social_links} onChange={e => set("social_links", e.target.value)} placeholder='{"facebook":"...","instagram":"..."}' className={inputCls} disabled={submitting} /></div>
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Palette className="h-3 w-3" /> Branding (Optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><label className={labelCls}>Logo URL</label><Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." className={inputCls} disabled={submitting} /></div>
                  <div><label className={labelCls}>Primary Color</label><div className="flex gap-2"><input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} /></div></div>
                  <div><label className={labelCls}>Secondary Color</label><div className="flex gap-2"><input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" /><Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} /></div></div>
                </div>
              </div>

              <div><label className={labelCls}>Notes for Tailoring (optional)</label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes about this prospect's business..." className={`${inputCls} min-h-[60px]`} disabled={submitting} /></div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : <><Zap className="h-4 w-4 mr-2" /> Create Demo Build</>}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="border-white/10 text-white hover:bg-white/10">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Builds List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
      ) : builds.length === 0 ? (
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardContent className="py-16 text-center">
            <Hammer className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No demo builds yet. Create one before a closing meeting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {builds.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="border-0 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.06] transition-colors" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain bg-white/5" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${b.primary_color || '#3B82F6'}20` }}>
                          <Building2 className="h-4 w-4" style={{ color: b.primary_color || '#3B82F6' }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{b.business_name}</p>
                        <p className="text-[11px] text-white/40">{b.business_type || "No type"} · {b.primary_location || "No location"} · {new Date(b.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColors[b.status] || "text-white/40 bg-white/5"}`}>
                        {statusLabels[b.status] || b.status}
                      </span>
                      {b.status === "build_in_progress" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "demo_ready")} className="text-white/60 hover:text-white text-xs h-7">
                          Mark Ready
                        </Button>
                      )}
                      {b.status === "demo_ready" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "awaiting_closing")} className="text-white/60 hover:text-white text-xs h-7">
                          Awaiting Close
                        </Button>
                      )}
                      {b.status === "awaiting_closing" && (
                        <Button size="sm" onClick={() => navigate(`/admin/demo-builds/${b.id}/close`)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white text-xs h-7">
                          <ArrowRight className="h-3 w-3 mr-1" /> Close & Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
