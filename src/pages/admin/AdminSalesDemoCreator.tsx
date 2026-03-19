import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoUploader } from "@/components/LogoUploader";
import { supabase } from "@/integrations/supabase/client";
import { executeSalesIntake } from "@/lib/salesAutomation";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Zap, CheckCircle2, Copy, ExternalLink, CalendarPlus,
  Building2, User, Phone, Mail, Globe, MapPin, Palette, Briefcase,
  MessageSquare, Clock, Tag, ChevronRight, Rocket, ArrowRight
} from "lucide-react";

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  website: string;
  industry: string;
  location: string;
  needs: string[];
  revenue_range: string;
  urgency: string;
  salesman_notes: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  assigned_salesman: string;
  assigned_operator: string;
  lead_source: string;
  internal_tags: string;
  meeting_type: string;
  meeting_date: string;
  meeting_time: string;
  timezone: string;
  template_id: string;
};

const INITIAL: FormState = {
  full_name: "", email: "", phone: "", business_name: "", website: "",
  industry: "", location: "", needs: [], revenue_range: "", urgency: "soon",
  salesman_notes: "", logo_url: "", primary_color: "#3B82F6",
  secondary_color: "#06B6D4", assigned_salesman: "", assigned_operator: "",
  lead_source: "cold_call", internal_tags: "", meeting_type: "discovery_call",
  meeting_date: "", meeting_time: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  template_id: "",
};

const NEED_OPTIONS = [
  "More appointments", "More online sales", "Better systems / automation",
  "Better website", "More visibility / SEO", "Other",
];

const MEETING_TYPES = [
  { value: "intro_call", label: "Intro Call" },
  { value: "discovery_call", label: "Discovery Call" },
  { value: "demo_call", label: "Demo Call" },
  { value: "closing_call", label: "Closing Call" },
  { value: "follow_up_call", label: "Follow-Up Call" },
];

const LEAD_SOURCES = [
  { value: "cold_call", label: "Cold Call" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Social Media" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

type SuccessData = {
  prospect_name: string;
  business_name: string;
  meeting_time: string;
  workspace_url: string;
  workspace_slug: string;
  deal_id: string | null;
  meeting_id: string | null;
  client_id: string;
};

export default function AdminSalesDemoCreator() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ id: string; template_name: string; industry_type: string }[]>([]);

  useEffect(() => {
    supabase.from("workspace_templates" as any).select("id, template_name, industry_type").eq("is_active", true).order("template_name").then(({ data }) => {
      setTemplates((data as any[]) || []);
    });
  }, []);

  const set = (k: keyof FormState, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleNeed = (n: string) =>
    set("needs", form.needs.includes(n) ? form.needs.filter(x => x !== n) : [...form.needs, n]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied!`);
  };

  const validate = (): string | null => {
    if (!form.business_name.trim()) return "Business name is required";
    if (!form.email.trim()) return "Email is required";
    if (!form.full_name.trim()) return "Contact name is required";
    if (!form.meeting_date || !form.meeting_time) return "Meeting date and time are required";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    setSubmitting(true);
    try {
      // 1. Create CRM records via sales automation
      const salesResult = await executeSalesIntake({
        businessName: form.business_name,
        contactName: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        location: form.location || undefined,
        source: form.lead_source,
        assignedSalesmanId: form.assigned_salesman || undefined,
      });

      // 2. Create sales meeting record
      const meetingStart = new Date(`${form.meeting_date}T${form.meeting_time}`);
      const meetingEnd = new Date(meetingStart.getTime() + 45 * 60000);
      const meetingTitle = `${MEETING_TYPES.find(m => m.value === form.meeting_type)?.label || "Meeting"} — ${form.business_name}`;

      const { data: meeting } = await supabase.from("sales_meetings").insert({
        client_id: "00000000-0000-0000-0000-000000000000",
        contact_id: salesResult.contactId || null,
        company_id: salesResult.companyId || null,
        deal_id: salesResult.dealId || null,
        assigned_salesman_user_id: form.assigned_salesman || null,
        meeting_type: form.meeting_type,
        source_type: "internal_intake",
        title: meetingTitle,
        description: form.salesman_notes || null,
        start_time: meetingStart.toISOString(),
        end_time: meetingEnd.toISOString(),
        timezone: form.timezone,
        status: "scheduled",
        meeting_outcome: "pending",
      } as any).select("id").single();

      // Update deal stage to booked_meeting
      if (salesResult.dealId) {
        await supabase.from("crm_deals").update({
          pipeline_stage: "booked_meeting",
          interest_type: form.needs.join(", ") || null,
          urgency_level: form.urgency,
        } as any).eq("id", salesResult.dealId);
      }

      // 3. Create demo workspace via edge function
      const { data: provisionData, error: provisionErr } = await supabase.functions.invoke(
        "provision-from-booking",
        {
          body: {
            business_name: form.business_name,
            contact_name: form.full_name,
            contact_email: form.email,
            contact_phone: form.phone || null,
            company_name: form.business_name,
            logo_url: form.logo_url || null,
            primary_color: form.primary_color,
            secondary_color: form.secondary_color,
            industry: form.industry || null,
            location: form.location || null,
            website: form.website || null,
          },
        }
      );

      if (provisionErr) throw provisionErr;

      // 4. Create audit log
      await supabase.from("audit_logs").insert({
        action: "sales_demo_created",
        module: "sales",
        metadata: {
          business_name: form.business_name,
          contact_email: form.email,
          meeting_type: form.meeting_type,
          deal_id: salesResult.dealId,
          client_id: provisionData?.client_id,
          source: "sales_demo_creator",
        },
      });

      // 5. Show success
      setSuccess({
        prospect_name: form.full_name,
        business_name: form.business_name,
        meeting_time: meetingStart.toLocaleString(),
        workspace_url: provisionData?.workspace_url || "",
        workspace_slug: provisionData?.workspace_slug || "",
        deal_id: salesResult.dealId || null,
        meeting_id: meeting?.id || null,
        client_id: provisionData?.client_id || "",
      });

      toast.success("Demo workspace created & meeting booked!");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
      console.error("[SalesDemoCreator]", e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL);
    setSuccess(null);
  };

  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(var(--nl-sky))]/40";
  const labelCls = "text-xs text-white/50 mb-1 block";
  const sectionCls = "rounded-xl p-4 space-y-3";
  const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };
  const sectionHeader = "text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5";

  // ─── SUCCESS STATE ───────────────────────────────────────────────
  if (success) {
    const followUpMsg = `Hi ${success.prospect_name}! Your preview workspace for ${success.business_name} is ready. Open it here: ${success.workspace_url} — You can install it on your phone like an app. Meeting confirmed for ${success.meeting_time}.`;
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.12)" }}>
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, hsl(var(--nl-electric)), hsl(var(--nl-sky)), hsl(var(--nl-neon)))" }} />
            <CardContent className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "hsla(145,60%,50%,.15)" }}>
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Demo Workspace Created!</h2>
                <p className="text-sm text-white/50">Meeting booked and workspace link ready to share.</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Prospect", value: success.prospect_name, icon: User },
                  { label: "Business", value: success.business_name, icon: Building2 },
                  { label: "Meeting", value: success.meeting_time, icon: CalendarPlus },
                  { label: "Workspace", value: "Created ✓", icon: Rocket },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-3" style={sectionStyle}>
                    <div className="flex items-center gap-2">
                      <item.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                      <span className="text-[10px] text-white/40 uppercase">{item.label}</span>
                    </div>
                    <p className="text-sm text-white font-medium mt-1 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Copy actions */}
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Quick Actions</p>
                {[
                  { label: "Workspace Link", text: success.workspace_url },
                  { label: "Follow-Up Message", text: followUpMsg },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => copyText(item.text, item.label)}
                    className="w-full flex items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-white/[0.06]"
                    style={sectionStyle}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/50">{item.label}</p>
                      <p className="text-xs text-white truncate mt-0.5">{item.text}</p>
                    </div>
                    <Copy className={`h-4 w-4 shrink-0 ml-2 ${copied === item.label ? "text-emerald-400" : "text-white/30"}`} />
                  </button>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {success.workspace_url && (
                  <a href={success.workspace_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full border-white/10 text-white hover:bg-white/10 text-xs h-9">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Workspace
                    </Button>
                  </a>
                )}
                {success.deal_id && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/deals/${success.deal_id}`)} className="border-white/10 text-white hover:bg-white/10 text-xs h-9">
                    <Briefcase className="h-3.5 w-3.5 mr-1" /> Open Deal
                  </Button>
                )}
                {success.meeting_id && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/meetings/${success.meeting_id}`)} className="border-white/10 text-white hover:bg-white/10 text-xs h-9">
                    <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Open Meeting
                  </Button>
                )}
              </div>

              <Button onClick={resetForm} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11">
                <Zap className="h-4 w-4 mr-2" /> Create Another
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── FORM ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Sales Demo Creator</h1>
        <p className="text-sm text-white/50 mt-1">Capture prospect info, book a meeting, and generate a branded demo workspace — all in one step.</p>
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-5 space-y-5">

          {/* A — Basic Info */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><User className="h-3 w-3" /> Prospect Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className={labelCls}>Full Name *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="John Smith" className={inputCls} disabled={submitting} /></div>
              <div><Label className={labelCls}>Email *</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="john@company.com" className={`${inputCls} pl-9`} disabled={submitting} type="email" /></div></div>
              <div><Label className={labelCls}>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 123-4567" className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
              <div><Label className={labelCls}>Business Name *</Label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Acme Corp" className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
              <div><Label className={labelCls}>Website</Label><div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://example.com" className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
              <div><Label className={labelCls}>Industry / Niche</Label><Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="e.g. Dental, Salon, Auto" className={inputCls} disabled={submitting} /></div>
              <div className="sm:col-span-2"><Label className={labelCls}>City / Location</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Los Angeles, CA" className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
            </div>
          </div>

          {/* B — Business Context */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><MessageSquare className="h-3 w-3" /> Business Context</p>
            <div>
              <Label className={labelCls}>What do they need help with?</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {NEED_OPTIONS.map(n => (
                  <button key={n} type="button" onClick={() => toggleNeed(n)} disabled={submitting}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.needs.includes(n)
                        ? "bg-[hsla(211,96%,60%,.2)] border-[hsla(211,96%,60%,.3)] text-white"
                        : "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Monthly Revenue Range</Label>
                <Select value={form.revenue_range} onValueChange={v => set("revenue_range", v)} disabled={submitting}>
                  <SelectTrigger className={inputCls}><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                    <SelectItem value="under_10k">Under $10k</SelectItem>
                    <SelectItem value="10k_50k">$10k – $50k</SelectItem>
                    <SelectItem value="50k_100k">$50k – $100k</SelectItem>
                    <SelectItem value="100k_500k">$100k – $500k</SelectItem>
                    <SelectItem value="500k_plus">$500k+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Urgency</Label>
                <Select value={form.urgency} onValueChange={v => set("urgency", v)} disabled={submitting}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                    <SelectItem value="asap">ASAP</SelectItem>
                    <SelectItem value="soon">Soon</SelectItem>
                    <SelectItem value="exploring">Exploring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className={labelCls}>Internal Salesman Notes</Label>
              <Textarea value={form.salesman_notes} onChange={e => set("salesman_notes", e.target.value)} placeholder="Key points from the call…" className={`${inputCls} min-h-[60px]`} disabled={submitting} />
            </div>
          </div>

          {/* C — Branding */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Palette className="h-3 w-3" /> Branding</p>
            <p className="text-[10px] text-white/30">Logo and colors make the demo workspace feel personalized. Skip if not available.</p>
            <LogoUploader value={form.logo_url} onChange={v => set("logo_url", v)} label="Logo" dark={true} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Primary Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <Input value={form.primary_color} onChange={e => set("primary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} />
                </div>
              </div>
              <div>
                <Label className={labelCls}>Secondary Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <Input value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} className={`${inputCls} flex-1`} disabled={submitting} />
                </div>
              </div>
            </div>
          </div>

          {/* D — Internal Ownership */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><Tag className="h-3 w-3" /> Internal Ownership</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Lead Source</Label>
                <Select value={form.lead_source} onValueChange={v => set("lead_source", v)} disabled={submitting}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                    {LEAD_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Internal Tags</Label>
                <Input value={form.internal_tags} onChange={e => set("internal_tags", e.target.value)} placeholder="e.g. high-value, referral" className={inputCls} disabled={submitting} />
              </div>
            </div>
          </div>

          {/* E — Booking */}
          <div className={sectionCls} style={sectionStyle}>
            <p className={sectionHeader}><CalendarPlus className="h-3 w-3" /> Meeting Booking</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Meeting Type *</Label>
                <Select value={form.meeting_type} onValueChange={v => set("meeting_type", v)} disabled={submitting}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                    {MEETING_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Timezone</Label>
                <Input value={form.timezone} onChange={e => set("timezone", e.target.value)} className={inputCls} disabled={submitting} />
              </div>
              <div>
                <Label className={labelCls}>Date *</Label>
                <Input type="date" value={form.meeting_date} onChange={e => set("meeting_date", e.target.value)} className={inputCls} disabled={submitting} />
              </div>
              <div>
                <Label className={labelCls}>Time *</Label>
                <Input type="time" value={form.meeting_time} onChange={e => set("meeting_time", e.target.value)} className={inputCls} disabled={submitting} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-12 text-sm font-semibold">
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating workspace & booking meeting…</>
            ) : (
              <><Rocket className="h-4 w-4 mr-2" /> Create Demo Workspace + Book Meeting</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
