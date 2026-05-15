import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Check, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Cal { id: string; name: string; booking_slug: string; availability: any; timezone: string; booking_title: string | null; booking_description: string | null; booking_active: boolean; }

function buildSlots(availability: any) {
  const slots: { date: Date; label: string }[] = [];
  const now = new Date();
  const days = ["sun","mon","tue","wed","thu","fri","sat"];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const key = days[d.getDay()];
    const cfg = availability?.[key];
    if (!cfg?.enabled) continue;
    const [sh, sm] = String(cfg.start || "09:00").split(":").map(Number);
    const [eh, em] = String(cfg.end || "17:00").split(":").map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);
    for (let m = startMin; m + 30 <= endMin; m += 30) {
      const s = new Date(d); s.setHours(Math.floor(m/60), m%60, 0, 0);
      slots.push({ date: s, label: s.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
    }
  }
  return slots;
}

export default function BDRBookingPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [cal, setCal] = useState<Cal | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customer_name: "", business_name: "", phone: "", email: "", notes: "" });
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  useEffect(() => { (async () => {
    if (!slug) return;
    const { data } = await (supabase as any)
      .from("bdr_calendars")
      .select("id, name, booking_slug, availability, timezone, booking_title, booking_description, booking_active")
      .eq("booking_slug", slug)
      .maybeSingle();
    setCal(data);
    setLoading(false);
  })(); }, [slug]);

  const slots = cal ? buildSlots(cal.availability) : [];

  const submit = async () => {
    if (!form.customer_name || !selectedSlot) return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("bdr-book", {
      body: { booking_slug: slug, ...form, starts_at: selectedSlot, duration_minutes: 30 },
    });
    setSubmitting(false);
    if (error) { alert("Couldn't book: " + error.message); return; }
    setDone(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[hsl(215,35%,8%)]"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  if (!cal) return <div className="min-h-screen flex items-center justify-center bg-[hsl(215,35%,8%)] text-white/60">Booking link not found.</div>;
  if (!cal.booking_active) return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(215,35%,8%)] p-4">
      <div className="max-w-md w-full text-center space-y-3 p-8 rounded-xl border border-white/10 bg-white/[0.03]">
        <h1 className="text-xl font-bold text-white">Bookings paused</h1>
        <p className="text-sm text-white/60">This booking link isn't accepting new appointments right now. Please check back soon.</p>
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(215,35%,8%)] p-4">
        <div className="max-w-md w-full text-center space-y-3 p-8 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="mx-auto h-12 w-12 rounded-full bg-[hsl(142,72%,42%)]/20 flex items-center justify-center">
            <Check className="h-6 w-6 text-[hsl(142,72%,42%)]" />
          </div>
          <h1 className="text-xl font-bold text-white">You're booked!</h1>
          <p className="text-sm text-white/60">We've added your appointment. Expect a call shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(215,35%,8%)] py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="text-center">
          <CalIcon className="h-8 w-8 text-[hsl(211,96%,68%)] mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">{cal.booking_title || cal.name}</h1>
          <p className="text-sm text-white/55 whitespace-pre-wrap">{cal.booking_description || "Pick a time and we'll be in touch."}</p>
        </div>
        <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Your name *"><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
            <Field label="Business"><Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
          </div>
          <Field label="Notes (optional)">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
          </Field>
          <Field label="Preferred time *">
            <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white">
              <option value="" className="bg-[hsl(215,35%,12%)]">— Select —</option>
              {slots.map(s => (
                <option key={s.date.toISOString()} value={s.date.toISOString()} className="bg-[hsl(215,35%,12%)]">{s.label}</option>
              ))}
            </select>
          </Field>
          <Button onClick={submit} disabled={submitting || !form.customer_name || !selectedSlot}
            className="w-full bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book appointment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-white/60">{label}</Label>{children}</div>;
}
