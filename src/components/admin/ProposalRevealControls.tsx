// ── Admin-Only Proposal Reveal & Payment Unlock Controls ──

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Eye, EyeOff, CreditCard, CheckCircle2, FileSignature,
  Loader2, Shield, Unlock, Lock, Zap
} from "lucide-react";

interface ClientStages {
  clientId: string;
  proposalStatus: string;
  agreementStatus: string;
  paymentStatus: string;
  implementationStatus: string;
}

interface Props {
  stages: ClientStages;
  onUpdate: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  not_sent: "bg-white/10 text-white/40",
  sent: "bg-[hsla(211,96%,60%,.2)] text-[hsl(var(--nl-neon))]",
  viewed: "bg-purple-500/20 text-purple-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
  signed: "bg-emerald-500/20 text-emerald-400",
  unpaid: "bg-amber-500/20 text-amber-400",
  pending: "bg-[hsla(211,96%,60%,.2)] text-[hsl(var(--nl-neon))]",
  paid: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  not_started: "bg-white/10 text-white/40",
  in_progress: "bg-[hsla(211,96%,60%,.2)] text-[hsl(var(--nl-neon))]",
  complete: "bg-emerald-500/20 text-emerald-400",
};

export function ProposalRevealControls({ stages, onUpdate }: Props) {
  const [saving, setSaving] = useState<string | null>(null);

  const update = async (field: string, value: string) => {
    setSaving(field);
    await supabase.from("clients").update({ [field]: value } as any).eq("id", stages.clientId);
    await supabase.from("audit_logs").insert({
      action: `lifecycle_${field}_updated`,
      client_id: stages.clientId,
      module: "sales",
      metadata: { field, value },
    });
    toast.success(`${field.replace(/_/g, " ")} → ${value}`);
    onUpdate();
    setSaving(null);
  };

  const isProposalRevealed = ["sent", "viewed", "approved", "accepted"].includes(stages.proposalStatus);
  const isAgreementSigned = stages.agreementStatus === "signed";
  const canUnlockPayment = isProposalRevealed && (isAgreementSigned || stages.proposalStatus === "approved");

  return (
    <Card className="border-0" style={{ background: "hsla(218,35%,14%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reveal & Unlock Controls</h3>
          <Badge className="text-[8px] bg-amber-500/20 text-amber-400 ml-auto">Admin Only</Badge>
        </div>

        {/* Current Stage Overview */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Proposal", value: stages.proposalStatus, field: "proposal_status" },
            { label: "Agreement", value: stages.agreementStatus, field: "agreement_status" },
            { label: "Payment", value: stages.paymentStatus, field: "payment_status" },
            { label: "Implementation", value: stages.implementationStatus, field: "implementation_status" },
          ].map(s => (
            <div key={s.field} className="p-3 rounded-xl bg-white/[0.03]">
              <p className="text-[10px] text-white/40 uppercase mb-1">{s.label}</p>
              <Badge className={`text-[10px] ${STATUS_BADGE[s.value] || "bg-white/10 text-white/40"}`}>
                {s.value?.replace(/_/g, " ") || "—"}
              </Badge>
            </div>
          ))}
        </div>

        {/* Proposal Visibility */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProposalRevealed ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-white/30" />}
              <span className="text-xs text-white font-medium">Proposal Visibility</span>
            </div>
            <Badge className={`text-[9px] ${isProposalRevealed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
              {isProposalRevealed ? "Revealed to Client" : "Internal Only — Hidden from Client"}
            </Badge>
          </div>
          {!isProposalRevealed && (
            <p className="text-[10px] text-white/30">
              This proposal is only visible to your team. Reveal it during the final meeting to share with the client.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {!isProposalRevealed ? (
              <Button
                size="sm"
                className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white text-xs h-8"
                onClick={() => update("proposal_status", "sent")}
                disabled={saving === "proposal_status"}
              >
                {saving === "proposal_status" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                Reveal Proposal
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-white/50 text-xs h-8 hover:bg-white/5"
                  onClick={() => update("proposal_status", "not_sent")}
                  disabled={saving === "proposal_status"}
                >
                  {saving === "proposal_status" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                  Hide Proposal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-white/50 text-xs h-8 hover:bg-white/5"
                  onClick={() => {
                    const url = `${window.location.origin}/proposal/view/${stages.clientId}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Proposal link copied to clipboard");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy Link
                </Button>
              </>
            )}
            {isProposalRevealed && stages.proposalStatus !== "approved" && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                onClick={() => update("proposal_status", "approved")}
                disabled={saving === "proposal_status"}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Approved
              </Button>
            )}
          </div>
        </div>

        {/* Agreement Controls */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-white/40" />
              <span className="text-xs text-white font-medium">Agreement Status</span>
            </div>
          </div>
          <div className="flex gap-2">
            {stages.agreementStatus !== "signed" && (
              <>
                {stages.agreementStatus === "not_sent" && (
                  <Button size="sm" variant="outline" className="border-white/10 text-white/50 text-xs h-8 hover:bg-white/5"
                    onClick={() => update("agreement_status", "sent")} disabled={saving === "agreement_status"}>
                    Mark Sent
                  </Button>
                )}
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  onClick={() => update("agreement_status", "signed")} disabled={saving === "agreement_status"}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Signed
                </Button>
              </>
            )}
            {stages.agreementStatus === "signed" && (
              <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Signed
              </Badge>
            )}
          </div>
        </div>

        {/* Payment Unlock */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canUnlockPayment ? <Unlock className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4 text-white/20" />}
              <span className="text-xs text-white font-medium">Payment Gate</span>
            </div>
            {!canUnlockPayment && (
              <span className="text-[9px] text-white/30">Requires proposal revealed + agreement signed</span>
            )}
          </div>
          {canUnlockPayment ? (
            <div className="flex gap-2">
              {stages.paymentStatus !== "paid" && (
                <>
                  {stages.paymentStatus === "unpaid" && (
                    <Button size="sm" variant="outline" className="border-white/10 text-white/50 text-xs h-8 hover:bg-white/5"
                      onClick={() => update("payment_status", "pending")} disabled={saving === "payment_status"}>
                      <CreditCard className="h-3 w-3 mr-1" /> Mark Pending
                    </Button>
                  )}
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    onClick={() => update("payment_status", "paid")} disabled={saving === "payment_status"}>
                    <Zap className="h-3 w-3 mr-1" /> Mark Paid
                  </Button>
                </>
              )}
              {stages.paymentStatus === "paid" && (
                <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Payment Confirmed
                </Badge>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-white/20 flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Payment controls locked until proposal is revealed and agreement is signed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
