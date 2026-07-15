import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Info } from "lucide-react";
import { emitEvent } from "@/lib/automationEngine";

type DisclosureMethod = "embedded" | "linked" | "verbal_disclosed";

interface Promoter {
  id: string;
  full_name: string;
  client_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promoterId?: string | null;
  materialId?: string | null;
  onSaved?: () => void;
}

export function TestimonialFormDialog({ open, onOpenChange, promoterId, materialId, onSaved }: Props) {
  const { user, activeClientId } = useWorkspace();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [form, setForm] = useState({
    promoter_id: promoterId ?? "",
    material_id: materialId ?? "",
    testimonial_text: "",
    disclosed_client_status: false,
    disclosed_compensation: false,
    disclosed_conflicts: false,
    disclosure_method: "embedded" as DisclosureMethod,
    disclosure_delivered_at: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !activeClientId) return;
    setForm((f) => ({
      ...f,
      promoter_id: promoterId ?? f.promoter_id,
      material_id: materialId ?? f.material_id,
    }));
    supabase
      .from("promoters")
      .select("id, full_name, client_id")
      .eq("client_id", activeClientId)
      .then(({ data }) => setPromoters((data as any[]) ?? []));
  }, [open, activeClientId, promoterId, materialId]);

  const allDisclosed =
    form.disclosed_client_status && form.disclosed_compensation && form.disclosed_conflicts;
  const wantsLink = !!form.material_id;

  const submit = async () => {
    if (!activeClientId) { toast.error("No client selected"); return; }
    if (!form.promoter_id) { toast.error("Select a promoter"); return; }
    if (!form.testimonial_text.trim()) { toast.error("Testimonial text required"); return; }
    if (wantsLink && !allDisclosed) {
      toast.error("All three disclosures required to link to a marketing material");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("testimonials").insert({
      client_id: activeClientId,
      promoter_id: form.promoter_id,
      material_id: form.material_id || null,
      testimonial_text: form.testimonial_text,
      disclosed_client_status: form.disclosed_client_status,
      disclosed_compensation: form.disclosed_compensation,
      disclosed_conflicts: form.disclosed_conflicts,
      disclosure_method: form.disclosure_method,
      disclosure_delivered_at: form.disclosure_delivered_at || null,
      created_by: user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    if (wantsLink && !allDisclosed) {
      await emitEvent({
        eventKey: "testimonial_disclosure_incomplete" as any,
        clientId: activeClientId,
        relatedType: "testimonial",
        payload: { promoter_id: form.promoter_id, material_id: form.material_id },
      });
    }

    toast.success("Testimonial recorded");
    onOpenChange(false);
    setForm({
      promoter_id: "", material_id: "", testimonial_text: "",
      disclosed_client_status: false, disclosed_compensation: false, disclosed_conflicts: false,
      disclosure_method: "embedded", disclosure_delivered_at: "",
    });
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Testimonial / Endorsement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Promoter</Label>
            <Select
              value={form.promoter_id}
              onValueChange={(v) => setForm({ ...form, promoter_id: v })}
              disabled={!!promoterId}
            >
              <SelectTrigger><SelectValue placeholder="Select promoter" /></SelectTrigger>
              <SelectContent>
                {promoters.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Testimonial Text</Label>
            <Textarea
              rows={4}
              value={form.testimonial_text}
              onChange={(e) => setForm({ ...form, testimonial_text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Required Disclosures (all three)</Label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.disclosed_client_status}
                onCheckedChange={(c) => setForm({ ...form, disclosed_client_status: !!c })}
                className="mt-0.5"
              />
              <span>Client / non-client status of promoter was disclosed.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.disclosed_compensation}
                onCheckedChange={(c) => setForm({ ...form, disclosed_compensation: !!c })}
                className="mt-0.5"
              />
              <span>Cash or non-cash compensation was disclosed.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.disclosed_conflicts}
                onCheckedChange={(c) => setForm({ ...form, disclosed_conflicts: !!c })}
                className="mt-0.5"
              />
              <span>Material conflicts of interest were disclosed.</span>
            </label>
            {wantsLink && !allDisclosed && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Linking to a marketing material is blocked (DB-enforced) until all three are confirmed.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Disclosure Method</Label>
              <Select
                value={form.disclosure_method}
                onValueChange={(v) => setForm({ ...form, disclosure_method: v as DisclosureMethod })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="embedded">Embedded (in the material)</SelectItem>
                  <SelectItem value="linked">Linked (hyperlink)</SelectItem>
                  <SelectItem value="verbal_disclosed">Verbal / disclosed live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivered At</Label>
              <Input
                type="datetime-local"
                value={form.disclosure_delivered_at}
                onChange={(e) => setForm({ ...form, disclosure_delivered_at: e.target.value })}
              />
            </div>
          </div>

          {form.disclosure_method === "linked" && (
            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md p-2 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                SEC Marketing Rule guidance flags hyperlinked-only disclosures as potentially
                insufficiently prominent. This is informational — compliance judgment required.
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save Testimonial"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
