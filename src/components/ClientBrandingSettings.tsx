import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Save, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function ClientBrandingSettings() {
  const { activeClientId } = useWorkspace();
  const [form, setForm] = useState({
    logo_url: "",
    primary_color: "#3B82F6",
    secondary_color: "#06B6D4",
    company_name: "",
    welcome_message: "Welcome to your business dashboard",
    app_icon_url: "",
    splash_logo_url: "",
    app_display_name: "",
  });

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("client_branding").select("*").eq("client_id", activeClientId).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || "#3B82F6",
          secondary_color: data.secondary_color || "#06B6D4",
          company_name: data.company_name || "",
          welcome_message: data.welcome_message || "",
        });
      });
  }, [activeClientId]);

  const handleSave = async () => {
    if (!activeClientId) return;
    const { error } = await supabase.from("client_branding").upsert({
      client_id: activeClientId,
      ...form,
    }, { onConflict: "client_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Branding updated!");
  };

  return (
    <motion.div className="card-widget"
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
          <Palette className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Workspace Branding</p>
          <p className="text-xs text-muted-foreground">Customize your workspace appearance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Company Name</label>
          <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
            placeholder="Your Company" className="h-9 text-xs bg-secondary/50" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Logo URL</label>
          <Input value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
            placeholder="https://..." className="h-9 text-xs bg-secondary/50" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Primary Color</label>
          <div className="flex gap-2">
            <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
              className="h-9 w-9 rounded-lg border-0 cursor-pointer" />
            <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
              className="h-9 text-xs bg-secondary/50 flex-1" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Secondary Color</label>
          <div className="flex gap-2">
            <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))}
              className="h-9 w-9 rounded-lg border-0 cursor-pointer" />
            <Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))}
              className="h-9 text-xs bg-secondary/50 flex-1" />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Welcome Message</label>
        <Textarea value={form.welcome_message} onChange={e => setForm(p => ({ ...p, welcome_message: e.target.value }))}
          className="text-xs bg-secondary/50 min-h-[60px]" />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} size="sm" className="btn-gradient h-9 px-5 rounded-xl text-xs font-semibold">
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save Branding
        </Button>
        {form.primary_color && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Preview:</span>
            <div className="h-6 w-6 rounded-md" style={{ background: form.primary_color }} />
            <div className="h-6 w-6 rounded-md" style={{ background: form.secondary_color }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
