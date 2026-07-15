import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, Loader2, Clock, User, Video } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";

const regSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

type WebinarEvent = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  host_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
};

export default function WebinarRegistration() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<WebinarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from("webinar_events" as any)
        .select("id, client_id, title, description, topic, host_name, scheduled_at, duration_minutes, status")
        .eq("registration_slug", slug)
        .maybeSingle();
      if (error || !data) {
        setError("Webinar not found.");
      } else if ((data as any).status === "cancelled") {
        setError("This webinar has been cancelled.");
      } else {
        setEvent(data as any);
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    const parsed = regSchema.safeParse({ full_name: fullName, email, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("webinar_registrations" as any)
      .insert({
        webinar_event_id: event.id,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
      } as any)
      .select("id")
      .maybeSingle();
    if (error) {
      if ((error as any).code === "23505") {
        toast.error("You're already registered with that email.");
      } else {
        toast.error(error.message);
      }
      setSubmitting(false);
      return;
    }
    // Fire automation event (best-effort)
    await supabase.from("automation_events" as any).insert({
      client_id: event.client_id,
      event_type: "webinar_registration_created",
      event_key: "webinar_registration_created",
      event_name: "Webinar Registration Created",
      related_type: "webinar_registration",
      related_id: (data as any)?.id,
      event_data: { webinar_event_id: event.id, email: parsed.data.email } as any,
    } as any);
    setRegistered(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--nl-deep))]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--nl-deep))] p-6">
        <div className="text-white/60 text-sm">{error || "Not found."}</div>
      </div>
    );
  }

  const when = new Date(event.scheduled_at);
  const endsAt = new Date(when.getTime() + event.duration_minutes * 60000);
  const dateStr = when.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeStr = `${when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${endsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div className="min-h-screen bg-[hsl(var(--nl-deep))] text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6"
      >
        {!registered ? (
          <>
            <div className="space-y-2">
              {event.topic && (
                <span className="inline-block text-[10px] uppercase tracking-wider text-[hsl(var(--nl-sky))] bg-[hsla(211,96%,60%,.1)] px-2 py-0.5 rounded-full">
                  {event.topic}
                </span>
              )}
              <h1 className="text-2xl font-semibold">{event.title}</h1>
              {event.description && <p className="text-sm text-white/60">{event.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/70">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-white/40" /> {dateStr}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-white/40" /> {timeStr}</div>
              {event.host_name && (
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-white/40" /> {event.host_name}</div>
              )}
              <div className="flex items-center gap-2"><Video className="h-4 w-4 text-white/40" /> Online</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-white/10">
              <div>
                <Label className="text-xs text-white/60">Full name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} required
                  className="bg-white/[0.04] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-white/60">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-white/[0.04] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-white/60">Phone (optional)</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)}
                  className="bg-white/[0.04] border-white/10 text-white" />
              </div>
              <Button type="submit" disabled={submitting}
                className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold">You're registered</h2>
              <p className="text-sm text-white/60 mt-1">
                See you on <span className="text-white">{dateStr}</span> at {timeStr}.
              </p>
              <p className="text-xs text-white/40 mt-3">
                We'll email you a reminder 24 hours and 1 hour before the webinar begins.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
