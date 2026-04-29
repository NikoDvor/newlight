import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, Building2, Palette, Calendar, DollarSign, Bell,
  Users, Plug, Shield, Sliders, Save, Eye, Image, Smartphone, FileText,
  Plus, Mail, MessageSquare, Clock, UserPlus, MoreHorizontal, Check, X,
  Globe, Phone, MapPin, Briefcase, Link2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoUploader } from "@/components/LogoUploader";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

/* ── Shared helpers ── */
const Field = ({ label, value, onChange, placeholder = "", type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div>
    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
    <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-xs bg-secondary/50" />
  </div>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
    <div className="flex gap-2">
      <input type="color" value={value || "#3B82F6"} onChange={e => onChange(e.target.value)} className="h-9 w-9 rounded-lg border-0 cursor-pointer" />
      <Input value={value} onChange={e => onChange(e.target.value)} className="h-9 text-xs bg-secondary/50 flex-1" />
    </div>
  </div>
);

const SectionCard = ({ icon: Icon, title, desc, children, action }: {
  icon: any; title: string; desc: string; children: React.ReactNode; action?: React.ReactNode;
}) => (
  <motion.div className="card-widget" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {action}
    </div>
    {children}
  </motion.div>
);

/* ── Sidebar nav items ── */
const sections = [
  { id: "general", label: "General", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team / Users", icon: Users },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "security", label: "Security", icon: Shield },
  { id: "workspace", label: "Preferences", icon: Sliders },
];

/* ── Default branding form ── */
const defaultBranding = {
  company_name: "", display_name: "", dashboard_title: "", welcome_message: "", tagline: "",
  primary_color: "#3B82F6", secondary_color: "#06B6D4", accent_color: "",
  logo_url: "", dashboard_logo_url: "", sidebar_logo_url: "", app_icon_url: "", splash_logo_url: "",
  favicon_url: "", avatar_logo_url: "", report_logo_url: "",
  calendar_title: "", calendar_subtitle: "", calendar_logo_url: "", calendar_primary_color: "", calendar_confirmation_message: "",
  finance_dashboard_title: "", report_header_title: "", report_subtitle: "",
  tax_module_title: "", tax_dashboard_subtitle: "", tax_report_header_title: "", tax_reminder_header_text: "",
  tax_document_vault_title: "", filing_readiness_title: "", payroll_header_title: "",
  app_display_name: "", workspace_header_name: "", login_branding_text: "",
};

/* ── Default general form ── */
const defaultGeneral = {
  business_name: "", owner_email: "", owner_name: "", primary_location: "",
  timezone: "America/Los_Angeles", industry: "", service_package: "", workspace_slug: "",
};

export default function SettingsPage() {
  const { activeClientId } = useWorkspace();
  const [activeSection, setActiveSection] = useState("general");
  const [branding, setBranding] = useState(defaultBranding);
  const [general, setGeneral] = useState(defaultGeneral);
  const [showPreview, setShowPreview] = useState(false);

  const setB = (key: string) => (val: string) => setBranding(p => ({ ...p, [key]: val }));
  const setG = (key: string) => (val: string) => setGeneral(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("clients").select("*").eq("id", activeClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGeneral({
            business_name: data.business_name || "",
            owner_email: data.owner_email || "",
            owner_name: data.owner_name || "",
            primary_location: data.primary_location || "",
            timezone: data.timezone || "America/Los_Angeles",
            industry: data.industry || "",
            service_package: data.service_package || "",
            workspace_slug: data.workspace_slug || "",
          });
        }
      });
    supabase.from("client_branding").select("*").eq("client_id", activeClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const merged = { ...defaultBranding };
          Object.keys(merged).forEach(k => {
            if ((data as any)[k] != null) (merged as any)[k] = (data as any)[k];
          });
          setBranding(merged);
        }
      });
  }, [activeClientId]);

  const saveGeneral = async () => {
    if (!activeClientId) return;
    const { error } = await supabase.from("clients").update(general).eq("id", activeClientId);
    if (error) { toast.error(error.message); return; }
    await auditLog("general_settings_updated", "settings");
    toast.success("General settings saved!");
  };

  const saveBranding = async () => {
    if (!activeClientId) return;
    const { error } = await supabase.from("client_branding").upsert({
      client_id: activeClientId, ...branding,
    } as any, { onConflict: "client_id" });
    if (error) { toast.error(error.message); return; }
    await auditLog("branding_updated", "branding");
    toast.success("Branding saved!");
  };

  const auditLog = async (action: string, module: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      user_id: user?.id, client_id: activeClientId, action, module, metadata: {},
    });
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your workspace configuration" />

      <div className="flex gap-6 min-h-[600px]">
        {/* Settings Sidebar */}
        <div className="w-52 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-4">
            {sections.map(s => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <s.icon className={`h-3.5 w-3.5 ${active ? "text-primary" : ""}`} />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden w-full mb-4">
          <Select value={activeSection} onValueChange={setActiveSection}>
            <SelectTrigger className="bg-card border-border h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ─── GENERAL ─── */}
          {activeSection === "general" && (
            <>
              <SectionCard icon={Building2} title="Company Information" desc="Core business identity and contact details"
                action={<Button onClick={saveGeneral} size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs"><Save className="h-3 w-3 mr-1.5" /> Save</Button>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Business Name" value={general.business_name} onChange={setG("business_name")} placeholder="Your Company" />
                  <Field label="Owner Name" value={general.owner_name} onChange={setG("owner_name")} placeholder="John Smith" />
                  <Field label="Primary Email" value={general.owner_email} onChange={setG("owner_email")} placeholder="hello@company.com" type="email" />
                  <Field label="Primary Location" value={general.primary_location} onChange={setG("primary_location")} placeholder="Los Angeles, CA" />
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Timezone</label>
                    <Select value={general.timezone} onValueChange={setG("timezone")}>
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["America/Los_Angeles","America/Denver","America/Chicago","America/New_York","America/Phoenix","Pacific/Honolulu","Europe/London","Asia/Tokyo"].map(tz => (
                          <SelectItem key={tz} value={tz}>{tz.replace("_"," ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Industry" value={general.industry} onChange={setG("industry")} placeholder="Marketing, SaaS, etc." />
                  <Field label="Workspace Slug" value={general.workspace_slug} onChange={setG("workspace_slug")} placeholder="your-company" />
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Service Package</label>
                    <Select value={general.service_package} onValueChange={setG("service_package")}>
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ─── BRANDING ─── */}
          {activeSection === "branding" && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Button onClick={saveBranding} size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs"><Save className="h-3 w-3 mr-1.5" /> Save Branding</Button>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-8 rounded-xl text-xs">
                  <Eye className="h-3 w-3 mr-1.5" /> {showPreview ? "Hide" : "Preview"}
                </Button>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="h-5 w-5 rounded border" style={{ background: branding.primary_color }} />
                  <div className="h-5 w-5 rounded border" style={{ background: branding.secondary_color }} />
                </div>
              </div>

              {showPreview && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <div className="card-widget overflow-hidden mb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl p-4" style={{ background: branding.primary_color || "#3B82F6" }}>
                        <div className="flex items-center gap-2">
                          {branding.logo_url && <img src={branding.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain bg-white/20 p-0.5" />}
                          <div>
                            <p className="text-white text-sm font-bold">{branding.workspace_header_name || branding.company_name || "Company"}</p>
                            <p className="text-white/70 text-[10px]">{branding.tagline || "Tagline"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="card-widget !p-4 border border-border">
                        <p className="text-xs font-semibold text-foreground">{branding.dashboard_title || "Dashboard"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{branding.welcome_message || "Welcome"}</p>
                        <div className="flex gap-1 mt-2">
                          <div className="h-2 w-12 rounded-full" style={{ background: branding.primary_color }} />
                          <div className="h-2 w-8 rounded-full" style={{ background: branding.secondary_color }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        {branding.app_icon_url || branding.logo_url ? (
                          <img src={branding.app_icon_url || branding.logo_url} alt="" className="h-14 w-14 rounded-2xl object-contain shadow-lg bg-secondary p-1" />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg" style={{ background: branding.primary_color }}>
                            {(branding.company_name || "C")[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold">{branding.app_display_name || "App"}</p>
                          <p className="text-[10px] text-muted-foreground">Install</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <SectionCard icon={Building2} title="Identity" desc="Company name, titles, and messaging">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company Name" value={branding.company_name} onChange={setB("company_name")} placeholder="Your Company" />
                  <Field label="Display Name" value={branding.display_name} onChange={setB("display_name")} placeholder="Displayed name" />
                  <Field label="Dashboard Title" value={branding.dashboard_title} onChange={setB("dashboard_title")} placeholder="Dashboard" />
                  <Field label="Tagline" value={branding.tagline} onChange={setB("tagline")} placeholder="Your tagline" />
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Welcome Message</label>
                  <Textarea value={branding.welcome_message} onChange={e => setB("welcome_message")(e.target.value)} className="text-xs bg-secondary/50 min-h-[60px]" />
                </div>
              </SectionCard>

              <SectionCard icon={Palette} title="Brand Colors" desc="Primary, secondary, and accent">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ColorField label="Primary" value={branding.primary_color} onChange={setB("primary_color")} />
                  <ColorField label="Secondary" value={branding.secondary_color} onChange={setB("secondary_color")} />
                  <ColorField label="Accent" value={branding.accent_color} onChange={setB("accent_color")} />
                </div>
              </SectionCard>

              <SectionCard icon={Image} title="Logos & Assets" desc="Upload or paste URL">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LogoUploader value={branding.logo_url} onChange={setB("logo_url")} label="Primary Logo" dark={false} />
                  <LogoUploader value={branding.dashboard_logo_url} onChange={setB("dashboard_logo_url")} label="Dashboard Logo" dark={false} />
                  <LogoUploader value={branding.sidebar_logo_url} onChange={setB("sidebar_logo_url")} label="Sidebar Logo" dark={false} />
                  <LogoUploader value={branding.favicon_url} onChange={setB("favicon_url")} label="Favicon" dark={false} />
                  <LogoUploader value={branding.app_icon_url} onChange={setB("app_icon_url")} label="App Icon" dark={false} />
                  <LogoUploader value={branding.splash_logo_url} onChange={setB("splash_logo_url")} label="Splash Logo" dark={false} />
                  <LogoUploader value={branding.avatar_logo_url} onChange={setB("avatar_logo_url")} label="Avatar Icon" dark={false} />
                  <LogoUploader value={branding.report_logo_url} onChange={setB("report_logo_url")} label="Report Logo" dark={false} />
                </div>
              </SectionCard>

              <SectionCard icon={Calendar} title="Calendar Branding" desc="Booking page appearance">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Calendar Title" value={branding.calendar_title} onChange={setB("calendar_title")} placeholder="Schedule a Meeting" />
                  <Field label="Calendar Subtitle" value={branding.calendar_subtitle} onChange={setB("calendar_subtitle")} placeholder="Pick a time" />
                  <ColorField label="Calendar Color" value={branding.calendar_primary_color} onChange={setB("calendar_primary_color")} />
                  <LogoUploader value={branding.calendar_logo_url} onChange={setB("calendar_logo_url")} label="Calendar Logo" dark={false} />
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Confirmation Message</label>
                  <Textarea value={branding.calendar_confirmation_message} onChange={e => setB("calendar_confirmation_message")(e.target.value)} className="text-xs bg-secondary/50 min-h-[50px]" />
                </div>
              </SectionCard>

              <SectionCard icon={DollarSign} title="Finance & Tax Branding" desc="Report headers, tax module titles">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Finance Dashboard Title" value={branding.finance_dashboard_title} onChange={setB("finance_dashboard_title")} placeholder="Finance" />
                  <Field label="Report Header" value={branding.report_header_title} onChange={setB("report_header_title")} placeholder="Report" />
                  <Field label="Report Subtitle" value={branding.report_subtitle} onChange={setB("report_subtitle")} placeholder="Summary" />
                  <Field label="Tax Module Title" value={branding.tax_module_title} onChange={setB("tax_module_title")} placeholder="Tax Operations" />
                  <Field label="Payroll Header" value={branding.payroll_header_title} onChange={setB("payroll_header_title")} placeholder="Payroll" />
                  <Field label="Filing Readiness Title" value={branding.filing_readiness_title} onChange={setB("filing_readiness_title")} placeholder="Filing Readiness" />
                </div>
              </SectionCard>

              <SectionCard icon={Smartphone} title="App & Workspace" desc="PWA and workspace header branding">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="App Display Name" value={branding.app_display_name} onChange={setB("app_display_name")} placeholder="My App" />
                  <Field label="Workspace Header" value={branding.workspace_header_name} onChange={setB("workspace_header_name")} placeholder="Workspace" />
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Login Branding Text</label>
                  <Textarea value={branding.login_branding_text} onChange={e => setB("login_branding_text")(e.target.value)} className="text-xs bg-secondary/50 min-h-[50px]" />
                </div>
              </SectionCard>

              <Button onClick={saveBranding} className="btn-gradient h-10 px-6 rounded-xl text-sm font-semibold">
                <Save className="h-4 w-4 mr-2" /> Save All Branding
              </Button>
            </>
          )}

          {/* ─── CALENDAR SETTINGS ─── */}
          {activeSection === "calendar" && (
            <>
              <SectionCard icon={Calendar} title="Calendar Defaults" desc="Default meeting durations, buffers, and timezone"
                action={<Button size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs" onClick={() => { toast.success("Calendar settings saved!"); }}><Save className="h-3 w-3 mr-1.5" /> Save</Button>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Default Duration</label>
                    <Select defaultValue="30">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Buffer Before</label>
                    <Select defaultValue="5">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="5">5 min</SelectItem>
                        <SelectItem value="10">10 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Buffer After</label>
                    <Select defaultValue="10">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="5">5 min</SelectItem>
                        <SelectItem value="10">10 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Timezone</label>
                    <Select defaultValue="America/Los_Angeles">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["America/Los_Angeles","America/Denver","America/Chicago","America/New_York","Europe/London"].map(tz => (
                          <SelectItem key={tz} value={tz}>{tz.replace("_"," ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Clock} title="Reminder Defaults" desc="How and when appointment reminders are sent">
                <div className="space-y-3">
                  {[
                    { label: "24-hour reminder", desc: "Send 24 hours before appointment" },
                    { label: "3-hour reminder", desc: "Send 3 hours before appointment" },
                    { label: "30-minute reminder", desc: "Send 30 minutes before appointment" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium text-foreground">{r.label}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-foreground">Email Reminders</span></div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-foreground">SMS Reminders</span></div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Shield} title="Policies" desc="Reschedule and cancellation rules">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Cancellation Window</label>
                    <Select defaultValue="24">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour before</SelectItem>
                        <SelectItem value="3">3 hours before</SelectItem>
                        <SelectItem value="12">12 hours before</SelectItem>
                        <SelectItem value="24">24 hours before</SelectItem>
                        <SelectItem value="48">48 hours before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Reschedule Window</label>
                    <Select defaultValue="12">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour before</SelectItem>
                        <SelectItem value="3">3 hours before</SelectItem>
                        <SelectItem value="12">12 hours before</SelectItem>
                        <SelectItem value="24">24 hours before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between py-2">
                  <div><p className="text-sm font-medium text-foreground">Require cancellation reason</p><p className="text-xs text-muted-foreground">Ask prospects to explain their cancellation</p></div>
                  <Switch defaultChecked />
                </div>
              </SectionCard>
            </>
          )}

          {/* ─── FINANCE SETTINGS ─── */}
          {activeSection === "finance" && (
            <>
              <SectionCard icon={DollarSign} title="Finance Preferences" desc="Payroll, revenue, and reporting defaults"
                action={<Button size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs" onClick={() => toast.success("Finance settings saved!")}><Save className="h-3 w-3 mr-1.5" /> Save</Button>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Payroll Frequency</label>
                    <Select defaultValue="biweekly">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Report Cadence</label>
                    <Select defaultValue="monthly">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Sliders} title="Finance Controls" desc="Toggle features on or off">
                <div className="space-y-3">
                  {[
                    { label: "Payroll approval required", desc: "Require admin approval before payroll runs are finalized" },
                    { label: "Commission tracking enabled", desc: "Track commissions from closed deals" },
                    { label: "Manual adjustments allowed", desc: "Allow manual revenue and payroll corrections" },
                    { label: "Tax operations enabled", desc: "Show tax deadlines, document vault, and filing readiness" },
                    { label: "Payroll reminders", desc: "Send reminder when payroll draft is ready for approval" },
                    { label: "Tax deadline reminders", desc: "Send alerts before quarterly tax deadlines" },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium text-foreground">{f.label}</p><p className="text-xs text-muted-foreground">{f.desc}</p></div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {activeSection === "notifications" && (
            <>
              <SectionCard icon={Bell} title="Notification Channels" desc="Configure how notifications are delivered"
                action={<Button size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs" onClick={() => toast.success("Notification preferences saved!")}><Save className="h-3 w-3 mr-1.5" /> Save</Button>}
              >
                {[
                  { cat: "Booking & Calendar", items: [
                    { label: "Booking confirmations", email: true, sms: true, internal: true },
                    { label: "Booking reminders", email: true, sms: true, internal: false },
                    { label: "Cancellations / Reschedules", email: true, sms: true, internal: true },
                  ]},
                  { cat: "Sales & Demo", items: [
                    { label: "Demo asset delivery", email: true, sms: true, internal: true },
                    { label: "Invite emails", email: true, sms: false, internal: true },
                    { label: "Onboarding reminders", email: true, sms: false, internal: true },
                  ]},
                  { cat: "Finance & Tax", items: [
                    { label: "Payroll reminders", email: true, sms: false, internal: true },
                    { label: "Tax deadline reminders", email: true, sms: false, internal: true },
                    { label: "Finance reports ready", email: true, sms: false, internal: true },
                  ]},
                  { cat: "System", items: [
                    { label: "Integration status alerts", email: true, sms: false, internal: true },
                    { label: "Activity feed alerts", email: false, sms: false, internal: true },
                    { label: "Weekly performance reports", email: true, sms: false, internal: false },
                  ]},
                ].map(group => (
                  <div key={group.cat} className="mb-6 last:mb-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.cat}</p>
                    <div className="space-y-2">
                      {group.items.map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-sm text-foreground">{item.label}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <Switch defaultChecked={item.email} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <Switch defaultChecked={item.sms} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Bell className="h-3 w-3 text-muted-foreground" />
                              <Switch defaultChecked={item.internal} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </SectionCard>
            </>
          )}

          {/* ─── TEAM / USERS ─── */}
          {activeSection === "team" && (
            <>
              <SectionCard icon={Users} title="Team Members" desc="Manage workspace users and roles"
                action={<Button size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs"><UserPlus className="h-3 w-3 mr-1.5" /> Invite User</Button>}
              >
                <div className="space-y-3">
                  {[
                    { name: "Alex Johnson", email: "alex@company.com", role: "Client Owner", status: "Active", lastActive: "2 hours ago" },
                    { name: "Sarah Williams", email: "sarah@company.com", role: "Client Team", status: "Active", lastActive: "1 day ago" },
                    { name: "Mike Chen", email: "mike@company.com", role: "Client Team", status: "Active", lastActive: "3 hours ago" },
                    { name: "Lisa Park", email: "lisa@company.com", role: "Read Only", status: "Invited", lastActive: "Pending" },
                  ].map((u, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {u.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">{u.role}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{u.lastActive}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${u.status === "Active" ? "bg-primary/10 text-primary border-primary/20" : "bg-accent/10 text-accent border-accent/20"}`}>
                          {u.status}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {/* ─── INTEGRATIONS ─── */}
          {activeSection === "integrations" && (
            <>
              <SectionCard icon={Plug} title="Integration Preferences" desc="Default integration behavior and alerting">
                <div className="space-y-3">
                  {[
                    { label: "Alert on missing integrations", desc: "Show alerts when critical integrations are disconnected" },
                    { label: "Auto-create setup tasks", desc: "Create tasks for missing or failed integrations" },
                    { label: "Integration health reminders", desc: "Send periodic email about integration status" },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium text-foreground">{f.label}</p><p className="text-xs text-muted-foreground">{f.desc}</p></div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={Sliders} title="Default Sources" desc="Preferred data sources for each module">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Analytics Source</label>
                    <Select defaultValue="google_analytics">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_analytics">Google Analytics</SelectItem>
                        <SelectItem value="internal">Internal Tracking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Calendar Source</label>
                    <Select defaultValue="internal">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal Calendar</SelectItem>
                        <SelectItem value="google_calendar">Google Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Reminder Channel</label>
                    <Select defaultValue="both">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="sms">SMS Only</SelectItem>
                        <SelectItem value="both">Email + SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ─── SECURITY ─── */}
          {activeSection === "security" && (
            <>
              <SectionCard icon={Shield} title="Access Permissions" desc="Control who can edit workspace settings">
                <div className="space-y-3">
                  {[
                    { label: "Branding settings", desc: "Who can edit workspace branding" },
                    { label: "Finance settings", desc: "Who can access and edit finance configuration" },
                    { label: "Calendar settings", desc: "Who can manage calendar and booking settings" },
                    { label: "User management", desc: "Who can invite, edit, or deactivate users" },
                    { label: "Integration management", desc: "Who can connect or disconnect integrations" },
                  ].map(p => (
                    <div key={p.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium text-foreground">{p.label}</p><p className="text-xs text-muted-foreground">{p.desc}</p></div>
                      <Select defaultValue="owner_up">
                        <SelectTrigger className="h-8 w-40 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin_only">Admin Only</SelectItem>
                          <SelectItem value="admin_operator">Admin & Operator</SelectItem>
                          <SelectItem value="owner_up">Owner & Above</SelectItem>
                          <SelectItem value="team_up">All Team Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={Shield} title="Workspace Security" desc="Access controls and restrictions">
                <div className="space-y-3">
                  {[
                    { label: "Invite-only workspace", desc: "Only invited users can access this workspace" },
                    { label: "Require email verification", desc: "Users must verify their email before access" },
                    { label: "Show activity logs to clients", desc: "Allow client users to see workspace activity" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium text-foreground">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {/* ─── WORKSPACE PREFERENCES ─── */}
          {activeSection === "workspace" && (
            <>
              <SectionCard icon={Sliders} title="Workspace Preferences" desc="Display and behavior settings"
                action={<Button size="sm" className="btn-gradient h-8 px-4 rounded-xl text-xs" onClick={() => toast.success("Preferences saved!")}><Save className="h-3 w-3 mr-1.5" /> Save</Button>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Default Landing Page</label>
                    <Select defaultValue="dashboard">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="ai-insights">AI Insights</SelectItem>
                        <SelectItem value="calendar">Calendar</SelectItem>
                        <SelectItem value="crm">CRM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Date Format</label>
                    <Select defaultValue="mdy">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Time Format</label>
                    <Select defaultValue="12h">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Locale</label>
                    <Select defaultValue="en-US">
                      <SelectTrigger className="h-9 text-xs bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={SettingsIcon} title="Display Options" desc="UI and footer preferences">
                <div className="space-y-3">
                  {[
                    { label: "Show onboarding progress bar", desc: "Display setup progress on the dashboard" },
                    { label: "Compact sidebar mode", desc: "Use a narrower sidebar by default" },
                    { label: "Enable dark mode toggle", desc: "Allow users to switch between light and dark modes" },
                  ].map(d => (
                    <div key={d.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium text-foreground">{d.label}</p><p className="text-xs text-muted-foreground">{d.desc}</p></div>
                      <Switch defaultChecked={d.label.includes("Powered")} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
