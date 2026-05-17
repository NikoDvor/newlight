import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface SopRow {
  company_intro: string;
  sales_process: string;
  core_offer: string;
  scripts: string;
}

const EMPTY: SopRow = { company_intro: "", sales_process: "", core_offer: "", scripts: "" };

export default function AdminClientSOP() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [form, setForm] = useState<SopRow>(EMPTY);

  useEffect(() => {
    (async () => {
      if (!clientId) return;
      const [{ data: client }, { data: sop }] = await Promise.all([
        (supabase as any).from("clients").select("business_name").eq("id", clientId).maybeSingle(),
        (supabase as any).from("client_training_sop")
          .select("company_intro, sales_process, core_offer, scripts")
          .eq("client_id", clientId)
          .maybeSingle(),
      ]);
      setBusinessName(client?.business_name || "Client");
      if (sop) setForm(sop as SopRow);
      setLoading(false);
    })();
  }, [clientId]);

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("client_training_sop")
      .upsert({
        client_id: clientId,
        ...form,
        updated_by: user?.id ?? null,
      }, { onConflict: "client_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "SOP saved", description: "Module 1 & 2 will now use this client's content for their employees." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  const fields: { key: keyof SopRow; label: string; placeholder: string; help: string }[] = [
    {
      key: "company_intro",
      label: "Company Introduction",
      placeholder: "Who you are, what you do, the story behind the business…",
      help: "Becomes Module 1 · Chapter 1 for this client's employees.",
    },
    {
      key: "core_offer",
      label: "Core Offer",
      placeholder: "What you sell, the outcome it delivers, why it's worth it…",
      help: "Becomes Module 1 · Chapter 2 for this client's employees.",
    },
    {
      key: "sales_process",
      label: "Sales Process",
      placeholder: "Step by step: how a lead becomes a customer at your company…",
      help: "Becomes Module 2 · Chapter 1 for this client's employees.",
    },
    {
      key: "scripts",
      label: "Scripts",
      placeholder: "Opener, qualifying questions, pitch, close, common objections…",
      help: "Becomes Module 2 · Chapter 2 for this client's employees.",
    },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="text-white/60">
          <ArrowLeft className="h-4 w-4 mr-1" /> Clients
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 mb-1">
          <FileText className="h-3.5 w-3.5" /> Client SOP — Training Content
        </div>
        <h1 className="text-2xl font-bold text-white">{businessName}</h1>
        <p className="text-sm text-white/55 mt-1">
          What you enter here replaces the default NewLight content in <span className="text-white/80">Module 1</span> and <span className="text-white/80">Module 2</span> of the Training Center for this client's employees. Modules 3–10 remain standard NewLight training.
        </p>
      </div>

      <Card className="border-0 bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">Onboarding SOP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-white/60">{f.label}</Label>
              <Textarea
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={8}
                className="bg-white/[0.04] border-white/10 focus:border-[hsl(211,96%,56%)] text-sm text-white"
              />
              <p className="text-[11px] text-white/40">{f.help}</p>
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => navigate("/admin/clients")} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save SOP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
