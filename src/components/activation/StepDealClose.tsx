import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, UserPlus, Zap, Upload, AlertTriangle, CreditCard, Building2, CheckCircle2 } from "lucide-react";
import { ActivationHelp } from "./ActivationHelp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StepProps } from "./activationTypes";

const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";
const labelCls = "text-xs text-white/50 mb-1 block";
const sectionCls = "rounded-xl p-4 space-y-3";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

const YN = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">
    <option value="">Select…</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </select>
);

export function StepDealClose({ form, set, submitting }: StepProps) {
  const [uploading, setUploading] = useState(false);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("client-logos").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("client-logos").getPublicUrl(path);
      set("payment_receipt_url", pub.publicUrl);
      toast.success("Receipt uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setupFeeNum = Number(form.setup_fee) || 0;
  const monthlyFeeNum = Number(form.monthly_fee) || 0;
  const totalDueNow = setupFeeNum > 0 ? setupFeeNum : monthlyFeeNum;

  return (
    <div className="space-y-4">
      <ActivationHelp title="Deal Close + Activation" items={[
        "Confirms payment and deal terms",
        "Creates the client record and workspace",
        "Triggers provisioning and owner invitation",
      ]} />

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Zap className="h-3 w-3" /> Deal Confirmation</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Business Name Confirmed *</label><Input value={form.business_name_confirmed} onChange={e => set("business_name_confirmed", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Legal Business Name</label><Input value={form.legal_business_name} onChange={e => set("legal_business_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Primary Brand / Display Name</label><Input value={form.display_name} onChange={e => set("display_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Service Package</label>
            <select value={form.service_package} onChange={e => set("service_package", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
              <option value="enterprise">Enterprise</option>
              <option value="growth">Growth</option>
              <option value="starter">Starter</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><UserPlus className="h-3 w-3" /> Owner + Contacts</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Owner Full Name *</label><Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Owner Email *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
          <div><label className={labelCls}>Owner Phone</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" /><Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} className={`${inputCls} pl-9`} disabled={submitting} /></div></div>
          <div><label className={labelCls}>Secondary Contact Name</label><Input value={form.secondary_contact_name} onChange={e => set("secondary_contact_name", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Secondary Contact Email</label><Input value={form.secondary_contact_email} onChange={e => set("secondary_contact_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Secondary Contact Phone</label><Input value={form.secondary_contact_phone} onChange={e => set("secondary_contact_phone", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
      </div>

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Payment + Terms</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Setup Fee</label><Input value={form.setup_fee} onChange={e => set("setup_fee", e.target.value)} placeholder="$0" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Monthly Fee</label><Input value={form.monthly_fee} onChange={e => set("monthly_fee", e.target.value)} placeholder="$0" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Contract Term</label><Input value={form.contract_term} onChange={e => set("contract_term", e.target.value)} placeholder="12 months" className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Payment Method</label>
            <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="ach">ACH</option>
              <option value="check">Check</option>
              <option value="credit_card" disabled>Credit Card (Stripe — Coming Soon)</option>
            </select>
          </div>
          <div><label className={labelCls}>Payment Status</label>
            <select value={form.payment_confirmed} onChange={e => set("payment_confirmed", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
              <option value="pending">Awaiting Payment</option>
              <option value="awaiting_confirmation">Awaiting Wire Confirmation</option>
              <option value="confirmed">Payment Confirmed</option>
            </select>
          </div>
          <div><label className={labelCls}>Activation Priority</label>
            <select value={form.activation_priority} onChange={e => set("activation_priority", e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3" disabled={submitting}>
              <option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div><label className={labelCls}>Requested Launch Date</label><Input type="date" value={form.requested_launch_date} onChange={e => set("requested_launch_date", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Immediate Activation?</label><YN value={form.immediate_activation} onChange={v => set("immediate_activation", v)} disabled={submitting} /></div>
        </div>

        {/* Payment info banner */}
        {form.payment_confirmed !== "confirmed" && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Payment confirmation is optional for activation. You can activate now and confirm payment later. The workspace will show "Pending Payment" until confirmed.</span>
          </div>
        )}
      </div>

      {/* Wire Transfer Details */}
      {(form.payment_method === "wire_transfer" || form.payment_method === "ach") && (
        <div className={sectionCls} style={{ background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.12)" }}>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Wire / ACH Details</p>

          {totalDueNow > 0 && (
            <div className="rounded-lg bg-[hsl(var(--nl-electric))]/10 border border-[hsl(var(--nl-electric))]/20 px-3 py-2">
              <p className="text-xs text-white/50">Amount Due Now</p>
              <p className="text-lg font-bold text-white tabular-nums">${totalDueNow.toLocaleString()}</p>
              <p className="text-[10px] text-white/30">{setupFeeNum > 0 ? "Setup fee" : "First month"}</p>
            </div>
          )}

          <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold text-white/50 uppercase">Wire Instructions</p>
            <p className="text-xs text-white/70">Bank: <span className="text-white">NewLight Marketing LLC</span></p>
            <p className="text-xs text-white/70">Routing: <span className="text-white">Contact admin for details</span></p>
            <p className="text-xs text-white/70">Account: <span className="text-white">Contact admin for details</span></p>
            <p className="text-xs text-white/70">Reference: <span className="text-white">{form.business_name_confirmed || "Your Business Name"}</span></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Wire Reference / Confirmation #</label><Input value={form.wire_reference} onChange={e => set("wire_reference", e.target.value)} placeholder="Wire confirmation number" className={inputCls} disabled={submitting} /></div>
            <div><label className={labelCls}>Wire Notes</label><Input value={form.wire_notes} onChange={e => set("wire_notes", e.target.value)} placeholder="Additional payment notes" className={inputCls} disabled={submitting} /></div>
          </div>

          <div>
            <label className={labelCls}>Upload Payment Receipt / Proof</label>
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-xs text-white/60 cursor-pointer hover:bg-white/[0.08] transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Choose File"}
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleReceiptUpload} disabled={submitting || uploading} />
              </label>
              {form.payment_receipt_url && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <a href={form.payment_receipt_url} target="_blank" rel="noreferrer" className="underline">View Receipt</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={sectionCls} style={sectionStyle}>
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Internal Assignment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Assigned Account Manager</label><Input value={form.assigned_account_manager} onChange={e => set("assigned_account_manager", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Assigned Sales Rep</label><Input value={form.assigned_sales_rep} onChange={e => set("assigned_sales_rep", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Kickoff Contact</label><Input value={form.kickoff_contact} onChange={e => set("kickoff_contact", e.target.value)} className={inputCls} disabled={submitting} /></div>
          <div><label className={labelCls}>Kickoff Email</label><Input value={form.kickoff_email} onChange={e => set("kickoff_email", e.target.value)} className={inputCls} disabled={submitting} /></div>
        </div>
        <div><label className={labelCls}>Internal Closing Notes</label><Textarea value={form.closing_notes} onChange={e => set("closing_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
        <div><label className={labelCls}>Internal Payment Notes</label><Textarea value={form.internal_payment_notes} onChange={e => set("internal_payment_notes", e.target.value)} placeholder="Admin-only notes about payment status, follow-ups, etc." className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
        <div><label className={labelCls}>Sales Notes</label><Textarea value={form.sales_notes} onChange={e => set("sales_notes", e.target.value)} className={`${inputCls} min-h-[50px]`} disabled={submitting} /></div>
      </div>
    </div>
  );
}
