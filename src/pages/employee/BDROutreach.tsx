import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Check, Copy, ExternalLink, HelpCircle, Linkedin, Loader2, MessageSquare, PhoneOff, Undo2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OutreachGuide, GUIDE } from "@/components/employee/OutreachGuide";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";
import {
  PHONE_TYPES, SCHEDULE_HELP, OUTREACH_OUTCOMES, DEFAULT_CAPS, MIN_GAP_MIN, PLAN_DAYS, capForPhone, canSchedule,
  fillTemplate, firstNameOf, shortFirm, inWindow, nextPreferred, tzForState, laDay, prettyPhone, smsHref, csvToLeads, CSV_EXAMPLE, type PhoneType, type ImportRow,
} from "@/lib/outreach";

/**
 * Text + LinkedIn outreach — /employee/outreach. Each rep pulls leads from the shared pool (a lead belongs to one rep once pulled),
 * copies the filled-in template, sends it by hand from their own phone / LinkedIn, then logs the reply outcome.
 * Nothing is ever sent by the app.
 */

interface OLead {
  id: string; pool_firm_id: string; lead_id: string | null; firm_name: string; contact_name: string | null; first_name: string | null;
  phone: string | null; linkedin_url: string | null; city: string | null; state: string | null; aum: number | null; seq: number;
  text_status: "new" | "sent"; text_sent_at: string | null; li_status: "new" | "requested" | "accepted" | "sent"; li_sent_at: string | null;
  result: string | null; outcome: string | null; outcome_channel: string | null;
}
interface Tpl { id: string; channel: "text" | "li_connect" | "li_message"; name: string; body: string; position: number }
interface Send { channel: string; sent_at: string }
type Channel = "text" | "linkedin";

const surface = "rounded-2xl border border-white/[0.2] bg-[hsla(220,40%,9%,.94)]";
const btn = "inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold disabled:opacity-50";
const accent = "border-[hsl(211,96%,62%)] bg-[hsl(211,75%,24%)] text-white";
const quiet = "border-white/30 bg-[hsl(220,40%,13%)] text-white hover:bg-[hsl(220,40%,19%)]";

const TAB_HELP: Record<Channel, Record<string, string>> = {
  text: {
    todo: "People you haven't texted yet. Tap Text, send it in Messages, then tap Sent (or schedule it).",
    sched: "Texts you scheduled in Messages. After the time passes they move to Awaiting reply by themselves.",
    wait: "Texts that went out and haven't had a logged reply. Log the outcome when someone answers.",
    replied: "People who replied and are still alive. Tap Book when they want a meeting.",
    done: "Finished leads: lost, stop, wrong number, landline, no reply, or closed (won or lost on another list).",
  },
  linkedin: {
    todo: "People you haven't asked to connect with. Tap Copy + open profile, send the note, then tap Request sent.",
    req: "Requests sent. When someone accepts on LinkedIn, tap Accepted so they move to To message.",
    msg: "People who accepted. Message them, then tap Message sent.",
    wait: "Messages sent with no logged reply yet. Log the outcome when someone answers.",
    replied: "People who replied and are still alive. Tap Book when they want a meeting.",
    done: "Finished leads: lost, stop, no reply, or closed (won or lost on another list).",
    nourl: "Leads with no LinkedIn link yet. Paste the profile link to move them to To connect.",
  },
};
const copy = (t: string, what = "Message") => {
  try { navigator.clipboard.writeText(t).then(() => toast({ title: `${what} copied` }), () => toast({ title: "Couldn't copy", variant: "destructive" })); }
  catch { toast({ title: "Couldn't copy", variant: "destructive" }); }
};
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const money = (n: number | null) => (n == null ? "" : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${Math.round(n / 1e6)}M` : `$${Math.round(n / 1e3)}K`);
const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export default function BDROutreach() {
  const navigate = useNavigate();
  const { user, employeeProfile } = useWorkspace() as any;
  const uid: string | undefined = user?.id;
  const repFull: string = employeeProfile?.full_name || user?.user_metadata?.full_name || (user?.email || "").split("@")[0] || "";
  const rep = firstNameOf(null, repFull) === "there" ? repFull.split(" ")[0] || "me" : firstNameOf(null, repFull);

  const [leads, setLeads] = useState<OLead[]>([]);
  const [sends, setSends] = useState<Send[]>([]);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [phoneType, setPhoneType] = useState<PhoneType>("iphone_ios18");
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel>("text");
  const [tab, setTab] = useState("todo");
  const [busy, setBusy] = useState<string | null>(null);
  const [pullN, setPullN] = useState(40);
  const [pullState, setPullState] = useState("");
  const [pulling, setPulling] = useState(false);
  const [guideAt, setGuideAt] = useState<number | null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("guide") === "home") setGuideAt(GUIDE.home); }, []);
  const [importOpen, setImportOpen] = useState(false);
  const [shown, setShown] = useState(25);

  const load = useCallback(async () => {
    if (!uid) return;
    const db = supabase as any;
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const [l, s, t, st] = await Promise.all([
      db.from("nl_text_leads").select("*").eq("rep_user_id", uid).order("seq").limit(3000),
      db.from("nl_text_sends").select("channel, sent_at").eq("rep_user_id", uid).gte("sent_at", since).limit(3000),
      db.from("nl_text_templates").select("id, channel, name, body, position").eq("active", true).order("position"),
      db.from("nl_text_settings").select("phone_type").eq("user_id", uid).maybeSingle(),
    ]);
    if (l.error) toast({ title: "Couldn't load leads", description: l.error.message, variant: "destructive" });
    setLeads((l.data as OLead[]) || []); setSends((s.data as Send[]) || []); setTpls((t.data as Tpl[]) || []);
    if (st.data?.phone_type) setPhoneType(st.data.phone_type);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setTab("todo"); setShown(25); }, [channel]);

  const savePhone = async (p: PhoneType) => {
    setPhoneType(p);
    if (!uid) return;
    const { error } = await (supabase as any).from("nl_text_settings").upsert({ user_id: uid, phone_type: p, updated_at: new Date().toISOString() });
    if (error) toast({ title: "Couldn't save phone type", description: error.message, variant: "destructive" });
  };

  const now = Date.now();
  const todayLA = laDay(new Date());
  const counts = useMemo(() => {
    const c = { text: 0, li_connect: 0, li_message: 0, textScheduled: 0, textNext3: 0, lastText: 0 };
    const horizon = now + PLAN_DAYS * 86400000;
    for (const s of sends) {
      const t = new Date(s.sent_at).getTime();
      if (s.channel === "text") {
        c.lastText = Math.max(c.lastText, t);
        if (t > now) { c.textScheduled++; if (t <= horizon) c.textNext3++; }
      }
      if (laDay(s.sent_at) === todayLA && t <= now && (s.channel === "text" || s.channel === "li_connect" || s.channel === "li_message")) c[s.channel as "text"]++;
    }
    return c;
  }, [sends, now, todayLA]);
  const textCap = capForPhone(phoneType) === 25 ? 25 : DEFAULT_CAPS.text;

  const pull = async () => {
    setPulling(true);
    const { data, error } = await (supabase as any).rpc("nl_text_pull", { _count: pullN, _state: pullState.trim() || null, _channel: channel === "linkedin" ? "linkedin" : "text" });
    setPulling(false);
    if (error) { toast({ title: "Couldn't pull leads", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Pulled ${data} new lead${data === 1 ? "" : "s"}`, description: data === 0 ? "Nothing left that fits. Try a different state." : undefined });
    load();
  };

  const send = async (l: OLead, ch: "text" | "li_connect" | "li_message", tpl: Tpl | undefined, body: string, when?: Date) => {
    if (!when && !inWindow(new Date(), l.state)) {
      toast({ title: "Outside the send window", description: `8am–8pm in the lead's timezone (${tzForState(l.state).split("/")[1].replace("_", " ")}). Schedule it for later instead.`, variant: "destructive" });
      return;
    }
    if (when && !inWindow(when, l.state)) {
      toast({ title: "That time is outside 8am–8pm for this lead", description: "Pick a time inside their window.", variant: "destructive" }); return;
    }
    setBusy(l.id);
    const { error } = await (supabase as any).rpc("nl_text_send", { _id: l.id, _channel: ch, _when: when ? when.toISOString() : null, _template: tpl?.id ?? null, _body: body });
    setBusy(null);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: when ? "Scheduled" : "Marked sent" });
    load();
  };
  const unsend = async (l: OLead, ch: string) => {
    setBusy(l.id);
    const { error } = await (supabase as any).rpc("nl_text_unsend", { _id: l.id, _channel: ch });
    setBusy(null);
    if (error) { toast({ title: "Couldn't undo", description: error.message, variant: "destructive" }); return; }
    load();
  };
  const outcome = async (l: OLead, o: string) => {
    if (!o) return;
    setBusy(l.id);
    const { error } = await (supabase as any).rpc("nl_text_outcome", { _id: l.id, _channel: channel, _outcome: o });
    setBusy(null);
    if (error) { toast({ title: "Couldn't save outcome", description: error.message, variant: "destructive" }); return; }
    load();
  };
  const book = async (l: OLead) => {
    setBusy(l.id);
    const { data, error } = await (supabase as any).rpc("nl_text_book", { _id: l.id });
    setBusy(null);
    if (error) { toast({ title: "Couldn't book", description: error.message, variant: "destructive" }); return; }
    navigate(`/employee/close-prep/${data}`);
  };
  const landline = async (l: OLead) => {
    setBusy(l.id);
    const { error } = await (supabase as any).rpc("nl_text_landline", { _id: l.id });
    setBusy(null);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Marked landline", description: "It doesn't count toward your texts or stats." });
    load();
  };
  const accept = async (l: OLead, undo = false) => {
    setBusy(l.id);
    const { error } = await (supabase as any).rpc("nl_text_li_accept", { _id: l.id, _undo: undo });
    setBusy(null);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    load();
  };
  const setUrl = async (l: OLead, url: string) => {
    const { error } = await (supabase as any).rpc("nl_text_set_linkedin", { _id: l.id, _url: url });
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const isText = channel === "text";
  const sentAt = (l: OLead) => (isText ? l.text_sent_at : l.li_sent_at);
  const sentNow = (l: OLead) => (isText ? l.text_status === "sent" && !!l.text_sent_at && new Date(l.text_sent_at).getTime() <= now : l.li_status !== "new");
  const touched = (l: OLead) => (isText ? l.text_status === "sent" : l.li_status !== "new");
  const mine = (l: OLead) => (isText ? !!l.phone || l.text_status === "sent" : !!l.linkedin_url || l.li_status !== "new");
  const TABS: { k: string; l: string; match: (l: OLead) => boolean }[] = isText ? [
    { k: "todo", l: "To text", match: (l) => l.text_status === "new" && !l.result && !!l.phone },
    { k: "sched", l: "Scheduled", match: (l) => l.text_status === "sent" && !sentNow(l) },
    { k: "wait", l: "Awaiting reply", match: (l) => sentNow(l) && !l.result },
    { k: "replied", l: "Replied", match: (l) => touched(l) && (l.result === "replied" || l.result === "booked") },
    { k: "done", l: "Done", match: (l) => touched(l) && ["lost", "stop", "wrong_number", "no_reply", "landline", "closed"].includes(l.result || "") },
  ] : [
    { k: "todo", l: "To connect", match: (l) => l.li_status === "new" && !l.result && !!l.linkedin_url },
    { k: "req", l: "Requested", match: (l) => l.li_status === "requested" && !l.result },
    { k: "msg", l: "To message", match: (l) => l.li_status === "accepted" && !l.result },
    { k: "wait", l: "Awaiting reply", match: (l) => l.li_status === "sent" && !l.result },
    { k: "replied", l: "Replied", match: (l) => touched(l) && (l.result === "replied" || l.result === "booked") },
    { k: "done", l: "Done", match: (l) => touched(l) && ["lost", "stop", "wrong_number", "no_reply", "landline", "closed"].includes(l.result || "") },
    { k: "nourl", l: "No LinkedIn", match: (l) => !l.linkedin_url && l.li_status === "new" && !l.result },
  ];
  const cur = TABS.find((t) => t.k === tab) || TABS[0];
  const rows = leads.filter((l) => cur.match(l));
  const todoCount = TABS[0] ? leads.filter((l) => TABS[0].match(l)).length : 0;

  const stat = (label: string, used: number, cap: number) => (
    <div className={surface + " px-4 py-3"}>
      <div className="flex items-center gap-2 font-mono text-[22px] font-bold tabular-nums">{used}<span className="text-[14px] text-white/60">/ {cap}</span>
        {used >= cap && <Check className="h-5 w-5 text-[hsl(152,62%,52%)]" />}</div>
      <div className="text-[12px] text-white/70">{label}</div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (used / cap) * 100)}%`, background: used >= cap ? "hsl(152,62%,52%)" : "hsl(211,96%,56%)" }} /></div>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1000px] gap-4 pb-20 text-white">
      <header className={surface + " flex flex-wrap items-center justify-between gap-2 px-4 py-3"}>
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><MessageSquare className="h-5 w-5 text-[hsl(211,96%,62%)]" />Outreach</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setGuideAt(GUIDE.big)} className={btn + " " + accent}><HelpCircle className="h-4 w-4" />How it works</button>
        </div>
      </header>

      <div className={surface + " grid gap-3 p-3"}>
        <div className="grid grid-cols-2 gap-2">
          {([["text", "Text", MessageSquare], ["linkedin", "LinkedIn", Linkedin]] as const).map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => setChannel(k)} aria-pressed={channel === k} className={btn + " min-h-[42px] text-[15px] " + (channel === k ? accent : quiet)}><Icon className="h-4 w-4" />{l}</button>
          ))}
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: isText ? "1fr" : "1fr 1fr" }}>
          {isText ? stat("Texts sent today", counts.text, textCap) : <>
            {stat("Requests today", counts.li_connect, DEFAULT_CAPS.li_connect)}
            {stat("Messages today", counts.li_message, DEFAULT_CAPS.li_message)}
          </>}
        </div>
        {isText && <div className="flex items-center justify-between text-[12.5px] text-white/75"><span>Scheduled, next {PLAN_DAYS} days: <b className="text-white">{counts.textNext3} / {textCap * PLAN_DAYS}</b></span><InfoBtn onClick={() => setGuideAt(GUIDE.limits)} label="What are these numbers?" /></div>}
        {!isText && <div className="flex justify-end"><InfoBtn onClick={() => setGuideAt(GUIDE.limits)} label="What are these numbers?" /></div>}

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
          {TABS.map((t) => (
            <button key={t.k} type="button" onClick={() => { setTab(t.k); setShown(25); }} aria-pressed={cur.k === t.k}
              className={"min-h-[36px] shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold " + (cur.k === t.k ? accent : quiet)}>
              {t.l} <span className="opacity-90">{leads.filter((l) => t.match(l)).length}</span>
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2 text-[13px] text-white/85">
          <span className="flex-1">{TAB_HELP[channel][cur.k]}</span>
          <InfoBtn onClick={() => setGuideAt(cur.k === "sched" ? GUIDE.schedule : cur.k === "msg" || cur.k === "req" ? GUIDE.liMessage : cur.k === "replied" ? GUIDE.book : cur.k === "wait" || cur.k === "done" ? GUIDE.outcome : cur.k === "nourl" ? GUIDE.liConnect : GUIDE.card)} label="Explain this tab" />
        </div>

        <details key={String(!loading && leads.filter(mine).length === 0)} open={!loading && leads.filter(mine).length === 0} className="rounded-xl border border-white/[0.16] bg-[hsl(220,40%,12%)] open:pb-3">
          <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between px-3 text-[13.5px] font-semibold">Get more leads &amp; settings<span className="text-white/60">▾</span></summary>
          <div className="grid gap-3 px-3">
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" min={1} max={150} value={pullN} onChange={(e) => setPullN(Math.max(1, Math.min(150, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-white/30 bg-[hsl(220,40%,13%)] px-2 py-1.5 text-[13px] text-white" aria-label="How many leads to pull" />
              <input value={pullState} onChange={(e) => setPullState(e.target.value.toUpperCase().slice(0, 2))} placeholder="State"
                className="w-16 rounded-lg border border-white/30 bg-[hsl(220,40%,13%)] px-2 py-1.5 text-[13px] text-white placeholder:text-white/70" aria-label="State (optional)" />
              <button type="button" onClick={pull} disabled={pulling} className={btn + " " + accent}>{pulling && <Loader2 className="h-4 w-4 animate-spin" />}Pull leads</button>
              <InfoBtn onClick={() => setGuideAt(GUIDE.pull)} label="About pulling leads" />
            </div>
            {!isText && <button type="button" onClick={() => setImportOpen(true)} className={btn + " " + quiet + " justify-self-start"}><Upload className="h-4 w-4" />Import LinkedIn leads</button>}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[13px] text-white/70" htmlFor="phoneType">My phone</label>
              <select id="phoneType" value={phoneType} onChange={(e) => savePhone(e.target.value as PhoneType)}
                className="rounded-lg border border-white/[0.16] bg-[hsl(220,35%,12%)] px-2.5 py-1.5 text-[13px] text-white">
                {PHONE_TYPES.map((p) => <option key={p.k} value={p.k}>{p.label}</option>)}
              </select>
              <InfoBtn onClick={() => setGuideAt(GUIDE.phone)} label="About phone type" />
            </div>
          </div>
        </details>
      </div>

      {loading ? <div className="py-10 text-center text-white/60"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        : rows.length === 0 ? (
          <div className={surface + " px-5 py-8 text-center text-[14px] text-white/75"}>
            {leads.filter(mine).length === 0 ? <>No leads yet. Open <b>Get more leads</b> above and tap <b>Pull leads</b>.</> : <>Nothing here{cur.k === "todo" && todoCount === 0 ? ". Pull more leads to keep going" : ""}.</>}
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.slice(0, shown).map((l) => (
              <LeadCard key={l.id + cur.k} l={l} tab={cur.k} channel={channel} rep={rep} tpls={tpls} phoneType={phoneType} busy={busy === l.id}
                lastText={counts.lastText} onSend={send} onUnsend={unsend} onOutcome={outcome} onBook={book} onUrl={setUrl} onLandline={landline} onAccept={accept} info={setGuideAt} sentAt={sentAt(l)} />
            ))}
            {rows.length > shown && <button type="button" className={btn + " " + quiet} onClick={() => setShown((n) => n + 25)}>Show more ({rows.length - shown} left)</button>}
          </div>
        )}
      <OutreachGuide open={guideAt !== null} onOpenChange={(o) => { if (!o) setGuideAt(null); }} startAt={guideAt ?? 0} phoneType={phoneType} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={load} onInfo={() => { setImportOpen(false); setGuideAt(GUIDE.import); }} />
    </div>
  );
}

function LeadCard({ l, tab, channel, rep, tpls, phoneType, busy, lastText, onSend, onUnsend, onOutcome, onBook, onUrl, onLandline, onAccept, info, sentAt }: {
  l: OLead; tab: string; channel: Channel; rep: string; tpls: Tpl[]; phoneType: PhoneType; busy: boolean; lastText: number;
  onSend: (l: OLead, ch: "text" | "li_connect" | "li_message", tpl: Tpl | undefined, body: string, when?: Date) => void;
  onUnsend: (l: OLead, ch: string) => void; onOutcome: (l: OLead, o: string) => void; onBook: (l: OLead) => void; onUrl: (l: OLead, u: string) => void; onLandline: (l: OLead) => void; onAccept: (l: OLead, undo?: boolean) => void; info: (step: number) => void;
  sentAt: string | null;
}) {
  const isText = channel === "text";
  const ch: "text" | "li_connect" | "li_message" = isText ? "text" : l.li_status === "accepted" ? "li_message" : "li_connect";
  const options = tpls.filter((t) => t.channel === ch);
  const [tplId, setTplId] = useState<string>(() => options.length ? options[hash(l.id) % options.length].id : "");
  const tpl = options.find((t) => t.id === tplId) || options[0];
  const vars = { first: firstNameOf(l.first_name, l.contact_name), rep, firm: shortFirm(l.firm_name), city: l.city ? l.city.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "" };
  const filled = useMemo(() => (tpl ? fillTemplate(tpl.body, vars) : ""), [tpl, vars.first, vars.rep, vars.firm, vars.city]); // eslint-disable-line react-hooks/exhaustive-deps
  const [edit, setEdit] = useState<string | null>(null);
  const body = edit ?? filled;
  const suggested = useMemo(() => toLocalInput(nextPreferred(new Date(Math.max(Date.now() + 5 * 60000, lastText) + MIN_GAP_MIN * 60000), l.state)), [lastText, l.state]);
  const [when, setWhen] = useState(suggested);
  const [url, setUrlText] = useState("");
  const todo = tab === "todo" || (!isText && tab === "msg");
  const outsideNow = !inWindow(new Date(), l.state);
  const sentTime = sentAt ? new Date(sentAt) : null;
  const scheduled = sentTime && sentTime.getTime() > Date.now();

  return (
    <article className={surface + " grid gap-2.5 px-4 py-3.5"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-bold">{shortFirm(l.firm_name)} <span className="font-normal text-white/60">· {l.contact_name || "No name"}</span></div>
          <div className="text-[12.5px] text-white/65">
            {[l.city && l.state ? `${l.city}, ${l.state}` : l.state, l.aum ? `AUM ${money(l.aum)}` : "", isText ? prettyPhone(l.phone) : ""].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          {l.outcome && <span className="rounded-full bg-[hsla(211,96%,56%,.18)] px-2 py-0.5 font-semibold text-[hsl(211,96%,78%)]">{l.outcome}</span>}
          {sentTime && <span className="text-white/60">{scheduled ? "Scheduled " : "Sent "}{sentTime.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
        </div>
      </div>

      {tab === "nourl" && (
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrlText(e.target.value)} placeholder="Paste their LinkedIn profile link"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.16] bg-transparent px-2.5 py-1.5 text-[13px]" />
          <button type="button" disabled={!url.trim()} className={btn + " " + accent} onClick={() => onUrl(l, url)}>Save link</button>
        </div>
      )}

      {todo && tpl && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select value={tpl.id} onChange={(e) => { setTplId(e.target.value); setEdit(null); }} className="rounded-lg border border-white/[0.16] bg-[hsl(220,35%,12%)] px-2 py-1 text-[12.5px]" aria-label="Template">
              {options.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {!isText && <span className="text-[12.5px] font-semibold text-white/75">{ch === "li_connect" ? "Step 1: connection request" : "Step 2: message"}</span>}
            {edit !== null && <button type="button" className="text-[12.5px] text-white/60 underline" onClick={() => setEdit(null)}>Reset to template</button>}
          </div>
          <textarea value={body} onChange={(e) => setEdit(e.target.value)} rows={3}
            className="w-full resize-y rounded-lg border border-white/[0.14] bg-white/[0.03] px-3 py-2 text-[14px] leading-snug" aria-label="Message" />
          {outsideNow && <div className="text-[12.5px] text-[hsl(38,95%,62%)]">Outside 8am–8pm for this lead right now{isText && canSchedule(phoneType) ? ". You can schedule it instead." : "."}</div>}
          <div className="flex flex-wrap items-center gap-2">
            {isText ? (
              <>
                <a href={smsHref(l.phone, body, phoneType)} onClick={() => { try { navigator.clipboard.writeText(body); } catch { /* ignore */ } }} className={btn + " " + accent}><MessageSquare className="h-4 w-4" />Text</a>
                <button type="button" className={btn + " " + quiet} onClick={() => copy(body)}><Copy className="h-4 w-4" />Copy</button>
                <button type="button" disabled={busy} className={btn + " " + quiet} onClick={() => onSend(l, "text", tpl, body)}><Check className="h-4 w-4" />Sent</button>
                <button type="button" disabled={busy} className={btn + " " + quiet} title="Can't text this number. Doesn't count toward anything." onClick={() => onLandline(l)}><PhoneOff className="h-4 w-4" />Landline</button>
                <InfoBtn onClick={() => info(GUIDE.landline)} label="What is Landline?" />
                <InfoBtn onClick={() => info(GUIDE.text)} />
                {canSchedule(phoneType) && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-lg border border-white/[0.16] bg-transparent px-2 py-1 text-[12.5px]" aria-label="Schedule time" />
                    <button type="button" disabled={busy || !when} className={btn + " " + quiet} onClick={() => onSend(l, "text", tpl, body, new Date(when))}><CalendarClock className="h-4 w-4" />Scheduled</button>
                    <InfoBtn onClick={() => info(GUIDE.schedule)} label="How do I schedule?" />
                  </span>
                )}
              </>
            ) : (
              <>
                <button type="button" className={btn + " " + accent} onClick={() => { try { navigator.clipboard.writeText(body); } catch { /* ignore */ } if (l.linkedin_url) window.open(l.linkedin_url, "_blank", "noopener"); toast({ title: "Message copied", description: "Paste it on their profile." }); }}>
                  <ExternalLink className="h-4 w-4" />Copy + open profile</button>
                <button type="button" disabled={busy} className={btn + " " + quiet} onClick={() => onSend(l, ch, tpl, body)}><Check className="h-4 w-4" />{ch === "li_connect" ? "Request sent" : "Message sent"}</button>
                {ch === "li_message" && <button type="button" disabled={busy} className={btn + " " + quiet} onClick={() => onAccept(l, true)}>Not accepted yet</button>}
                <InfoBtn onClick={() => info(ch === "li_connect" ? GUIDE.liConnect : GUIDE.liMessage)} />
              </>
            )}
          </div>
        </>
      )}

      {!todo && tab !== "nourl" && (
        <div className="flex flex-wrap items-center gap-2">
          <select value="" disabled={busy} onChange={(e) => onOutcome(l, e.target.value)} className="rounded-lg border border-white/[0.16] bg-[hsl(220,35%,12%)] px-2.5 py-1.5 text-[13px]" aria-label="Log outcome">
            <option value="">{l.outcome ? `Outcome: ${l.outcome} — change` : "— Log outcome —"}</option>
            {OUTREACH_OUTCOMES.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>)}
          </select>
          <InfoBtn onClick={() => info(GUIDE.outcome)} />
          {!isText && tab === "req" && <button type="button" disabled={busy} className={btn + " " + accent} title="They accepted my request" onClick={() => onAccept(l)}><Check className="h-4 w-4" />Accepted</button>}
          {!isText && tab === "req" && <InfoBtn onClick={() => info(GUIDE.liMessage)} label="What is Accepted?" />}
          {(l.result === "replied" || l.result === "booked") && <button type="button" disabled={busy} className={btn + " " + accent} onClick={() => onBook(l)}>{l.lead_id ? "Open in pipeline" : "Book"}</button>}
          {(l.result === "replied" || l.result === "booked") && <InfoBtn onClick={() => info(GUIDE.book)} label="What does Book do?" />}
          {isText && tab !== "done" && <button type="button" disabled={busy} className={btn + " " + quiet} title="Can't text this number. Removes the send so it doesn't count." onClick={() => onLandline(l)}><PhoneOff className="h-4 w-4" />Landline</button>}
          {tab !== "done" && <button type="button" disabled={busy} className={btn + " " + quiet} onClick={() => onUnsend(l, isText ? "text" : l.li_status === "sent" ? "li_message" : "li_connect")}><Undo2 className="h-4 w-4" />Undo send</button>}
        </div>
      )}
    </article>
  );
}

function InfoBtn({ onClick, label = "More info" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-[hsl(220,40%,13%)] text-white hover:bg-[hsl(220,40%,19%)]">
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}

function ImportDialog({ open, onOpenChange, onDone, onInfo }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; onInfo: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setRows([]); setFileName(""); setErr(""); } }, [open]);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFileName(f.name); setErr("");
    const { rows: r, missingLinkedIn } = csvToLeads(await f.text());
    if (missingLinkedIn) { setRows([]); setErr("I couldn't find a linkedin_url column. Add one and try again."); return; }
    if (!r.length) { setRows([]); setErr("No rows with a LinkedIn link were found."); return; }
    setRows(r);
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([CSV_EXAMPLE], { type: "text/csv" })); a.download = "linkedin-leads-example.csv"; a.click();
  };
  const run = async () => {
    setBusy(true);
    let added = 0, dup = 0, bad = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await (supabase as any).rpc("nl_text_import", { _rows: rows.slice(i, i + 500) });
      if (error) { setBusy(false); toast({ title: "Import failed", description: error.message, variant: "destructive" }); return; }
      added += data.added; dup += data.duplicates; bad += data.invalid;
    }
    setBusy(false);
    toast({ title: `Added ${added} lead${added === 1 ? "" : "s"}`, description: `${dup} already in the system, ${bad} had a bad link.` });
    onDone(); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import LinkedIn leads</DialogTitle>
          <DialogDescription>Upload a CSV. Every row needs a LinkedIn link (linkedin_url). Other columns are optional: first_name, last_name, firm, phone, city, state. Up to 500 rows at a time.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={download} className={btn + " " + quiet}>Download example</button>
          <InfoBtn onClick={onInfo} label="Step by step" />
          <label className={btn + " " + accent + " cursor-pointer"}>
            <Upload className="h-4 w-4" />Choose file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {fileName && <span className="text-[13px] opacity-80">{fileName}</span>}
        </div>
        {err && <p className="text-[13.5px] text-[hsl(0,85%,70%)]">{err}</p>}
        {rows.length > 0 && (
          <div className="grid gap-2 text-[13px]">
            <div><b>{rows.length}</b> rows ready. First few:</div>
            <ul className="grid gap-1 rounded-lg border border-white/[0.14] p-2">
              {rows.slice(0, 5).map((r, i) => <li key={i} className="truncate">{[r.name || [r.first_name, r.last_name].filter(Boolean).join(" "), r.firm, r.linkedin_url].filter(Boolean).join(" · ")}</li>)}
            </ul>
            <button type="button" disabled={busy} onClick={run} className={btn + " " + accent}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Import {rows.length} rows</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
