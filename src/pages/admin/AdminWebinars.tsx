import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, Copy, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ADMIN_OPS_CLIENT_ID } from "@/contexts/AdminOpsContext";

type WebEvent = {
  id: string;
  client_id: string;
  title: string;
  topic: string | null;
  host_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  join_url: string | null;
  registration_slug: string;
  status: string;
  description: string | null;
  recurrence_rrule: string | null;
};

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  attended: boolean;
  reminder_24h_sent_at: string | null;
  reminder_1h_sent_at: string | null;
  followup_sent_at: string | null;
  registered_at: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export default function AdminWebinars() {
  const { activeClientId } = useWorkspace();
  const clientId = activeClientId || ADMIN_OPS_CLIENT_ID;
  const [events, setEvents] = useState<WebEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, { registered: number; attended: number }>>({});
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [detail, setDetail] = useState<WebEvent | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);

  // form
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [host, setHost] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [joinUrl, setJoinUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [recurrence, setRecurrence] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("webinar_events" as any)
      .select("*").order("scheduled_at", { ascending: false });
    const ev = (data || []) as any as WebEvent[];
    setEvents(ev);
    if (ev.length) {
      const { data: regRows } = await supabase.from("webinar_registrations" as any)
        .select("webinar_event_id, attended")
        .in("webinar_event_id", ev.map(e => e.id));
      const map: Record<string, { registered: number; attended: number }> = {};
      for (const r of (regRows || []) as any[]) {
        map[r.webinar_event_id] ||= { registered: 0, attended: 0 };
        map[r.webinar_event_id].registered++;
        if (r.attended) map[r.webinar_event_id].attended++;
      }
      setCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadRegs = async (eventId: string) => {
    const { data } = await supabase.from("webinar_registrations" as any)
      .select("*").eq("webinar_event_id", eventId).order("registered_at", { ascending: false });
    setRegs((data || []) as any);
  };

  const openDetail = async (e: WebEvent) => { setDetail(e); await loadRegs(e.id); };

  const createEvent = async () => {
    if (!title || !scheduledAt || !slug) {
      toast.error("Title, date/time, and slug are required");
      return;
    }
    const { error } = await supabase.from("webinar_events" as any).insert({
      client_id: clientId,
      title, topic: topic || null, host_name: host || null, description: description || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      join_url: joinUrl || null,
      registration_slug: slug,
      status: "scheduled",
      recurrence_rrule: recurrence || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Webinar created");
    setOpenNew(false);
    setTitle(""); setTopic(""); setHost(""); setDescription(""); setScheduledAt("");
    setDuration(60); setJoinUrl(""); setSlug(""); setRecurrence("");
    load();
  };

  const toggleAttended = async (reg: Registration) => {
    const { error } = await supabase.from("webinar_registrations" as any)
      .update({ attended: !reg.attended } as any).eq("id", reg.id);
    if (error) { toast.error(error.message); return; }
    setRegs(prev => prev.map(r => r.id === reg.id ? { ...r, attended: !r.attended } : r));
    if (detail) {
      setCounts(prev => ({
        ...prev,
        [detail.id]: {
          registered: prev[detail.id]?.registered ?? regs.length,
          attended: (prev[detail.id]?.attended ?? 0) + (reg.attended ? -1 : 1),
        },
      }));
    }
  };

  const copyPublicUrl = (s: string) => {
    const url = `${window.location.origin}/webinar/${s}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Webinars</h1>
          <p className="text-sm text-white/50">Advisor webinars & seminars with automated reminders and follow-up.</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-2">
          <Plus className="h-4 w-4" /> New Webinar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
      ) : events.length === 0 ? (
        <div className="text-sm text-white/40 text-center py-12">No webinars yet. Create your first one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map(e => {
            const c = counts[e.id] || { registered: 0, attended: 0 };
            const when = new Date(e.scheduled_at);
            return (
              <button key={e.id} onClick={() => openDetail(e)}
                className="text-left p-4 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    e.status === 'scheduled' ? 'bg-[hsla(211,96%,60%,.1)] text-[hsl(var(--nl-sky))]' :
                    e.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    e.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                    'bg-white/10 text-white/40'
                  }`}>{e.status}</span>
                  <span className="text-[10px] text-white/40 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {c.registered}
                    {c.attended > 0 && <span className="text-emerald-400">· {c.attended} attended</span>}
                  </span>
                </div>
                <h3 className="font-medium text-white">{e.title}</h3>
                {e.topic && <p className="text-[11px] text-white/50">{e.topic}</p>}
                <div className="flex items-center gap-1 text-[11px] text-white/50">
                  <Calendar className="h-3 w-3" />
                  {when.toLocaleDateString()} · {when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
                <button
                  onClick={(ev) => { ev.stopPropagation(); copyPublicUrl(e.registration_slug); }}
                  className="text-[10px] text-white/40 hover:text-white/70 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> /webinar/{e.registration_slug}
                </button>
              </button>
            );
          })}
        </div>
      )}

      {/* New dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="bg-[hsl(var(--nl-deep))] text-white border-white/10 max-w-lg">
          <DialogHeader><DialogTitle>New Webinar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={e => { setTitle(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                className="bg-white/[0.04] border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Topic</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Social Security Timing"
                  className="bg-white/[0.04] border-white/10" />
              </div>
              <div>
                <Label className="text-xs">Host</Label>
                <Input value={host} onChange={e => setHost(e.target.value)}
                  className="bg-white/[0.04] border-white/10" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)}
                className="bg-white/[0.04] border-white/10" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Scheduled at</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="bg-white/[0.04] border-white/10" />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)}
                  className="bg-white/[0.04] border-white/10" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Join URL (Zoom / Teams / etc.)</Label>
              <Input value={joinUrl} onChange={e => setJoinUrl(e.target.value)}
                className="bg-white/[0.04] border-white/10" />
            </div>
            <div>
              <Label className="text-xs">Registration slug (public URL)</Label>
              <Input value={slug} onChange={e => setSlug(slugify(e.target.value))}
                className="bg-white/[0.04] border-white/10 font-mono text-xs" />
              <p className="text-[10px] text-white/40 mt-1">/webinar/{slug || "your-slug"}</p>
            </div>
            <div>
              <Label className="text-xs">Recurrence RRULE (optional)</Label>
              <Input value={recurrence} onChange={e => setRecurrence(e.target.value)}
                placeholder="FREQ=WEEKLY;BYDAY=TU"
                className="bg-white/[0.04] border-white/10 font-mono text-xs" />
            </div>
            <Button onClick={createEvent} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={o => { if (!o) setDetail(null); }}>
        <SheetContent className="bg-[hsl(var(--nl-deep))] text-white border-white/10 w-full sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{detail.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="text-xs text-white/60 space-y-1">
                  <div>Topic: {detail.topic || "—"}</div>
                  <div>Host: {detail.host_name || "—"}</div>
                  <div>When: {new Date(detail.scheduled_at).toLocaleString()}</div>
                  <div>Duration: {detail.duration_minutes} min</div>
                  <div>Status: {detail.status}</div>
                  {detail.recurrence_rrule && <div className="font-mono">RRULE: {detail.recurrence_rrule}</div>}
                  <button onClick={() => copyPublicUrl(detail.registration_slug)}
                    className="text-[hsl(var(--nl-sky))] hover:underline text-[11px] flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copy public link
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Registrants ({regs.length})</h3>
                  {regs.length === 0 ? (
                    <p className="text-xs text-white/40">No registrations yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {regs.map(r => (
                        <div key={r.id} className="p-2 rounded bg-white/[0.03] border border-white/10 text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white">{r.full_name}</div>
                              <div className="text-white/50">{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                            </div>
                            <label className="flex items-center gap-2 text-[10px] text-white/60">
                              Attended
                              <Switch checked={r.attended} onCheckedChange={() => toggleAttended(r)} />
                            </label>
                          </div>
                          <div className="flex gap-2 mt-1 text-[10px] text-white/40 flex-wrap">
                            <span className={r.reminder_24h_sent_at ? "text-emerald-400" : ""}>24h: {r.reminder_24h_sent_at ? "sent" : "pending"}</span>
                            <span className={r.reminder_1h_sent_at ? "text-emerald-400" : ""}>1h: {r.reminder_1h_sent_at ? "sent" : "pending"}</span>
                            <span className={r.followup_sent_at ? "text-emerald-400" : ""}>Follow-up: {r.followup_sent_at ? "sent" : "pending"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
