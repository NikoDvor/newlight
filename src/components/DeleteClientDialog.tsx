import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Archive, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: { id: string; business_name: string } | null;
  onComplete: () => void;
}

export function DeleteClientDialog({ open, onOpenChange, client, onComplete }: DeleteClientDialogProps) {
  const [step, setStep] = useState<"choose" | "confirm_archive" | "confirm_delete">("choose");
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setStep("choose");
    setConfirmText("");
    setReason("");
    setProcessing(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleArchive = async () => {
    if (!client) return;
    setProcessing(true);
    try {
      await supabase.from("clients").update({ status: "archived" }).eq("id", client.id);
      await supabase.from("audit_logs").insert({
        action: "client_archived",
        client_id: client.id,
        module: "clients",
        metadata: { deletion_type: "archive", reason: reason || null },
      });
      toast.success(`${client.business_name} archived`);
      handleOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!client || confirmText !== client.business_name) return;
    setProcessing(true);
    try {
      // Delete related records
      await Promise.all([
        supabase.from("client_branding").delete().eq("client_id", client.id),
        supabase.from("client_health_scores").delete().eq("client_id", client.id),
        supabase.from("client_integrations").delete().eq("client_id", client.id),
        supabase.from("onboarding_progress").delete().eq("client_id", client.id),
        supabase.from("provision_queue").delete().eq("client_id", client.id),
        supabase.from("fix_now_items").delete().eq("client_id", client.id),
        supabase.from("revenue_opportunities").delete().eq("client_id", client.id),
        supabase.from("ai_business_insights").delete().eq("client_id", client.id),
        supabase.from("growth_projections").delete().eq("client_id", client.id),
        supabase.from("automation_events").delete().eq("client_id", client.id),
        supabase.from("client_reports").delete().eq("client_id", client.id),
        supabase.from("report_schedules").delete().eq("client_id", client.id),
        supabase.from("meeting_intelligence").delete().eq("client_id", client.id),
        supabase.from("user_roles").delete().eq("client_id", client.id),
      ]);

      // Log before deleting client
      await supabase.from("audit_logs").insert({
        action: "client_permanently_deleted",
        module: "clients",
        metadata: { business_name: client.business_name, client_id: client.id, deletion_type: "permanent", reason: reason || null },
      });

      await supabase.from("clients").delete().eq("id", client.id);
      toast.success(`${client.business_name} permanently deleted`);
      handleOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            {step === "choose" ? "Delete or Archive Client" : step === "confirm_archive" ? "Archive Client" : "Permanently Delete Client"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === "choose"
              ? `Choose what to do with "${client.business_name}".`
              : step === "confirm_archive"
              ? `Archiving will remove this client from active lists while preserving all records.`
              : `This action is irreversible. All workspace data for "${client.business_name}" will be permanently removed.`
            }
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 mt-2">
            <Button
              onClick={() => setStep("confirm_archive")}
              className="w-full justify-start bg-[hsla(211,96%,60%,.08)] hover:bg-[hsla(211,96%,60%,.15)] text-white border border-white/10 h-auto py-3 px-4"
              variant="outline"
            >
              <Archive className="h-4 w-4 mr-3 text-[hsl(var(--nl-sky))]" />
              <div className="text-left">
                <p className="text-sm font-medium">Archive (Recommended)</p>
                <p className="text-[11px] text-white/40">Hide from active lists, preserve all history</p>
              </div>
            </Button>
            <Button
              onClick={() => setStep("confirm_delete")}
              variant="outline"
              className="w-full justify-start bg-red-500/5 hover:bg-red-500/10 text-white border border-red-500/20 h-auto py-3 px-4"
            >
              <Trash2 className="h-4 w-4 mr-3 text-red-400" />
              <div className="text-left">
                <p className="text-sm font-medium">Permanent Delete</p>
                <p className="text-[11px] text-white/40">Irreversible — removes all workspace data</p>
              </div>
            </Button>
          </div>
        )}

        {step === "confirm_archive" && (
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Reason (optional)</label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why are you archiving this client?"
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 min-h-[60px]"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("choose")} className="border-white/10 text-white hover:bg-white/10">Back</Button>
              <Button onClick={handleArchive} disabled={processing} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                Archive Client
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "confirm_delete" && (
          <div className="space-y-3 mt-2">
            <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-300">
                This will permanently delete the workspace, all integrations, branding, health scores, reports, and user role assignments for this client.
              </p>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">
                Type <span className="text-white font-semibold">"{client.business_name}"</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={client.business_name}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Reason (optional)</label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for deletion"
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 min-h-[50px]"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("choose")} className="border-white/10 text-white hover:bg-white/10">Back</Button>
              <Button
                onClick={handlePermanentDelete}
                disabled={processing || confirmText !== client.business_name}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete Forever
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
