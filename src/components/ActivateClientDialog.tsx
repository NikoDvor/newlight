import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { provisionWorkspaceDefaults } from "@/lib/workspaceProvisioner";
import {
  Loader2, CheckCircle2, CreditCard, ClipboardCheck, AlertCircle,
  Zap, UserPlus, DollarSign
} from "lucide-react";
import { toast } from "sonner";

interface ActivateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    business_name: string;
    owner_email: string | null;
    owner_name: string | null;
    industry: string | null;
    onboarding_stage: string;
  } | null;
  onComplete: () => void;
}

type ActivateStatus = "idle" | "activating" | "done" | "error";

export function ActivateClientDialog({ open, onOpenChange, client, onComplete }: ActivateClientDialogProps) {
  const [status, setStatus] = useState<ActivateStatus>("idle");
  const [form, setForm] = useState({
    payment_confirmed: "confirmed",
    payment_method: "credit_card",
    monthly_fee: "",
    setup_fee: "",
    assigned_account_manager: "",
    internal_notes: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
  const labelCls = "text-xs text-white/50 mb-1 block";

  const handleActivate = async () => {
    if (!client) return;
    if (form.payment_confirmed !== "confirmed") {
      toast.error("Payment must be confirmed before activation");
      return;
    }

    setStatus("activating");
    try {
      // 1. Run full-app provisioning (idempotent — skips existing)
      await provisionWorkspaceDefaults(client.id, {
        industry: client.industry,
        skipIfExists: true,
        ownerEmail: client.owner_email,
        ownerName: client.owner_name,
      });

      // 2. Update billing account
      await supabase.from("billing_accounts").upsert({
        client_id: client.id,
        billing_status: "active",
      }, { onConflict: "client_id" });

      // 3. Advance onboarding stage to activation → active
      await supabase.from("clients").update({
        onboarding_stage: "active",
        status: "active",
      } as any).eq("id", client.id);

      // 4. Update provision queue
      await supabase.from("provision_queue").update({
        provision_status: "ready_for_kickoff",
      }).eq("client_id", client.id);

      // 5. Audit logs + activity
      await Promise.all([
        supabase.from("audit_logs").insert({
          action: "client_activated",
          client_id: client.id,
          module: "activation",
          metadata: {
            payment_method: form.payment_method,
            monthly_fee: form.monthly_fee || null,
            setup_fee: form.setup_fee || null,
            account_manager: form.assigned_account_manager || null,
            notes: form.internal_notes || null,
          },
        }),
        supabase.from("crm_activities").insert({
          client_id: client.id,
          activity_type: "client_activated",
          activity_note: `${client.business_name} activated — payment confirmed via ${form.payment_method}`,
        }),
      ]);

      setStatus("done");
      toast.success(`${client.business_name} is now live!`);
      onComplete();
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Activation failed");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setForm({
      payment_confirmed: "confirmed",
      payment_method: "credit_card",
      monthly_fee: "",
      setup_fee: "",
      assigned_account_manager: "",
      internal_notes: "",
    });
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" style={{
        background: "hsl(218 35% 12%)",
        border: "1px solid hsla(211,96%,60%,.15)",
        color: "white"
      }}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(var(--nl-neon))]" />
            Activate Client — {client.business_name}
          </DialogTitle>
        </DialogHeader>

        {status === "done" ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full mx-auto flex items-center justify-center bg-emerald-400/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Workspace is Live!</p>
              <p className="text-sm text-white/50 mt-1">
                {client.business_name} has been fully activated and is ready for use.
              </p>
            </div>
            <Button onClick={handleClose} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              Done
            </Button>
          </div>
        ) : status === "error" ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-full mx-auto flex items-center justify-center bg-red-400/10">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>
            <p className="text-sm text-red-300">Activation encountered an error. The workspace may be partially activated.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setStatus("idle")} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                Retry
              </Button>
              <Button onClick={handleClose} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Current state info */}
            <div className="rounded-xl p-3" style={{ background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.1)" }}>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <ClipboardCheck className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                <span>Current stage: <strong className="text-white/80 capitalize">{client.onboarding_stage?.replace(/_/g, " ") || "unknown"}</strong></span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Payment & Terms
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Payment Status *</label>
                  <select value={form.payment_confirmed} onChange={e => set("payment_confirmed", e.target.value)}
                    className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3"
                    disabled={status === "activating"}>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
                    className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3"
                    disabled={status === "activating"}>
                    <option value="credit_card">Credit Card</option>
                    <option value="ach">ACH / Bank Transfer</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Monthly Fee</label>
                  <Input value={form.monthly_fee} onChange={e => set("monthly_fee", e.target.value)}
                    placeholder="$2,500" className={inputCls} disabled={status === "activating"} />
                </div>
                <div>
                  <label className={labelCls}>Setup Fee</label>
                  <Input value={form.setup_fee} onChange={e => set("setup_fee", e.target.value)}
                    placeholder="$500" className={inputCls} disabled={status === "activating"} />
                </div>
              </div>
            </div>

            {/* Internal Assignment */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="h-3 w-3" /> Internal Assignment
              </p>
              <div>
                <label className={labelCls}>Account Manager</label>
                <Input value={form.assigned_account_manager} onChange={e => set("assigned_account_manager", e.target.value)}
                  placeholder="e.g. Sarah Johnson" className={inputCls} disabled={status === "activating"} />
              </div>
              <div>
                <label className={labelCls}>Internal Notes</label>
                <Textarea value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)}
                  placeholder="Any notes about this activation..." className={`${inputCls} min-h-[60px]`} disabled={status === "activating"} />
              </div>
            </div>

            {/* What happens section */}
            <div className="rounded-xl p-3" style={{ background: "hsla(152,60%,44%,.06)", border: "1px solid hsla(152,60%,44%,.12)" }}>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">What this does</p>
              <ul className="space-y-1.5 text-[11px] text-white/60">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> Completes full app provisioning</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> Updates billing and payment status</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> Marks workspace as Live / Active</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> Creates audit trail records</li>
              </ul>
            </div>

            <Button
              onClick={handleActivate}
              disabled={status === "activating" || form.payment_confirmed !== "confirmed"}
              className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-11"
            >
              {status === "activating" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Activate & Go Live</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
