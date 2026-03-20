import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Save, Eye, Building2, Type, Image, Calendar, DollarSign, FileText, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogoUploader } from "@/components/LogoUploader";
import { BackArrow } from "@/components/BackArrow";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitEvent } from "@/lib/automationEngine";

const Field = ({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
    <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-xs bg-secondary/50" />
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

const SectionCard = ({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) => (
  <motion.div className="card-widget" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
    <div className="flex items-center gap-2 mb-4">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
    {children}
  </motion.div>
);

const defaultForm = {
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

export default function BrandingSettings() {
  const { activeClientId, setActiveClientId } = useWorkspace();
  const [form, setForm] = useState(defaultForm);
  const [showPreview, setShowPreview] = useState(false);

  const set = (key: string) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("client_branding").select("*").eq("client_id", activeClientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const merged = { ...defaultForm };
          Object.keys(merged).forEach(k => {
            if ((data as any)[k] != null) (merged as any)[k] = (data as any)[k];
          });
          setForm(merged);
        }
      });
  }, [activeClientId]);

  const handleSave = async () => {
    if (!activeClientId) return;
    const { error } = await supabase.from("client_branding").upsert({
      client_id: activeClientId,
      ...form,
    } as any, { onConflict: "client_id" });
    if (error) { toast.error(error.message); return; }

    // Audit log
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      user_id: user?.id, client_id: activeClientId, action: "branding_updated",
      module: "branding", metadata: { updated_fields: Object.keys(form) },
    });

    // Emit event for automation + setup center sync
    const hasBrand = !!(form.logo_url && form.primary_color && form.primary_color !== "#3B82F6");
    await emitEvent({
      eventKey: hasBrand ? "onboarding_section_completed" : "onboarding_form_saved",
      clientId: activeClientId,
      payload: { section: "branding", complete: hasBrand },
    });

    // Force workspace context to re-fetch branding
    setActiveClientId(null);
    setTimeout(() => setActiveClientId(activeClientId), 50);

    toast.success("Branding settings saved!");
  };

  return (
    <div className="max-w-4xl">
      <BackArrow to="/settings" label="Settings" />
      <PageHeader title="Branding Settings" description="Customize your workspace appearance across all modules" />

      <div className="flex items-center gap-3 mb-6">
        <Button onClick={handleSave} className="btn-gradient h-9 px-5 rounded-xl text-xs font-semibold">
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save All Branding
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-9 rounded-xl text-xs">
          <Eye className="h-3.5 w-3.5 mr-1.5" /> {showPreview ? "Hide Preview" : "Live Preview"}
        </Button>
        {form.primary_color && (
          <div className="flex items-center gap-2 ml-2">
            <div className="h-6 w-6 rounded-md border" style={{ background: form.primary_color }} />
            <div className="h-6 w-6 rounded-md border" style={{ background: form.secondary_color }} />
            {form.accent_color && <div className="h-6 w-6 rounded-md border" style={{ background: form.accent_color }} />}
          </div>
        )}
      </div>

      {showPreview && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-6">
          <div className="card-widget overflow-hidden">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Header Preview */}
              <div className="rounded-xl p-4" style={{ background: form.primary_color || "#3B82F6" }}>
                <div className="flex items-center gap-2">
                  {form.logo_url && <img src={form.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain bg-white/20 p-0.5" />}
                  <div>
                    <p className="text-white text-sm font-bold">{form.workspace_header_name || form.company_name || "Your Company"}</p>
                    <p className="text-white/70 text-[10px]">{form.tagline || "Tagline"}</p>
                  </div>
                </div>
              </div>
              {/* Dashboard Preview */}
              <div className="card-widget !p-4 border border-border">
                <p className="text-xs font-semibold text-foreground">{form.dashboard_title || "Dashboard"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{form.welcome_message || "Welcome to your dashboard"}</p>
                <div className="flex gap-1 mt-2">
                  <div className="h-2 w-12 rounded-full" style={{ background: form.primary_color }} />
                  <div className="h-2 w-8 rounded-full" style={{ background: form.secondary_color }} />
                </div>
              </div>
              {/* App Icon Preview */}
              <div className="flex items-center justify-center gap-3">
                {form.app_icon_url ? (
                  <img src={form.app_icon_url} alt="App Icon" className="h-14 w-14 rounded-2xl object-contain shadow-lg" />
                ) : form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-14 w-14 rounded-2xl object-contain shadow-lg bg-secondary p-1" />
                ) : (
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg" style={{ background: form.primary_color }}>
                    {(form.company_name || "C")[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold">{form.app_display_name || "App"}</p>
                  <p className="text-[10px] text-muted-foreground">Install Preview</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="identity" className="text-xs"><Building2 className="h-3 w-3 mr-1" /> Identity</TabsTrigger>
          <TabsTrigger value="colors" className="text-xs"><Palette className="h-3 w-3 mr-1" /> Colors</TabsTrigger>
          <TabsTrigger value="logos" className="text-xs"><Image className="h-3 w-3 mr-1" /> Logos</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs"><Calendar className="h-3 w-3 mr-1" /> Calendar</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs"><DollarSign className="h-3 w-3 mr-1" /> Finance</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Tax</TabsTrigger>
          <TabsTrigger value="app" className="text-xs"><Smartphone className="h-3 w-3 mr-1" /> App</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <SectionCard icon={Building2} title="Basic Identity" desc="Company name, titles, and messaging">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name" value={form.company_name} onChange={set("company_name")} placeholder="Your Company" />
              <Field label="Display Name" value={form.display_name} onChange={set("display_name")} placeholder="Displayed in workspace" />
              <Field label="Dashboard Title" value={form.dashboard_title} onChange={set("dashboard_title")} placeholder="Dashboard" />
              <Field label="Tagline" value={form.tagline} onChange={set("tagline")} placeholder="Your business tagline" />
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Welcome Message</label>
              <Textarea value={form.welcome_message} onChange={e => set("welcome_message")(e.target.value)} className="text-xs bg-secondary/50 min-h-[60px]" placeholder="Welcome to your business dashboard" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="colors">
          <SectionCard icon={Palette} title="Brand Colors" desc="Primary, secondary, and accent colors">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ColorField label="Primary Color" value={form.primary_color} onChange={set("primary_color")} />
              <ColorField label="Secondary Color" value={form.secondary_color} onChange={set("secondary_color")} />
              <ColorField label="Accent Color" value={form.accent_color} onChange={set("accent_color")} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Button Preview:</span>
              <button className="h-8 px-4 rounded-lg text-xs font-semibold text-white" style={{ background: form.primary_color }}>Primary</button>
              <button className="h-8 px-4 rounded-lg text-xs font-semibold text-white" style={{ background: form.secondary_color }}>Secondary</button>
              {form.accent_color && <button className="h-8 px-4 rounded-lg text-xs font-semibold text-white" style={{ background: form.accent_color }}>Accent</button>}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="logos">
          <SectionCard icon={Image} title="Logo & Visual Assets" desc="Upload or paste URL for each branding asset">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LogoUploader value={form.logo_url} onChange={set("logo_url")} label="Primary Logo" dark={false} />
              <LogoUploader value={form.dashboard_logo_url} onChange={set("dashboard_logo_url")} label="Dashboard Logo" dark={false} />
              <LogoUploader value={form.sidebar_logo_url} onChange={set("sidebar_logo_url")} label="Sidebar Logo" dark={false} />
              <LogoUploader value={form.favicon_url} onChange={set("favicon_url")} label="Favicon" dark={false} />
              <LogoUploader value={form.app_icon_url} onChange={set("app_icon_url")} label="App Icon (192×192+)" dark={false} />
              <LogoUploader value={form.splash_logo_url} onChange={set("splash_logo_url")} label="Splash Logo" dark={false} />
              <LogoUploader value={form.avatar_logo_url} onChange={set("avatar_logo_url")} label="Avatar / Small Icon" dark={false} />
              <LogoUploader value={form.report_logo_url || ""} onChange={set("report_logo_url")} label="Report / PDF Logo" dark={false} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="calendar">
          <SectionCard icon={Calendar} title="Calendar Branding" desc="Customize your booking and scheduling experience">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Calendar Title" value={form.calendar_title} onChange={set("calendar_title")} placeholder="Schedule a Meeting" />
              <Field label="Calendar Subtitle" value={form.calendar_subtitle} onChange={set("calendar_subtitle")} placeholder="Pick a time that works" />
              <ColorField label="Calendar Primary Color" value={form.calendar_primary_color} onChange={set("calendar_primary_color")} />
              <LogoUploader value={form.calendar_logo_url} onChange={set("calendar_logo_url")} label="Calendar Logo" dark={false} />
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Confirmation Message</label>
              <Textarea value={form.calendar_confirmation_message} onChange={e => set("calendar_confirmation_message")(e.target.value)} className="text-xs bg-secondary/50 min-h-[60px]" placeholder="Your appointment has been confirmed!" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="finance">
          <SectionCard icon={DollarSign} title="Finance & Report Branding" desc="Customize finance dashboard and report headers">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Finance Dashboard Title" value={form.finance_dashboard_title} onChange={set("finance_dashboard_title")} placeholder="Finance" />
              <Field label="Report Header Title" value={form.report_header_title} onChange={set("report_header_title")} placeholder="Performance Report" />
              <Field label="Report Subtitle" value={form.report_subtitle} onChange={set("report_subtitle")} placeholder="Monthly Summary" />
              <LogoUploader value={form.report_logo_url || ""} onChange={set("report_logo_url")} label="Report Logo" dark={false} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="tax">
          <SectionCard icon={FileText} title="Tax Operations Branding" desc="Customize tax module, payroll, and filing headers">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tax Module Title" value={form.tax_module_title} onChange={set("tax_module_title")} placeholder="Tax Operations" />
              <Field label="Tax Dashboard Subtitle" value={form.tax_dashboard_subtitle} onChange={set("tax_dashboard_subtitle")} placeholder="Tax prep and filing management" />
              <Field label="Tax Report Header" value={form.tax_report_header_title} onChange={set("tax_report_header_title")} placeholder="Tax Report" />
              <Field label="Tax Reminder Header" value={form.tax_reminder_header_text} onChange={set("tax_reminder_header_text")} placeholder="Tax Deadlines" />
              <Field label="Document Vault Title" value={form.tax_document_vault_title} onChange={set("tax_document_vault_title")} placeholder="Document Vault" />
              <Field label="Filing Readiness Title" value={form.filing_readiness_title} onChange={set("filing_readiness_title")} placeholder="Filing Readiness" />
              <Field label="Payroll Header Title" value={form.payroll_header_title} onChange={set("payroll_header_title")} placeholder="Payroll" />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="app">
          <SectionCard icon={Smartphone} title="App & Workspace Branding" desc="PWA install name, workspace header, and login branding">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="App Display Name" value={form.app_display_name} onChange={set("app_display_name")} placeholder="My Business App" />
              <Field label="Workspace Header Name" value={form.workspace_header_name} onChange={set("workspace_header_name")} placeholder="Your Workspace" />
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Login / Welcome Branding Text</label>
              <Textarea value={form.login_branding_text} onChange={e => set("login_branding_text")(e.target.value)} className="text-xs bg-secondary/50 min-h-[60px]" placeholder="Welcome to your business dashboard" />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={handleSave} className="btn-gradient h-10 px-6 rounded-xl text-sm font-semibold">
          <Save className="h-4 w-4 mr-2" /> Save All Branding
        </Button>
      </div>
    </div>
  );
}
