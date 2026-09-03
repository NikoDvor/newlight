import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, Plus, Save, Trash2, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface MergeField { key: string; label: string; }

export default function ClientAgreementTemplate() {
  const { activeClientId } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Client Agreement");
  const [body, setBody] = useState("");
  const [fields, setFields] = useState<MergeField[]>([]);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("client_agreement_templates")
        .select("id, template_name, template_body, merge_fields")
        .eq("client_id", activeClientId)
        .eq("is_active", true)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setRowId(data.id);
        setTemplateName(data.template_name || "Client Agreement");
        setBody(data.template_body || "");
        const mf = Array.isArray(data.merge_fields) ? (data.merge_fields as any[]) : [];
        setFields(mf.map((f) => ({ key: String(f?.key ?? ""), label: String(f?.label ?? "") })));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [activeClientId]);

  const detectedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const m of body.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) set.add(m[1]);
    return Array.from(set);
  }, [body]);

  const undefinedKeys = detectedKeys.filter((k) => !fields.some((f) => f.key === k));

  const save = async () => {
    if (!activeClientId) return toast.error("No active workspace");
    if (!body.trim()) return toast.error("Agreement body is empty");
    setSaving(true);
    const payload = {
      client_id: activeClientId,
      template_name: templateName.trim() || "Client Agreement",
      template_body: body,
      merge_fields: fields.filter((f) => f.key.trim()).map((f) => ({ key: f.key.trim(), label: f.label.trim() })),
      is_active: true,
    };
    const res = rowId
      ? await supabase.from("client_agreement_templates").update(payload as any).eq("id", rowId).select("id").single()
      : await supabase.from("client_agreement_templates").insert(payload as any).select("id").single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    setRowId(res.data!.id);
    toast.success("Agreement template saved");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <FileSignature className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Agreement Template</h1>
          <p className="text-sm text-muted-foreground">
            Your own agreement, stored once and reused for e-signature. Sign-only — no payment is collected in this flow.
          </p>
        </div>
      </div>

      <Card className="p-4 border-amber-500/40 bg-amber-500/10">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            <strong>This is your own agreement — NewLight does not draft or review this content.</strong>{" "}
            Have your own attorney prepare and review it before use.
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <>
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Template name</label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="max-w-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Agreement body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder={"This Agreement is entered into by {{client_name}} on {{start_date}}…"}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Use <code className="px-1 rounded bg-muted">{"{{merge_field}}"}</code> placeholders anywhere in the text. Examples:{" "}
                <code className="px-1 rounded bg-muted">{"{{client_name}}"}</code>,{" "}
                <code className="px-1 rounded bg-muted">{"{{start_date}}"}</code>,{" "}
                <code className="px-1 rounded bg-muted">{"{{monthly_fee}}"}</code>. Anything left unfilled stays visible as{" "}
                <code className="px-1 rounded bg-muted">{"{{missing_field}}"}</code> so gaps are obvious.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Merge Fields</h2>
                <p className="text-xs text-muted-foreground">Define the key used in the text and a human label for whoever fills it in.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setFields((f) => [...f, { key: "", label: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Add field
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No merge fields defined yet.</p>
            )}

            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input
                    value={f.key}
                    placeholder="client_name"
                    onChange={(e) => setFields((prev) => prev.map((p, j) => (j === i ? { ...p, key: e.target.value } : p)))}
                  />
                  <Input
                    value={f.label}
                    placeholder="Client Full Name"
                    onChange={(e) => setFields((prev) => prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)))}
                  />
                  <Button size="icon" variant="ghost" onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {undefinedKeys.length > 0 && (
              <p className="text-xs text-amber-500">
                Used in the body but not defined here: {undefinedKeys.map((k) => `{{${k}}}`).join(", ")}
              </p>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save template
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
