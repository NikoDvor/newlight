import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Linkedin, Ban, Loader2, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/* ─── Types matching nl_dialer_lead_details RPC payload ─── */
export interface DialerFirm {
  firm_type: "ria" | "ibd" | "hybrid" | "independent_advisor" | null;
  size_tier: string | null;
  signal: "new_firm" | "breakaway" | null;
  city: string | null;
  state: string | null;
  main_phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  aum: number | null;
  aum_growth_1y_pct: number | null;
  aum_growth_3y_pct: number | null;
  employees: number | null;
  total_reps: number | null;
  advisory_clients: number | null;
  avg_account_size: number | null;
  fee_structures: string[] | null;
  client_personas: string[] | null;
  services: string[] | null;
  crm_tags: string[] | null;
  technology_tags: string[] | null;
  custodians: string[] | null;
  year_founded: number | null;
  team_avg_age: number | null;
  description: string | null;
}

export interface DialerContact {
  id: string;
  full_name: string | null;
  title: string | null;
  is_owner: boolean | null;
  is_advisor: boolean | null;
  is_broker: boolean | null;
  mobile_phone: string | null;
  office_phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  years_experience: number | null;
  designations: string[] | null;
  breakaway_date: string | null;
  prior_firm: string | null;
  do_not_call: boolean | null;
  mobile_dnc: boolean | null;
  office_dnc: boolean | null;
}

export interface DialerCall {
  id: string;
  contact_id: string | null;
  contact_name: string | null;
  phone: string | null;
  phone_kind: string | null;
  outcome: string | null;
  notes: string | null;
  called_at: string | null;
}

export interface DialerLeadDetails {
  firm: DialerFirm | null;
  contacts: DialerContact[];
  calls: DialerCall[];
  front_desk_dnc: boolean;
}

export const FIRM_TYPE_LABEL: Record<string, string> = {
  ria: "RIA",
  ibd: "Independent BD",
  hybrid: "Hybrid",
  independent_advisor: "Independent Advisor",
};

export const SIGNAL_LABEL: Record<string, string> = {
  new_firm: "New firm",
  breakaway: "Breakaway",
};

export const CALL_OUTCOMES = [
  "No answer",
  "Voicemail",
  "Gatekeeper",
  "Talked",
  "Callback",
  "Not interested",
  "Booked",
  "Wrong number",
];

export function fmtAum(aum: number | null | undefined): string | null {
  if (aum == null || !isFinite(aum)) return null;
  if (aum >= 1_000_000_000) return `$${(aum / 1_000_000_000).toFixed(1)}B`;
  if (aum >= 1_000_000) return `$${(aum / 1_000_000).toFixed(1)}M`;
  if (aum >= 1_000) return `$${(aum / 1_000).toFixed(0)}K`;
  return `$${aum}`;
}

function fmtCallTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const chip = "rounded-full px-1.5 py-0.5 text-[9px] font-bold inline-flex items-center gap-1";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  businessName: string;
  details: DialerLeadDetails | undefined;
  onRefresh: () => void;
}

export default function DialerLeadDetail({ open, onOpenChange, leadId, businessName, details, onRefresh }: Props) {
  const [activeCall, setActiveCall] = useState<{ callId: string; label: string } | null>(null);
  const [outcomeSel, setOutcomeSel] = useState("");
  const [callNote, setCallNote] = useState("");
  const [savingCall, setSavingCall] = useState(false);
  const [dncTarget, setDncTarget] = useState<{ phone: string; contactId: string | null; label: string } | null>(null);
  const [dncBusy, setDncBusy] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  const firm = details?.firm || null;
  const contacts = details?.contacts || [];
  const calls = details?.calls || [];
  const frontDeskPhone = firm?.main_phone || null;

  const startCall = async (contact: DialerContact | null, phone: string, kind: "mobile" | "office" | "front_desk") => {
    if (!leadId) return;
    const label = contact ? `${contact.full_name || "Contact"} (${kind})` : "Front desk";
    try {
      const { data, error } = await (supabase as any).rpc("nl_log_call", {
        _lead_id: leadId,
        _contact_id: contact?.id || null,
        _phone: phone,
        _phone_kind: kind,
        _outcome: null,
        _notes: null,
      });
      if (error) throw error;
      setActiveCall({ callId: data as string, label });
      setOutcomeSel("");
      setCallNote("");
    } catch (e: any) {
      toast({ title: "Couldn't log call", description: e.message, variant: "destructive" });
    }
  };

  const saveCallOutcome = async () => {
    if (!activeCall || !outcomeSel) return;
    setSavingCall(true);
    try {
      const { error } = await (supabase as any).rpc("nl_update_call", {
        _call_id: activeCall.callId,
        _outcome: outcomeSel,
        _notes: callNote.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Call outcome saved" });
      setActiveCall(null);
      onRefresh();
    } catch (e: any) {
      toast({ title: "Couldn't save outcome", description: e.message, variant: "destructive" });
    } finally {
      setSavingCall(false);
    }
  };

  const confirmDnc = async () => {
    if (!dncTarget) return;
    setDncBusy(true);
    try {
      const { error } = await (supabase as any).rpc("nl_mark_dnc", {
        _phone: dncTarget.phone,
        _contact_id: dncTarget.contactId,
        _reason: "Marked do-not-call from dialer",
      });
      if (error) throw error;
      toast({ title: "Marked do-not-call", description: dncTarget.phone });
      setDncTarget(null);
      onRefresh();
    } catch (e: any) {
      toast({ title: "Couldn't mark DNC", description: e.message, variant: "destructive" });
    } finally {
      setDncBusy(false);
    }
  };

  const NumberRow = ({ contact, phone, kind, dnc }: { contact: DialerContact | null; phone: string; kind: "mobile" | "office" | "front_desk"; dnc: boolean }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {dnc ? (
        <span className="font-mono text-xs text-white/35 line-through">{phone}</span>
      ) : (
        <a
          href={`tel:${phone}`}
          onClick={() => startCall(contact, phone, kind)}
          className="font-mono inline-flex items-center gap-1 hover:underline text-xs"
          style={{ color: "hsl(211,96%,68%)" }}
        >
          <Phone className="h-3 w-3" /> {phone}
        </a>
      )}
      {dnc ? (
        <span className={chip} style={{ background: "hsla(0,72%,50%,.18)", color: "hsl(0,72%,72%)", border: "1px solid hsla(0,72%,50%,.4)" }}>
          <Ban className="h-2.5 w-2.5" /> Do not call
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setDncTarget({ phone, contactId: contact?.id || null, label: `${kind === "front_desk" ? "front desk" : kind} ${phone}` })}
          className="text-[9px] font-bold rounded-full px-1.5 py-0.5 text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25"
          title="Mark this number do-not-call"
        >
          DNC
        </button>
      )}
    </div>
  );

  const intelRows: { label: string; value: string | null }[] = firm ? [
    { label: "Type", value: firm.firm_type ? FIRM_TYPE_LABEL[firm.firm_type] || firm.firm_type : null },
    { label: "Size", value: firm.size_tier },
    { label: "Signal", value: firm.signal ? SIGNAL_LABEL[firm.signal] || firm.signal : null },
    { label: "Location", value: [firm.city, firm.state].filter(Boolean).join(", ") || null },
    { label: "AUM", value: fmtAum(firm.aum) },
    { label: "AUM growth 1y", value: firm.aum_growth_1y_pct != null ? `${firm.aum_growth_1y_pct}%` : null },
    { label: "AUM growth 3y", value: firm.aum_growth_3y_pct != null ? `${firm.aum_growth_3y_pct}%` : null },
    { label: "Employees", value: firm.employees != null ? String(firm.employees) : null },
    { label: "Reps", value: firm.total_reps != null ? String(firm.total_reps) : null },
    { label: "Advisory clients", value: firm.advisory_clients != null ? String(firm.advisory_clients) : null },
    { label: "Avg account", value: fmtAum(firm.avg_account_size) },
    { label: "Founded", value: firm.year_founded != null ? String(firm.year_founded) : null },
    { label: "Avg team age", value: firm.team_avg_age != null ? String(firm.team_avg_age) : null },
    { label: "Website", value: firm.website },
    { label: "LinkedIn", value: firm.linkedin_url },
  ].filter(r => r.value) : [];

  const intelChips: { label: string; items: string[] }[] = firm ? [
    { label: "How they earn", items: firm.fee_structures || [] },
    { label: "Client personas", items: firm.client_personas || [] },
    { label: "Services", items: firm.services || [] },
    { label: "CRM", items: firm.crm_tags || [] },
    { label: "Technology", items: firm.technology_tags || [] },
    { label: "Custodians", items: firm.custodians || [] },
  ].filter(c => c.items.length > 0) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-[hsl(215,35%,9%)] border-white/10 text-white p-4">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-white text-left">{businessName}</SheetTitle>
        </SheetHeader>

        {/* Inline outcome picker after a call is logged */}
        {activeCall && (
          <div className="rounded-lg border border-[hsla(211,96%,56%,.4)] bg-[hsla(211,96%,56%,.08)] p-3 mb-4 space-y-2">
            <p className="text-xs font-semibold text-white/80">How did the call to {activeCall.label} go?</p>
            <div className="flex flex-wrap gap-1.5">
              {CALL_OUTCOMES.map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcomeSel(o)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={outcomeSel === o
                    ? { background: "hsl(211,96%,56%)", color: "white" }
                    : { background: "hsla(0,0%,100%,.06)", color: "hsl(0,0%,75%)", border: "1px solid hsla(0,0%,100%,.12)" }}
                >
                  {o}
                </button>
              ))}
            </div>
            <textarea
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder="Optional note…"
              rows={2}
              className="w-full bg-white/[0.04] text-white text-xs px-2 py-1.5 rounded border border-white/10 focus:border-[hsl(211,96%,56%)] focus:outline-none resize-y"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]" disabled={!outcomeSel || savingCall} onClick={saveCallOutcome}>
                {savingCall ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save outcome"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-white/60" onClick={() => setActiveCall(null)}>Skip</Button>
            </div>
          </div>
        )}

        {/* Inline DNC confirm */}
        {dncTarget && (
          <div className="rounded-lg border border-[hsla(0,72%,50%,.4)] bg-[hsla(0,72%,50%,.08)] p-3 mb-4 space-y-2">
            <p className="text-xs text-white/80">Mark <span className="font-mono font-semibold">{dncTarget.label}</span> as do-not-call? This number can't be dialed again.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={dncBusy} onClick={confirmDnc}>
                {dncBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, mark DNC"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-white/60" onClick={() => setDncTarget(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Decision Makers */}
        <h3 className="text-[11px] uppercase tracking-wider text-white/50 mb-2">Decision Makers</h3>
        <div className="space-y-2 mb-5">
          {contacts.length === 0 && <p className="text-xs text-white/40">No contacts on file.</p>}
          {contacts.map(c => (
            <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold break-words">{c.full_name || "Unnamed"}</span>
                {c.is_owner && (
                  <span className={chip} style={{ background: "hsla(38,95%,55%,.18)", color: "hsl(38,100%,72%)", border: "1px solid hsla(38,95%,55%,.5)" }}>
                    <Crown className="h-2.5 w-2.5" /> Owner
                  </span>
                )}
                {c.is_advisor && <span className={chip} style={{ background: "hsla(211,96%,56%,.14)", color: "hsl(211,96%,70%)" }}>Advisor</span>}
                {c.is_broker && <span className={chip} style={{ background: "hsla(262,80%,65%,.14)", color: "hsl(262,80%,78%)" }}>Broker</span>}
                {c.do_not_call && (
                  <span className={chip} style={{ background: "hsla(0,72%,50%,.18)", color: "hsl(0,72%,72%)", border: "1px solid hsla(0,72%,50%,.4)" }}>
                    <Ban className="h-2.5 w-2.5" /> Do not call
                  </span>
                )}
              </div>
              {c.title && <p className="text-xs text-white/60">{c.title}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline break-all" style={{ color: "hsl(211,96%,68%)" }}>
                    <Mail className="h-3 w-3" /> {c.email}
                  </a>
                )}
                {c.linkedin_url && (
                  <a href={c.linkedin_url.startsWith("http") ? c.linkedin_url : `https://${c.linkedin_url}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline" style={{ color: "hsl(211,96%,68%)" }}>
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </a>
                )}
              </div>
              {(c.designations?.length || c.years_experience != null || c.prior_firm || c.breakaway_date) && (
                <p className="text-[10px] text-white/45">
                  {[
                    c.designations?.length ? c.designations.join(", ") : null,
                    c.years_experience != null ? `${c.years_experience} yrs exp` : null,
                    c.prior_firm ? `Prior: ${c.prior_firm}` : null,
                    c.breakaway_date ? `Breakaway ${c.breakaway_date}` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="space-y-1 pt-1">
                {c.mobile_phone && <NumberRow contact={c} phone={c.mobile_phone} kind="mobile" dnc={!!(c.mobile_dnc || c.do_not_call)} />}
                {c.office_phone && <NumberRow contact={c} phone={c.office_phone} kind="office" dnc={!!(c.office_dnc || c.do_not_call)} />}
              </div>
            </div>
          ))}

          {/* Front desk */}
          {frontDeskPhone && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
              <p className="text-sm font-semibold">Front Desk</p>
              <NumberRow contact={null} phone={frontDeskPhone} kind="front_desk" dnc={!!details?.front_desk_dnc} />
            </div>
          )}
        </div>

        {/* Call history */}
        <h3 className="text-[11px] uppercase tracking-wider text-white/50 mb-2">Call History</h3>
        <div className="space-y-1.5 mb-5">
          {calls.length === 0 && <p className="text-xs text-white/40">No calls logged yet.</p>}
          {calls.map(call => (
            <div key={call.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="text-white/50">{fmtCallTime(call.called_at)}</span>
                <span className="text-white/80 font-medium">{call.contact_name || "Front desk"}</span>
                {call.phone_kind && <span className="text-white/40">({call.phone_kind})</span>}
                {call.outcome && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "hsla(211,96%,56%,.14)", color: "hsl(211,96%,70%)" }}>
                    {call.outcome}
                  </span>
                )}
              </div>
              {call.notes && <p className="text-[11px] text-white/55 mt-0.5 whitespace-pre-wrap break-words">{call.notes}</p>}
            </div>
          ))}
        </div>

        {/* Firm intel */}
        {firm && (intelRows.length > 0 || intelChips.length > 0 || firm.description) && (
          <>
            <h3 className="text-[11px] uppercase tracking-wider text-white/50 mb-2">Firm Intel</h3>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2 mb-5">
              {intelRows.map(r => (
                <div key={r.label} className="flex gap-2 text-xs">
                  <span className="text-white/40 w-[110px] shrink-0">{r.label}</span>
                  <span className="text-white/80 break-words min-w-0">{r.value}</span>
                </div>
              ))}
              {intelChips.map(c => (
                <div key={c.label} className="flex gap-2 text-xs">
                  <span className="text-white/40 w-[110px] shrink-0 pt-0.5">{c.label}</span>
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {c.items.map(item => (
                      <span key={item} className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ background: "hsla(211,96%,56%,.10)", color: "hsl(211,96%,72%)" }}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
              {firm.description && (
                <div className="text-xs">
                  <button type="button" onClick={() => setDescOpen(v => !v)}
                    className="inline-flex items-center gap-1 text-white/50 hover:text-white/80 font-medium">
                    {descOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Description
                  </button>
                  {descOpen && <p className="text-white/60 mt-1 whitespace-pre-wrap break-words">{firm.description}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
