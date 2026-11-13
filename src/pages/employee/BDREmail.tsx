import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Inbox, Loader2, Mail, Mic, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildEmail, type MediaKind } from "@/lib/emailTemplates";

/**
 * Email leads — /employee/email (under Dialer). 100 a night, Sun–Thu 6pm Pacific, from the salesman's cities
 * (nl_email_pull_daily). Each card: business, owner, owner email, subject + email to copy/paste and send yourself.
 * Each email lead is also a Cold lead ("Email · City, ST" list), so a booking runs through the normal pipeline.
 */

type Status = "new" | "sent" | "replied" | "booked" | "not_interested" | "unsubscribed" | "bounced";
interface EmailLead {
  id: string; lead_id: string | null; firm_name: string; owner_name: string | null; owner_first: string | null; owner_email: string;
  website: string | null; city: string | null; state: string | null; youtube_url: string | null;
  youtube_status: "pending" | "checking" | "found" | "none"; status: Status; sent_at: string | null; created_at: string;
  research_status: "pending" | "researching" | "done"; media_kind: MediaKind; media_url: string | null; media_title: string | null;
  media_notes: string | null; podcast_url: string | null; podcast_name: string | null; sent_from: string | null;
}
interface SendingInbox { id: string; email: string; daily_limit: number; active: boolean; position: number }

/** Pacific-time calendar day, so "today's sends per inbox" matches the salesman's day. */
const laDay = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
/** Gmail compose window, pre-filled, opened in the chosen sending inbox (authuser = that address, signed in in this browser). */
function gmailComposeUrl(inbox: string | null, to: string, subject: string, body: string) {
  const q = new URLSearchParams({ view: "cm", fs: "1", tf: "1", to, su: subject, body });
  if (inbox) q.set("authuser", inbox);
  return `https://mail.google.com/mail/?${q.toString()}`;
}
/** That firm's thread in the inbox it was sent from — for replies and follow-ups. */
function gmailThreadUrl(inbox: string | null, to: string) {
  return `https://mail.google.com/mail/${inbox ? `?authuser=${encodeURIComponent(inbox)}` : ""}#search/${encodeURIComponent(`to:${to}`)}`;
}

/** Which template a lead gets. The nightly research (YouTube channels, YouTube appearances, podcasts) decides;
 *  before it finishes, a channel linked on their own website still counts. */
function mediaOf(r: EmailLead): MediaKind {
  if (r.research_status === "done") return r.media_kind;
  return r.youtube_status === "found" && r.youtube_url ? "youtube" : null;
}

const TABS: { k: string; l: string; match: (s: Status) => boolean }[] = [
  { k: "new", l: "To send", match: (s) => s === "new" },
  { k: "sent", l: "Sent", match: (s) => s === "sent" },
  { k: "done", l: "Results", match: (s) => !["new", "sent"].includes(s) },
  { k: "all", l: "All", match: () => true },
];
const OUTCOMES: { s: Status; l: string; c: string }[] = [
  { s: "replied", l: "Replied", c: "hsl(197,100%,62%)" },
  { s: "booked", l: "Booked", c: "hsl(152,62%,52%)" },
  { s: "not_interested", l: "Not interested", c: "hsl(38,95%,58%)" },
  { s: "unsubscribed", l: "Unsubscribe", c: "hsl(0,85%,68%)" },
  { s: "bounced", l: "Bounced", c: "hsl(215,20%,62%)" },
];
const STATUS_LABEL: Record<Status, string> = { new: "To send", sent: "Sent", replied: "Replied", booked: "Booked", not_interested: "Not interested", unsubscribed: "Unsubscribed", bounced: "Bounced" };
const surface = "rounded-2xl border border-white/[0.14] bg-[hsla(220,40%,9%,.78)]";

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: `${what} copied` });
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast({ title: `${what} copied` }); } catch { toast({ title: "Couldn't copy", description: "Select the text and copy it.", variant: "destructive" }); }
    ta.remove();
  }
}

export default function BDREmail() {
  const [rows, setRows] = useState<EmailLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [inboxes, setInboxes] = useState<SendingInbox[]>([]);
  const [showInboxes, setShowInboxes] = useState(false);

  const loadInboxes = useCallback(async () => {
    const { data } = await (supabase as any).from("nl_sending_inboxes").select("id, email, daily_limit, active, position").order("position").order("created_at");
    setInboxes((data as SendingInbox[]) || []);
  }, []);
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data, error } = await (supabase as any).from("nl_email_leads").select("*").eq("rep_user_id", uid).order("created_at", { ascending: false }).limit(1000);
    if (error) toast({ title: "Couldn't load email leads", description: error.message, variant: "destructive" });
    setRows((data as EmailLead[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { loadInboxes(); }, [loadInboxes]);
  useEffect(() => { load(); }, [load]);
  // YouTube checks finish over a few minutes after the 6pm pull — refresh while any are still running.
  useEffect(() => {
    if (!rows.some((r) => r.research_status !== "done")) return;
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [rows, load]);

  const setStatus = async (r: EmailLead, s: Status, sentFrom?: string | null) => {
    setBusy(r.id);
    const { error } = await (supabase as any).rpc("nl_email_set_status", { _id: r.id, _status: s, _sent_from: sentFrom ?? null });
    setBusy(null);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    setRows((xs) => xs.map((x) => (x.id === r.id ? {
      ...x, status: s,
      sent_at: s === "new" ? null : x.sent_at || new Date().toISOString(),
      sent_from: s === "new" ? null : (sentFrom ? sentFrom.trim().toLowerCase() : x.sent_from),
    } : x)));
  };

  // Inbox rotation: each new email goes to the first active inbox that hasn't hit today's limit.
  const todayLA = laDay(new Date());
  const usedToday = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) if (r.sent_from && r.sent_at && laDay(r.sent_at) === todayLA) m[r.sent_from] = (m[r.sent_from] || 0) + 1;
    return m;
  }, [rows, todayLA]);
  const active = inboxes.filter((i) => i.active);
  const nextInbox = active.find((i) => (usedToday[i.email.toLowerCase()] || 0) < i.daily_limit)?.email.toLowerCase() ?? null;
  const allFull = active.length > 0 && !nextInbox;
  const capacity = active.reduce((n, i) => n + i.daily_limit, 0);

  const today = new Date().toDateString();
  const stats = useMemo(() => ({
    toSend: rows.filter((r) => r.status === "new").length,
    sentToday: rows.filter((r) => r.sent_at && new Date(r.sent_at).toDateString() === today).length,
    replied: rows.filter((r) => r.status === "replied" || r.status === "booked").length,
    booked: rows.filter((r) => r.status === "booked").length,
    youtube: rows.filter((r) => mediaOf(r) !== null).length,
  }), [rows, today]);
  const shown = rows.filter((r) => TABS.find((t) => t.k === tab)!.match(r.status));

  return (
    <div className="mx-auto grid max-w-[1000px] gap-4 pb-20 text-white">
      <header className={surface + " grid gap-1.5 px-5 py-4"}>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Email leads</span>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Mail className="h-6 w-6 text-[hsl(197,100%,62%)]" />Email</h1>
        <p className="max-w-[70ch] text-[14.5px] text-white/85">New firms land here every work night at 6pm Pacific, from your cities. Tap <b>Open in Gmail</b>: the email opens filled in, from the right inbox. Schedule it for the morning, then tap <b>Sent</b>. Every firm here is also a Cold lead in your Dialer, so when they book, it runs through your normal pipeline.</p>
      </header>

      <section className={surface + " grid gap-2 px-4 py-3"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[14px]">
            <Inbox className="h-4 w-4 text-[hsl(197,100%,62%)]" />
            {active.length === 0
              ? <span className="text-white/85">No sending inboxes yet. Add them so the app picks the right inbox for each email.</span>
              : <span className="text-white/85"><b>{active.reduce((n, i) => n + (usedToday[i.email.toLowerCase()] || 0), 0)}</b> of <b>{capacity}</b> sent today across {active.length} inbox{active.length === 1 ? "" : "es"}{nextInbox ? <> · next: <b>{nextInbox}</b></> : <> · <b className="text-[hsl(38,95%,62%)]">all inboxes are at today's limit</b></>}</span>}
          </div>
          <button type="button" onClick={() => setShowInboxes((v) => !v)} className="rounded-lg border border-white/[0.16] px-3 py-1 text-[13px] font-semibold text-[hsl(197,100%,75%)]">{showInboxes ? "Close" : "My sending inboxes"}</button>
        </div>
        {showInboxes && <InboxPanel inboxes={inboxes} usedToday={usedToday} onChange={loadInboxes} />}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[["To send", stats.toSend], ["Sent today", stats.sentToday], ["Replied", stats.replied], ["Booked", stats.booked], ["YouTube / podcast", stats.youtube]].map(([l, v]) => (
          <div key={l as string} className={surface + " px-4 py-3"}><div className="font-mono text-[22px] font-bold tabular-nums">{v}</div><div className="text-[12px] text-white/75">{l}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.k} type="button" onClick={() => setTab(t.k)} aria-pressed={tab === t.k}
            className={"min-h-[34px] rounded-full border px-3.5 text-[13px] font-semibold " + (tab === t.k ? "border-[hsl(197,100%,60%)] bg-[hsla(197,100%,60%,.14)] text-[hsl(197,100%,75%)]" : "border-white/[0.16] bg-[hsla(220,40%,9%,.78)] text-white/80")}>
            {t.l} <span className="opacity-70">{rows.filter((r) => t.match(r.status)).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={surface + " flex items-center gap-2 p-5 text-white/80"}><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>
      ) : shown.length === 0 ? (
        <div className={surface + " p-5 text-[14px] text-white/85"}>
          {rows.length === 0 ? "No email leads yet. They arrive at 6pm Pacific, Sunday to Thursday, once you have a state assigned." : "Nothing here."}
        </div>
      ) : (
        shown.map((r) => <Card key={r.id} r={r} busy={busy === r.id} onStatus={setStatus} nextInbox={nextInbox} allFull={allFull} />)
      )}
    </div>
  );
}

function Card({ r, busy, onStatus, nextInbox, allFull }: {
  r: EmailLead; busy: boolean; onStatus: (r: EmailLead, s: Status, sentFrom?: string | null) => void; nextInbox: string | null; allFull: boolean;
}) {
  const [openedIn, setOpenedIn] = useState<string | null>(null);
  const media = mediaOf(r);
  const researching = r.research_status !== "done";
  const draft = buildEmail({ firstName: r.owner_first, media, podcastName: r.podcast_name });
  const link = media === "podcast" ? (r.podcast_url || r.media_url) : (r.media_url || r.youtube_url);
  return (
    <article className={surface + " grid gap-3 p-4 sm:p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold leading-tight">{r.firm_name}</h2>
          <p className="text-[13px] text-white/75">{[r.city, r.state].filter(Boolean).join(", ")}{r.website ? <> · <a href={r.website.replace("#redirected", "")} target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white">website</a></> : null}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {media === "youtube" ? (
            <a href={link || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[hsla(0,85%,62%,.5)] bg-[hsla(0,85%,55%,.14)] px-2.5 py-1 text-[12px] font-semibold text-[hsl(0,90%,78%)]"><Play className="h-3.5 w-3.5" />YouTube found</a>
          ) : media === "podcast" ? (
            <a href={link || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[hsla(275,80%,65%,.5)] bg-[hsla(275,80%,60%,.14)] px-2.5 py-1 text-[12px] font-semibold text-[hsl(275,90%,82%)]"><Mic className="h-3.5 w-3.5" />Podcast found</a>
          ) : researching ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] px-2.5 py-1 text-[12px] text-white/70"><Loader2 className="h-3 w-3 animate-spin" />Researching YouTube & podcasts</span>
          ) : (
            <span className="rounded-full border border-white/[0.14] px-2.5 py-1 text-[12px] text-white/70">No YouTube or podcast</span>
          )}
          <span className="rounded-full border border-white/[0.14] px-2.5 py-1 text-[12px] font-semibold text-white/85">{STATUS_LABEL[r.status]}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Owner" value={r.owner_name || "—"} />
        <Field label="Owner email" value={r.owner_email} copy="Email address" />
      </div>
      {media && (r.media_title || r.media_notes) && (
        <p className="rounded-lg border border-white/[0.12] bg-[hsla(222,44%,5%,.7)] px-3 py-2 text-[13px] text-white/85">
          <b>What we found:</b> {r.media_title}{r.media_title && r.media_notes ? " — " : ""}{r.media_notes}
          {link && <> · <a href={link} target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white">open</a></>}
        </p>
      )}
      {researching && r.status === "new" && (
        <p className="text-[12.5px] text-white/70">Research is still running for this firm. If it finds YouTube or a podcast, the email below changes, so wait for it if you can.</p>
      )}
      <Field label={draft.template === "youtube" ? "Subject · YouTube version" : draft.template === "podcast" ? "Subject · Podcast version" : "Subject"} value={draft.subject} copy="Subject" />
      <Field label="Email" value={draft.body} copy="Email" multiline />

      <div className="flex flex-wrap items-center gap-2">
        {r.status === "new" ? (
          <>
            <button type="button" disabled={allFull && !openedIn}
              onClick={() => {
                const inbox = openedIn || nextInbox;
                window.open(gmailComposeUrl(inbox, r.owner_email, draft.subject, draft.body), "_blank", "noopener");
                setOpenedIn(inbox || "");
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))] px-4 text-[14px] font-semibold text-white disabled:opacity-50">
              <ExternalLink className="h-4 w-4" />Open in Gmail{(openedIn || nextInbox) ? <span className="font-normal opacity-85">· {openedIn || nextInbox}</span> : null}
            </button>
            <button type="button" disabled={busy} onClick={() => onStatus(r, "sent", openedIn || nextInbox)}
              className={"inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-4 text-[14px] font-semibold disabled:opacity-60 " + (openedIn !== null ? "border-[hsl(152,62%,52%)] bg-[hsla(152,62%,45%,.18)] text-[hsl(152,70%,72%)]" : "border-white/[0.18] text-white/85")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Sent
            </button>
            {allFull && !openedIn && <span className="text-[12.5px] text-[hsl(38,95%,62%)]">Every inbox has hit today's limit. Send the rest tomorrow.</span>}
          </>
        ) : (
          <>
            {OUTCOMES.map((o) => (
              <button key={o.s} type="button" disabled={busy} onClick={() => onStatus(r, o.s)} aria-pressed={r.status === o.s}
                className="min-h-[34px] rounded-lg border px-3 text-[13px] font-semibold disabled:opacity-60"
                style={r.status === o.s ? { borderColor: o.c, color: o.c, background: `color-mix(in srgb, ${o.c} 16%, transparent)` } : { borderColor: "rgba(255,255,255,.16)", color: "rgba(255,255,255,.85)" }}>
                {o.l}
              </button>
            ))}
            <a href={gmailThreadUrl(r.sent_from, r.owner_email)} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/[0.16] px-3 text-[13px] font-semibold text-[hsl(197,100%,75%)]">
              <ExternalLink className="h-3.5 w-3.5" />Open thread{r.sent_from ? ` · ${r.sent_from}` : ""}
            </a>
            <button type="button" disabled={busy} onClick={() => onStatus(r, "new")} title="Back to To send" className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 text-[12.5px] text-white/70 hover:text-white"><RotateCcw className="h-3.5 w-3.5" />Undo</button>
          </>
        )}
      </div>
    </article>
  );
}

function Field({ label, value, copy, multiline }: { label: string; value: string; copy?: string; multiline?: boolean }) {
  return (
    <div className="grid min-w-0 gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/70">{label}</span>
        {copy && (
          <button type="button" onClick={() => copyText(value, copy)} className="inline-flex items-center gap-1 rounded-md border border-white/[0.16] px-2 py-0.5 text-[12px] font-semibold text-[hsl(197,100%,75%)] hover:border-[hsl(197,100%,60%)]">
            <Copy className="h-3 w-3" />Copy
          </button>
        )}
      </div>
      <div className={"rounded-lg border border-white/[0.12] bg-[hsla(222,44%,5%,.7)] px-3 py-2 text-[14px] " + (multiline ? "whitespace-pre-wrap leading-relaxed" : "truncate")}>{value}</div>
    </div>
  );
}

function InboxPanel({ inboxes, usedToday, onChange }: { inboxes: SendingInbox[]; usedToday: Record<string, number>; onChange: () => void }) {
  const [email, setEmail] = useState("");
  const [limit, setLimit] = useState(10);
  const [allLimit, setAllLimit] = useState("");
  const run = async (p: Promise<{ error: { message: string } | null }>) => {
    const { error } = await p;
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    onChange();
  };
  const db = (supabase as any).from("nl_sending_inboxes");
  const add = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast({ title: "Enter a full email address", variant: "destructive" }); return; }
    if (/@newlight(gen|-app)\.com$/.test(e)) { toast({ title: "Don't send cold email from newlightgen.com or newlight-app.com", description: "Use a separate sending domain.", variant: "destructive" }); return; }
    await run(db.insert({ email: e, daily_limit: limit, position: inboxes.length }));
    setEmail("");
  };
  return (
    <div className="grid gap-2 border-t border-white/[0.1] pt-3">
      <p className="text-[12.5px] text-white/70">Sign in to each of these inboxes in this browser once (Gmail → profile picture → Add another account). The app sends each email to the next inbox that's under its daily limit. Raise limits only as the ramp schedule says.</p>
      {inboxes.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.12] bg-[hsla(222,44%,5%,.7)] px-3 py-2 text-[13.5px]">
          <span className={"min-w-0 flex-1 truncate " + (i.active ? "" : "text-white/45 line-through")}>{i.email}</span>
          <span className="font-mono text-[12.5px] tabular-nums text-white/75">{usedToday[i.email.toLowerCase()] || 0}/{i.daily_limit} today</span>
          <label className="flex items-center gap-1 text-[12px] text-white/70">Limit
            <input type="number" min={1} max={50} defaultValue={i.daily_limit}
              onBlur={(ev) => { const v = Math.max(1, Math.min(50, Number(ev.target.value) || i.daily_limit)); if (v !== i.daily_limit) run(db.update({ daily_limit: v }).eq("id", i.id)); }}
              className="w-14 rounded border border-white/[0.18] bg-transparent px-1.5 py-0.5 text-white" />
          </label>
          <button type="button" onClick={() => run(db.update({ active: !i.active }).eq("id", i.id))} className="rounded border border-white/[0.18] px-2 py-0.5 text-[12px] text-white/80">{i.active ? "Pause" : "Resume"}</button>
          <button type="button" onClick={() => run(db.delete().eq("id", i.id))} title="Remove" className="rounded p-1 text-white/60 hover:text-[hsl(0,85%,70%)]"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="niko@getnewlight.com" className="min-w-[220px] flex-1 rounded-lg border border-white/[0.18] bg-transparent px-3 py-1.5 text-[13.5px] text-white placeholder:text-white/40" />
        <label className="flex items-center gap-1 text-[12px] text-white/70">Limit
          <input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 10)} className="w-14 rounded border border-white/[0.18] bg-transparent px-1.5 py-1 text-white" />
        </label>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg bg-[hsla(197,100%,60%,.18)] px-3 py-1.5 text-[13px] font-semibold text-[hsl(197,100%,78%)]"><Plus className="h-3.5 w-3.5" />Add inbox</button>
      </div>
      {inboxes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-white/75">
          Set every inbox's limit to
          <input type="number" min={1} max={50} value={allLimit} onChange={(e) => setAllLimit(e.target.value)} className="w-14 rounded border border-white/[0.18] bg-transparent px-1.5 py-0.5 text-white" />
          <button type="button" disabled={!allLimit} onClick={() => { const v = Math.max(1, Math.min(50, Number(allLimit))); run(db.update({ daily_limit: v }).in("id", inboxes.map((i) => i.id))); setAllLimit(""); }}
            className="rounded border border-white/[0.18] px-2 py-0.5 text-white/85 disabled:opacity-50">Apply</button>
        </div>
      )}
    </div>
  );
}
