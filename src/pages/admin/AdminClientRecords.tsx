import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { NewLightHero } from "@/components/admin/NewLightHero";
import { fmtMoney } from "@/lib/pipelineRevenue";

/**
 * Client Records — every client who has paid + signed, split into Current and
 * Former. One row per client: salesman, signed date, the Form 2 terms, the
 * signed service agreement, total paid to date (lifetime value), last
 * payment, subscription status. "Mark former" keeps the full record.
 * Sources: crm_deals (paid_signed), clients (provisioned workspace),
 * invoices (payments), subscriptions, document_envelopes (agreement).
 */
interface Rec {
  dealId: string; clientId: string | null; business: string; owner: string | null; rep: string;
  signedAt: string | null; terms: string; paid: number; lastPaid: string | null;
  subStatus: string | null; agreementStatus: string | null; hasAgreement: boolean;
  formerAt: string | null; formerReason: string | null;
}

export default function AdminClientRecords() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const db = supabase as any;
      const { data: deals } = await db.from("crm_deals")
        .select("id, deal_name, provisioned_client_id, assigned_user, paid_signed_at, pay_sign_status, pricing_model, initial_fee, recurring_fee, commission_rate, commission_rate_ongoing, service_agreement_envelope_id")
        .or("paid_signed_at.not.is.null,pay_sign_status.eq.paid_signed")
        .order("paid_signed_at", { ascending: false });
      const list = deals || [];
      const clientIds = list.map((d: any) => d.provisioned_client_id).filter(Boolean);
      const envIds = list.map((d: any) => d.service_agreement_envelope_id).filter(Boolean);
      const dealIds = list.map((d: any) => d.id);
      const userIds = Array.from(new Set(list.map((d: any) => d.assigned_user).filter(Boolean)));
      const empty = Promise.resolve({ data: [] });
      const [{ data: clients }, { data: invs }, { data: subs }, { data: envs }, { data: emps }, { data: leads }] = await Promise.all([
        clientIds.length ? db.from("clients").select("id, business_name, owner_name, former_client_at, former_client_reason").in("id", clientIds) : empty,
        clientIds.length ? db.from("invoices").select("provisioned_client_id, amount_paid, paid_at, invoice_status").in("provisioned_client_id", clientIds) : empty,
        clientIds.length ? db.from("subscriptions").select("client_id, subscription_status, created_at").in("client_id", clientIds).order("created_at", { ascending: false }) : empty,
        envIds.length ? db.from("document_envelopes").select("id, status, completed_at").in("id", envIds) : empty,
        userIds.length ? db.from("employee_profiles").select("user_id, full_name").in("user_id", userIds) : empty,
        dealIds.length ? db.from("nl_bdr_leads").select("crm_deal_id, business_name, owner_name").in("crm_deal_id", dealIds) : empty,
      ]);
      const cm = new Map((clients || []).map((c: any) => [c.id, c]));
      const em = new Map((envs || []).map((e: any) => [e.id, e]));
      const nm = new Map((emps || []).map((e: any) => [e.user_id, e.full_name]));
      const lm = new Map((leads || []).map((l: any) => [l.crm_deal_id, l]));
      const recs: Rec[] = list.map((d: any) => {
        const c: any = d.provisioned_client_id ? cm.get(d.provisioned_client_id) : null;
        const lead: any = lm.get(d.id);
        const myInv = (invs || []).filter((i: any) => i.provisioned_client_id && i.provisioned_client_id === d.provisioned_client_id);
        const paid = myInv.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
        const lastPaid = myInv.map((i: any) => i.paid_at).filter(Boolean).sort().pop() || null;
        const sub: any = (subs || []).find((s: any) => s.client_id === d.provisioned_client_id);
        const env: any = d.service_agreement_envelope_id ? em.get(d.service_agreement_envelope_id) : null;
        const init = d.initial_fee != null ? fmtMoney(Number(d.initial_fee)) : "—";
        const tail = d.pricing_model === "commission"
          ? `${d.commission_rate ?? "—"}% yr 1 / ${d.commission_rate_ongoing ?? "—"}% after`
          : d.recurring_fee != null ? `${fmtMoney(Number(d.recurring_fee))}/mo` : "";
        return {
          dealId: d.id, clientId: d.provisioned_client_id || null,
          business: c?.business_name || lead?.business_name || d.deal_name, owner: c?.owner_name || lead?.owner_name || null,
          rep: nm.get(d.assigned_user) || "—", signedAt: d.paid_signed_at,
          terms: [init, tail].filter(Boolean).join(" + "), paid, lastPaid,
          subStatus: sub?.subscription_status || null,
          agreementStatus: env?.status || null, hasAgreement: !!d.service_agreement_envelope_id,
          formerAt: c?.former_client_at || null, formerReason: c?.former_client_reason || null,
        };
      });
      if (!cancelled) { setRows(recs); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [reload]);

  const current = useMemo(() => rows.filter((r) => !r.formerAt), [rows]);
  const former = useMemo(() => rows.filter((r) => r.formerAt), [rows]);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);

  const viewAgreement = async (dealId: string) => {
    setBusy(dealId);
    const { data, error } = await supabase.functions.invoke("get-signed-agreement", { body: { deal_id: dealId } });
    setBusy(null);
    const url = (data as any)?.url;
    if (error || !url) { toast({ title: "No signed agreement on file yet", variant: "destructive" }); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const setFormer = async (r: Rec, toFormer: boolean) => {
    if (!r.clientId) { toast({ title: "No client workspace linked to this deal", variant: "destructive" }); return; }
    let reason: string | null = null;
    if (toFormer) {
      reason = window.prompt(`Why is ${r.business} a former client? (optional)`) ?? null;
    }
    setBusy(r.dealId);
    const { error } = await (supabase as any).from("clients")
      .update({ former_client_at: toFormer ? new Date().toISOString() : null, former_client_reason: toFormer ? (reason || null) : null })
      .eq("id", r.clientId);
    setBusy(null);
    if (error) { toast({ title: "Couldn't update", description: error.message, variant: "destructive" }); return; }
    setReload((n) => n + 1);
  };

  const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
  const table = (list: Rec[], isFormer: boolean) => (
    list.length === 0 ? (
      <p className="py-6 text-center text-sm text-white/40">{loading ? "Loading…" : isFormer ? "No former clients." : "No paying clients yet — they appear here the moment Pay & Sign is completed."}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-white/50">
              {["Client", "Salesman", "Signed", "Terms (Form 2)", "Paid to date", "Last payment", "Subscription", "Agreement", ""].map((h) => (
                <th key={h} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.dealId} className="border-t border-white/5 text-white/85 align-top">
                <td className="py-2 pr-3">
                  <div className="font-medium">{r.business}</div>
                  <div className="text-white/45">{r.owner || ""}</div>
                  {isFormer && <div className="text-[10px] text-amber-300">Former since {d(r.formerAt)}{r.formerReason ? ` · ${r.formerReason}` : ""}</div>}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.rep}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{d(r.signedAt)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.terms}</td>
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums font-semibold text-emerald-300">{fmtMoney(r.paid)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{d(r.lastPaid)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.subStatus ? r.subStatus.replace(/_/g, " ") : "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {r.hasAgreement ? (
                    <button onClick={() => viewAgreement(r.dealId)} disabled={busy === r.dealId} className="inline-flex items-center gap-1 text-sky-300 hover:underline">
                      {busy === r.dealId ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                      {r.agreementStatus === "completed" || r.agreementStatus === "signed" ? "Signed" : "View"}
                    </button>
                  ) : "—"}
                </td>
                <td className="py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {r.clientId && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/admin/clients/${r.clientId}`)}>
                        Profile <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-white/50" disabled={busy === r.dealId} onClick={() => setFormer(r, !isFormer)}>
                      {isFormer ? "Reactivate" : "Mark former"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="space-y-5">
      <NewLightHero title="Client Records" subtitle="Every paying client — current and former — with their agreement, terms and everything they've paid" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { k: "Current clients", v: String(current.length) },
          { k: "Former clients", v: String(former.length) },
          { k: "Total paid (all time)", v: fmtMoney(totalPaid) },
          { k: "Avg lifetime value", v: rows.length ? fmtMoney(totalPaid / rows.length) : "—" },
        ].map((t) => (
          <div key={t.k} className="rounded-xl px-3 py-2.5 border border-white/10 bg-white/[0.03]">
            <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">{t.k}</div>
            <div className="text-xl font-bold tabular-nums mt-0.5 text-white">{t.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02]">
        <div className="text-sm font-semibold text-white mb-2">Current clients</div>
        {table(current, false)}
      </div>
      <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02]">
        <div className="text-sm font-semibold text-white mb-2">Former clients</div>
        {table(former, true)}
      </div>
    </div>
  );
}
