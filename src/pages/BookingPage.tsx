import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [client, setClient] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  const [selectedType, setSelectedType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data: c } = await supabase.from("clients").select("*").eq("workspace_slug", slug).maybeSingle();
      if (!c) { setLoading(false); return; }
      setClient(c);
      const [br, et] = await Promise.all([
        supabase.from("client_branding").select("*").eq("client_id", c.id).maybeSingle(),
        supabase.from("event_types").select("*").eq("client_id", c.id).eq("active", true).order("name"),
      ]);
      setBranding(br.data);
      setEventTypes(et.data || []);
      if (et.data?.length) setSelectedType(et.data[0].id);
      setLoading(false);
    };
    load();
  }, [slug]);

  const currentEventType = eventTypes.find(e => e.id === selectedType);
  const duration = currentEventType?.duration_minutes || 30;
  const primaryColor = branding?.primary_color || "#3B82F6";

  const handleBook = async () => {
    if (!client || !date || !time || !name || !email) return;
    setSubmitting(true);
    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create or find CRM contact
    const { data: existingContact } = await supabase.from("crm_contacts")
      .select("id").eq("client_id", client.id).eq("email", email).maybeSingle();
    let contactId = existingContact?.id;
    if (!contactId) {
      const { data: newContact } = await supabase.from("crm_contacts").insert({
        client_id: client.id, full_name: name, email, phone: phone || null, lead_source: "booking_page",
      }).select("id").single();
      contactId = newContact?.id;
    }

    await supabase.from("calendar_events").insert({
      client_id: client.id, title: currentEventType?.name || "Appointment",
      contact_name: name, contact_email: email, contact_phone: phone || null,
      start_time: startTime.toISOString(), end_time: endTime.toISOString(),
      calendar_status: "scheduled", booking_source: "booking_page",
      event_type_id: selectedType || null, contact_id: contactId || null,
      notes: notes || null,
    } as any);

    await supabase.from("crm_activities").insert({
      client_id: client.id, activity_type: "appointment_booked",
      activity_note: `Online booking by ${name} (${email})`,
    });

    setBooked(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Booking page not found.</p>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-card border border-border">
          <div className="h-16 w-16 rounded-full mx-auto flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
            <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-xl font-bold text-foreground">Booking Confirmed!</h2>
          <p className="text-sm text-muted-foreground">
            Your appointment has been scheduled for {new Date(`${date}T${time}`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {time}.
          </p>
          <p className="text-xs text-muted-foreground">A confirmation will be sent to {email}.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {branding?.logo_url && (
            <img src={branding.logo_url} alt="" className="h-10 mx-auto object-contain" />
          )}
          <h1 className="text-xl font-bold text-foreground">{branding?.company_name || client.business_name}</h1>
          <p className="text-sm text-muted-foreground">Book an appointment</p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          {/* Event Type */}
          {eventTypes.length > 1 && (
            <div>
              <Label>Appointment Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(et => (
                    <SelectItem key={et.id} value={et.id}>{et.name} ({et.duration_minutes} min)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Slot Picker */}
          <TimeSlotPicker
            clientId={client.id}
            duration={duration}
            selectedDate={date}
            selectedTime={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />

          {/* Contact Info */}
          {date && time && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t border-border">
              <div>
                <Label>Full Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-background border-border" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="bg-background border-border" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className="bg-background border-border" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything we should know?" className="bg-background border-border min-h-[60px]" />
              </div>
              <Button onClick={handleBook} disabled={submitting || !name || !email} className="w-full" style={{ background: primaryColor }}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
                Confirm Booking
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
