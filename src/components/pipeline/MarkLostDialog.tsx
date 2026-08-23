import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LOST_REASONS, LOST_STAGE_VALUE, type LostReason } from "@/lib/pipelineRevenue";
import { XCircle } from "lucide-react";

/**
 * Shared "Mark Lost" flow. Requires a reason, then writes
 * pipeline_stage = 'lost', lost_reason and lost_at in one update so the
 * revenue widget's loss analytics can never go blind.
 */
export function MarkLostDialog({
  open,
  onOpenChange,
  dealId,
  dealName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dealId: string | null;
  dealName?: string | null;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState<LostReason | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!dealId || !reason || saving) return;
    setSaving(true);
    const patch: Record<string, unknown> = {
      pipeline_stage: LOST_STAGE_VALUE,
      status: "lost",
      lost_reason: reason,
      lost_at: new Date().toISOString(),
    };
    if (note.trim()) patch.closing_notes = note.trim();
    const { error } = await (supabase as any).from("crm_deals").update(patch).eq("id", dealId);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not mark this deal lost");
      return;
    }
    toast.success("Deal marked lost");
    setReason(null);
    setNote("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="h-4 w-4" style={{ color: "hsl(0 68% 58%)" }} />
            Mark deal lost
          </DialogTitle>
          <DialogDescription className="text-xs">
            {dealName ? `“${dealName}” — ` : ""}a reason is required. Price and timing losses
            automatically become win-back candidates after 60 days.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {LOST_REASONS.map((r) => {
            const active = reason === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className="rounded-lg px-3 py-2.5 text-xs font-medium text-left transition-colors"
                style={{
                  background: active ? "hsla(0,68%,58%,.14)" : "hsla(215,35%,12%,.7)",
                  border: `1px solid ${active ? "hsla(0,68%,58%,.5)" : "hsla(211,96%,60%,.12)"}`,
                  color: active ? "hsl(0 72% 72%)" : "hsl(var(--muted-foreground))",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional context for the re-touch list…"
          className="text-xs min-h-[70px]"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!reason || saving} onClick={submit}>
            {saving ? "Saving…" : "Mark lost"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MarkLostDialog;
