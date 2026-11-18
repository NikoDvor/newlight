import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Plus, Save, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Admin: text + LinkedIn outreach results per rep and per template, and the template editor. */
interface RepRow { rep_user_id: string; name: string; texts: number; li_requests: number; li_accepted: number; li_stale: number; li_messages: number; scheduled: number; replied: number; interested: number; booked: number; won: number; leads_touched: number }
interface TplRow { id: string; name: string; channel: string; active: boolean; sent: number; replied: number; interested: number; booked: number; won: number; outcomes: Record<string, number> }
interface Tpl { id: string; channel: string; name: string; body: string; active: boolean; position: number }
const CH: Record<string, string> = { text: "Text", li_connect: "LinkedIn connect note", li_message: "LinkedIn message" };
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const card = "rounded-2xl border border-border bg-card p-4";
const inp = "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm";

export default function AdminOutreachStats() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<{ reps: RepRow[]; templates: TplRow[]; outcomes: Record<string, number> } | null>(null);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, Tpl>>({});
  const [nw, setNw] = useState({ channel: "text", name: "", body: "" });
  const [open, setOpen] = useState<string | null>(null);
  const [chan, setChan] = useState("all");
  const [ask, setAsk] = useState<{ kind: "reset" | "delete"; t: Tpl } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [s, t] = await Promise.all([
      (supabase as any).rpc("nl_text_stats", { _since: since }),
      (supabase as any).from("nl_text_templates").select("*").order("channel").order("position"),
    ]);
    if (s.error) toast({ title: "Couldn't load stats", description: s.error.message, variant: "destructive" });
    setStats(s.data || null);
    setTpls((t.data as Tpl[]) || []); setDraft({});
    setLoading(false);
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const doSave = async (t: Tpl) => {
    const d = draft[t.id] || t;
    const { data, error } = await (supabase as any).rpc("nl_text_template_save", { _id: t.id, _name: d.name, _body: d.body, _active: d.active });
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: data ? "Saved. Stats reset to zero." : "Template saved" }); load();
  };
  // Changing the wording wipes that template's numbers, so ask first. Name or on/off changes keep them.
  const save = (t: Tpl) => {
    const d = draft[t.id] || t;
    if (d.body.trim() !== t.body.trim()) setAsk({ kind: "reset", t }); else doSave(t);
  };
  const doDelete = async (t: Tpl) => {
    const { error } = await (supabase as any).rpc("nl_text_template_delete", { _id: t.id });
    if (error) { toast({ title: "Couldn't delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Template deleted, its stats are gone" }); load();
  };
  const add = async () => {
    if (!nw.name.trim() || !nw.body.trim()) { toast({ title: "Add a name and the message", variant: "destructive" }); return; }
    const pos = Math.max(0, ...tpls.filter((t) => t.channel === nw.channel).map((t) => t.position)) + 1;
    const { error } = await (supabase as any).from("nl_text_templates").insert({ channel: nw.channel, name: nw.name.trim(), body: nw.body.trim(), position: pos });
    if (error) { toast({ title: "Couldn't add", description: error.message, variant: "destructive" }); return; }
    setNw({ channel: "text", name: "", body: "" }); load();
  };

  const reps = stats?.reps || [];
  const tot = reps.reduce((a, r) => ({ texts: a.texts + r.texts, req: a.req + r.li_requests, msg: a.msg + r.li_messages, touched: a.touched + r.leads_touched, replied: a.replied + r.replied, int: a.int + r.interested, booked: a.booked + r.booked }),
    { texts: 0, req: 0, msg: 0, touched: 0, replied: 0, int: 0, booked: 0 });

  return (
    <div className="mx-auto grid max-w-[1100px] gap-4 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><MessageSquare className="h-6 w-6" />Text &amp; LinkedIn outreach</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inp} aria-label="Date range">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </header>
      <p className="max-w-[75ch] text-sm text-muted-foreground">Replies are logged by the reps (the app can't see them), so response rates are only as good as their logging. Response rate = leads with a logged reply ÷ leads messaged. Interested = Replied or Booked.</p>
      {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Texts sent", tot.texts], ["LinkedIn requests", tot.req], ["LinkedIn messages", tot.msg], ["Response rate", pct(tot.replied, tot.touched)], ["Interested rate", pct(tot.int, tot.touched)], ["Booked", tot.booked]].map(([l, v]) => (
              <div key={l as string} className={card}><div className="font-mono text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
            ))}
          </div>

          <section className={card + " overflow-x-auto"}>
            <h2 className="mb-2 font-bold">By rep</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Rep</th><th>Texts</th><th>LI req.</th><th>Accepted</th><th>Accept rate</th><th>Stale 3wk+</th><th>LI msgs</th><th>Scheduled</th><th>Replied</th><th>Response</th><th>Interested</th><th>Booked</th><th>Won</th></tr></thead>
              <tbody>
                {reps.length === 0 && <tr><td colSpan={13} className="py-3 text-muted-foreground">No sends in this range yet.</td></tr>}
                {reps.map((r) => (
                  <tr key={r.rep_user_id} className="border-t border-border"><td className="py-1.5 font-medium">{r.name}</td><td>{r.texts}</td><td>{r.li_requests}</td><td>{r.li_accepted}</td><td>{pct(r.li_accepted, r.li_requests)}</td><td className={r.li_stale > 0 ? "font-semibold text-amber-500" : ""}>{r.li_stale}</td><td>{r.li_messages}</td><td>{r.scheduled}</td>
                    <td>{r.replied}</td><td>{pct(r.replied, r.leads_touched)}</td><td>{r.interested}</td><td>{r.booked}</td><td>{r.won}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={card + " overflow-x-auto"}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">By template</h2>
              <select value={chan} onChange={(e) => setChan(e.target.value)} className={inp} aria-label="Channel"><option value="all">All channels</option>{Object.entries(CH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Tap a row to see every outcome for that template. Won = the lead reached Won in the pipeline. Turning a template off keeps all its history. Rotation: Too early = under 10 sends (no verdict yet); Under/Over-used = share of the channel's sends is far from an even split.</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Template</th><th>Channel</th><th>Sent</th><th>Replied</th><th>Response</th><th>Interested</th><th>Booked</th><th>Won</th><th>Win rate</th><th>Rotation</th></tr></thead>
              <tbody>
                {(stats?.templates || []).filter((t) => chan === "all" || t.channel === chan).map((t) => {
                  const peers = (stats?.templates || []).filter((x) => x.channel === t.channel && x.active);
                  const total = peers.reduce((a, x) => a + x.sent, 0);
                  const share = total ? t.sent / total : 0, even = peers.length ? 1 / peers.length : 0;
                  const rot = !t.active ? "" : t.sent < 10 ? "Too early" : total >= 30 && share < even * 0.5 ? "Under-used" : total >= 30 && share > even * 1.5 ? "Over-used" : "Even";
                  const oc = Object.entries(t.outcomes || {}).sort((a, b) => b[1] - a[1]);
                  return (
                    <Fragment key={t.id}>
                      <tr className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => setOpen(open === t.id ? null : t.id)}>
                        <td className="py-1.5 font-medium">{t.name}{!t.active && <span className="ml-1 text-xs text-muted-foreground">(off)</span>}</td><td>{CH[t.channel]}</td><td>{t.sent}</td><td>{t.replied}</td><td>{pct(t.replied, t.sent)}</td><td>{t.interested}</td><td>{t.booked}</td><td>{t.won}</td><td>{pct(t.won, t.sent)}</td><td className={"text-xs " + (rot === "Under-used" || rot === "Over-used" ? "font-semibold text-amber-500" : "text-muted-foreground")}>{rot}{rot && total ? ` · ${Math.round(share * 100)}%` : ""}</td>
                      </tr>
                      {open === t.id && (
                        <tr className="bg-muted/30"><td colSpan={10} className="px-2 py-2">
                          {oc.length === 0 ? <span className="text-xs text-muted-foreground">No logged outcomes yet.</span> : (
                            <div className="flex flex-wrap gap-1.5">{oc.map(([o, n]) => <span key={o} className="rounded-full border border-border px-2 py-0.5 text-xs">{o}: <b>{n}</b> <span className="text-muted-foreground">({pct(n, t.sent)})</span></span>)}</div>
                          )}
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className={card + " grid gap-3"}>
            <h2 className="font-bold">Templates</h2>
            <p className="text-xs text-muted-foreground">Use {"{first}"} for their first name, {"{rep}"} for the rep's name, {"{firm}"} for the firm and {"{city}"} for the city. Reps get the active templates, split evenly across leads, so turning one off stops it going out (its numbers stay). Changing the wording or deleting a template removes its numbers, and the new wording starts fresh at zero.</p>
            {tpls.map((t) => {
              const d = draft[t.id] || t;
              return (
                <div key={t.id} className="grid gap-1.5 rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{CH[t.channel]}</span>
                    <input value={d.name} onChange={(e) => setDraft({ ...draft, [t.id]: { ...d, name: e.target.value } })} className={inp + " flex-1"} aria-label="Template name" />
                    <button type="button" onClick={() => setAsk({ kind: "delete", t })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground" aria-label="Delete template"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={d.active} onChange={(e) => setDraft({ ...draft, [t.id]: { ...d, active: e.target.checked } })} />Active</label>
                  </div>
                  <textarea value={d.body} rows={2} onChange={(e) => setDraft({ ...draft, [t.id]: { ...d, body: e.target.value } })} className={inp} aria-label="Template message" />
                  {draft[t.id] && <button type="button" onClick={() => save(t)} className="inline-flex w-fit items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"><Save className="h-4 w-4" />Save</button>}
                </div>
              );
            })}
            <div className="grid gap-1.5 rounded-xl border border-dashed border-border p-3">
              <div className="text-sm font-semibold">Add a template</div>
              <div className="flex flex-wrap gap-2">
                <select value={nw.channel} onChange={(e) => setNw({ ...nw, channel: e.target.value })} className={inp}>{Object.entries(CH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} placeholder="Name, like E — short" className={inp + " flex-1"} />
              </div>
              <textarea value={nw.body} rows={2} onChange={(e) => setNw({ ...nw, body: e.target.value })} placeholder="Hey {first}, it's {rep}..." className={inp} />
              <button type="button" onClick={add} className="inline-flex w-fit items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold"><Plus className="h-4 w-4" />Add</button>
            </div>
          </section>
        </>
      )}
      <AlertDialog open={!!ask} onOpenChange={(o) => { if (!o) setAsk(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ask?.kind === "delete" ? `Delete "${ask?.t.name}"?` : `Change the wording of "${ask?.t.name}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {ask?.kind === "delete" ? "This removes the template and all its numbers (sent, replies, outcomes, win rate). " : "This resets the template's numbers to zero, and the new wording starts fresh. "}
              The messages reps already sent stay counted in their daily totals and rep stats. Removed template numbers can't be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const a = ask; setAsk(null); if (a) (a.kind === "delete" ? doDelete(a.t) : doSave(a.t)); }}>{ask?.kind === "delete" ? "Delete" : "Change and reset"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
