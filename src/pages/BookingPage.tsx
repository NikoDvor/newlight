import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarSlotPicker } from "@/components/CalendarSlotPicker";
import { BookingWorkspaceProvisioner } from "@/components/BookingWorkspaceProvisioner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Loader2, Clock, MapPin, Video, Phone, Globe, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  // slug format: "workspace-slug" or could be a booking link slug
  const [client, setClient] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [calendar, setCalendar] = useState<any>(null);
  const [apptTypes, setApptTypes] = useState<any[]>([]);
  const [bookingLink, setBookingLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [company, setCompany] = useState("");
  const [bookedAppt, setBookedAppt] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      // Try to resolve as a booking link slug first
      const { data: link } = await supabase.from("calendar_booking_links")
        .select("*, calendars(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (link && link.calendars) {
        setBookingLink(link);
        const cal = link.calendars as any;
        setCalendar(cal);

        if (!link.is_public) {
          setError("This booking link is private.");
          setLoading(false);
          return;
        }
        if (!cal.is_active) {
          setError("This calendar is currently unavailable.");
          setLoading(false);
          return;
        }

        // Fetch client + branding + appointment types
        const [cRes, brRes, atRes] = await Promise.all([
          supabase.from("clients").select("*").eq("id", cal.client_id).single(),
          supabase.from("client_branding").select("*").eq("client_id", cal.client_id).maybeSingle(),
          supabase.from("calendar_appointment_types").select("*").eq("calendar_id", cal.id).eq("is_active", true).order("name"),
        ]);
        setClient(cRes.data);
        setBranding(brRes.data);
        setApptTypes(atRes.data || []);
        if (atRes.data?.length) setSelectedTypeId(atRes.data[0].id);
        setLoading(false);
        return;
      }

      // Fallback: try workspace slug (legacy /book/:workspace-slug)
      const { data: c } = await supabase.from("clients").select("*").eq("workspace_slug", slug).maybeSingle();
      if (!c) {
        setError("Booking page not found.");
        setLoading(false);
        return;
      }
      setClient(c);
      const [brRes, calRes] = await Promise.all([
        supabase.from("client_branding").select("*").eq("client_id", c.id).maybeSingle(),
        supabase.from("calendars").select("*").eq("client_id", c.id).eq("is_active", true).order("created_at").limit(1).maybeSingle(),
      ]);
      setBranding(brRes.data);
      if (calRes.data) {
        setCalendar(calRes.data);
        const { data: types } = await supabase.from("calendar_appointment_types")
          .select("*").eq("calendar_id", calRes.data.id).eq("is_active", true).order("name");
        setApptTypes(types || []);
        if (types?.length) setSelectedTypeId(types[0].id);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const selectedType = apptTypes.find(t => t.id === selectedTypeId);
  const duration = selectedType?.duration_minutes || 30;
  const bufferBefore = selectedType?.buffer_before || 0;
  const bufferAfter = selectedType?.buffer_after || 0;
  const primaryColor = branding?.primary_color || "hsl(211 96% 56%)";
  const companyName = branding?.company_name || branding?.display_name || client?.business_name || "";
  const calendarName = calendar?.calendar_name || "Book an Appointment";
  const confirmationMsg = selectedType?.confirmation_message || "";

  const locationLabel = (type: string) => {
    if (type === "virtual") return "Video Call";
    if (type === "in_person") return "In Person";
    if (type === "phone") return "Phone Call";
    return type;
  };

  const locationIcon = (type: string) => {
    if (type === "virtual") return <Video className="h-3.5 w-3.5" />;
    if (type === "in_person") return <MapPin className="h-3.5 w-3.5" />;
    if (type === "phone") return <Phone className="h-3.5 w-3.5" />;
    return <Globe className="h-3.5 w-3.5" />;
  };

  const handleBook = async () => {
    if (!client || !calendar || !date || !time || !name.trim() || !email.trim()) return;
    setSubmitting(true);

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      // 1. CRM: find or create contact
      const { data: existingContact } = await supabase.from("crm_contacts")
        .select("id, number_of_appointments")
        .eq("client_id", client.id)
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      let contactId = existingContact?.id;
      if (existingContact) {
        await supabase.from("crm_contacts").update({
          full_name: name.trim(),
          phone: phone || null,
          last_interaction_date: new Date().toISOString(),
          number_of_appointments: (existingContact.number_of_appointments || 0) + 1,
        } as any).eq("id", existingContact.id);
      } else {
        const { data: newContact } = await supabase.from("crm_contacts").insert({
          client_id: client.id,
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone || null,
          lead_source: "booking_page",
          pipeline_stage: "appointment_booked",
          first_contact_date: new Date().toISOString(),
          last_interaction_date: new Date().toISOString(),
          number_of_appointments: 1,
        } as any).select("id").single();
        contactId = newContact?.id;
      }

      // 2. CRM: find or create lead + deal (dedup guard)
      let leadAction = "skipped";
      let dealAction = "skipped";
      let dealId: string | null = null;

      if (contactId) {
        try {
          // Check for existing open deal for this contact
          const { data: existingDeal } = await supabase.from("crm_deals")
            .select("id, pipeline_stage")
            .eq("client_id", client.id)
            .eq("contact_id", contactId)
            .neq("pipeline_stage", "closed_won")
            .neq("pipeline_stage", "closed_lost")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingDeal) {
            // Reuse existing deal — update stage to appointment_booked if earlier
            dealId = existingDeal.id;
            const earlyStages = ["new_lead", "contacted", "qualified"];
            if (earlyStages.includes(existingDeal.pipeline_stage)) {
              await supabase.from("crm_deals").update({
                pipeline_stage: "appointment_booked",
              }).eq("id", existingDeal.id);
            }
            dealAction = "reused";
          } else {
            // Create new deal
            const dealName = `${name.trim()} — ${selectedType?.name || "Booking"}`;
            const { data: newDeal } = await supabase.from("crm_deals").insert({
              client_id: client.id,
              contact_id: contactId,
              deal_name: dealName,
              pipeline_stage: "appointment_booked",
              deal_value: 0,
              status: "open",
              lead_source: "booking_page",
              qualification_status: "unqualified",
            }).select("id").single();
            dealId = newDeal?.id || null;
            dealAction = "created";
          }

          // Check for existing lead for this contact
          const { data: existingLead } = await supabase.from("crm_leads")
            .select("id")
            .eq("client_id", client.id)
            .eq("contact_id", contactId)
            .limit(1)
            .maybeSingle();

          if (existingLead) {
            leadAction = "reused";
          } else {
            await supabase.from("crm_leads").insert({
              client_id: client.id,
              contact_id: contactId,
              source: "booking_page",
              lead_status: "new_lead",
              estimated_value: 0,
              notes: `Auto-created from booking: ${selectedType?.name || "Appointment"}`,
            });
            leadAction = "created";
          }
        } catch (crmErr) {
          console.warn("Lead/deal creation warning (non-blocking):", crmErr);
        }
      }

      // 3. Find assigned user (round-robin or owner)
      let assignedUserId = calendar.owner_user_id || null;
      if (calendar.calendar_type === "round_robin") {
        const { data: calUsers } = await supabase.from("calendar_users")
          .select("user_id").eq("calendar_id", calendar.id);
        if (calUsers && calUsers.length > 0) {
          // Simple round-robin: count recent appointments per user, assign to lowest
          const { data: recentAppts } = await supabase.from("appointments")
            .select("assigned_user_id").eq("calendar_id", calendar.id)
            .neq("status", "cancelled")
            .order("created_at", { ascending: false }).limit(100);
          const counts: Record<string, number> = {};
          calUsers.forEach(u => { counts[u.user_id] = 0; });
          (recentAppts || []).forEach(a => {
            if (a.assigned_user_id && counts[a.assigned_user_id] !== undefined) {
              counts[a.assigned_user_id]++;
            }
          });
          const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
          assignedUserId = sorted[0]?.[0] || assignedUserId;
        }
      }

      // 3. Create appointment
      const { data: appt, error: apptErr } = await supabase.from("appointments").insert({
        client_id: client.id,
        calendar_id: calendar.id,
        appointment_type_id: selectedTypeId || null,
        contact_id: contactId || null,
        assigned_user_id: assignedUserId,
        title: selectedType?.name || "Appointment",
        description: notes || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: calendar.timezone || "America/Los_Angeles",
        location: selectedType?.location_type || null,
        booking_source: "booking_page",
        status: "scheduled",
        customer_notes: notes || null,
      }).select().single();

      if (apptErr) throw apptErr;

      // 5. Activity + audit (includes lead/deal tracking)
      await Promise.all([
        supabase.from("crm_activities").insert({
          client_id: client.id,
          activity_type: "appointment_booked",
          activity_note: `Online booking by ${name} (${email}) — ${selectedType?.name || "Appointment"}`,
          contact_id: contactId || null,
        }),
        dealAction !== "skipped" && supabase.from("crm_activities").insert({
          client_id: client.id,
          activity_type: dealAction === "created" ? "deal_created" : "deal_updated",
          activity_note: `Deal ${dealAction} from booking — ${selectedType?.name || "Appointment"}`,
          contact_id: contactId || null,
        }),
        leadAction !== "skipped" && supabase.from("crm_activities").insert({
          client_id: client.id,
          activity_type: leadAction === "created" ? "lead_created" : "lead_exists",
          activity_note: `Lead ${leadAction} from booking — ${name} (${email})`,
          contact_id: contactId || null,
        }),
        supabase.from("audit_logs").insert({
          client_id: client.id,
          action: "booking_created",
          module: "calendar",
          metadata: {
            appointment_id: appt?.id,
            calendar_id: calendar.id,
            contact_name: name,
            contact_email: email,
            appointment_type: selectedType?.name,
            booking_source: "booking_page",
            lead_action: leadAction,
            deal_action: dealAction,
            deal_id: dealId,
          },
        }),
      ].filter(Boolean));

      // 5. Schedule reminders
      const { data: reminderRules } = await supabase.from("calendar_reminder_rules")
        .select("*").eq("calendar_id", calendar.id).eq("is_active", true);
      if (reminderRules?.length && appt) {
        // Create notification entries for each reminder rule
        for (const rule of reminderRules) {
          try {
            await supabase.from("notifications" as any).insert({
              client_id: client.id,
              type: `reminder_${rule.reminder_type}`,
              title: `Reminder: ${selectedType?.name || "Appointment"} with ${name}`,
              message: `${rule.reminder_type} reminder via ${rule.channel} — ${rule.offset_minutes} minutes`,
              module: "calendar",
              related_id: appt.id,
              status: "pending",
            });
          } catch { /* notifications table may not exist yet */ }
        }
      }

      setBookedAppt(appt);
      setBooked(true);
    } catch (err: any) {
      console.error("Booking error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Error states ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-card border border-border">
          <div className="h-14 w-14 rounded-full mx-auto flex items-center justify-center bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{error}</h2>
          <p className="text-sm text-muted-foreground">Please check the link and try again, or contact the business directly.</p>
        </div>
      </div>
    );
  }

  if (!client || !calendar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-card border border-border">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold text-foreground">No Calendar Available</h2>
          <p className="text-sm text-muted-foreground">This workspace doesn't have an active booking calendar yet.</p>
        </div>
      </div>
    );
  }

  // ── Confirmation ──
  if (booked) {
    const apptStart = bookedAppt ? new Date(bookedAppt.start_time) : new Date(`${date}T${time}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl bg-card border border-border">
          {branding?.logo_url && <img src={branding.logo_url} alt="" className="h-10 mx-auto object-contain" />}
          <div className="h-16 w-16 rounded-full mx-auto flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
            <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-xl font-bold text-foreground">Booking Confirmed!</h2>
          <div className="text-left space-y-2 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{apptStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{apptStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {duration} min</span>
            </div>
            {selectedType && (
              <div className="flex items-center gap-2 text-sm">
                {locationIcon(selectedType.location_type)}
                <span>{selectedType.name} — {locationLabel(selectedType.location_type)}</span>
              </div>
            )}
          </div>
          {confirmationMsg && <p className="text-sm text-muted-foreground">{confirmationMsg}</p>}
          <p className="text-xs text-muted-foreground">A confirmation will be sent to <strong>{email}</strong>.</p>

          {/* Auto-provision workspace for the booker */}
          {bookedAppt && client && (
            <BookingWorkspaceProvisioner
              appointmentId={bookedAppt.id}
              contactName={name}
              contactEmail={email}
              contactPhone={phone}
              companyName={company || undefined}
              logoUrl={branding?.logo_url || undefined}
              primaryColor={branding?.primary_color || primaryColor}
              secondaryColor={branding?.secondary_color || undefined}
              industry={client.industry || undefined}
              location={client.primary_location || undefined}
              clientId={client.id}
            />
          )}
        </motion.div>
      </div>
    );
  }

  // ── Booking Page ──
  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8 sm:pt-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Branded Header */}
        <div className="text-center space-y-2">
          {branding?.logo_url && (
            <img src={branding.logo_url} alt="" className="h-10 mx-auto object-contain" />
          )}
          <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
          <p className="text-sm text-muted-foreground">{calendarName}</p>
          {calendar.description && <p className="text-xs text-muted-foreground">{calendar.description}</p>}
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
          {/* Appointment Type Selection */}
          {apptTypes.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No appointment types available for this calendar.</p>
            </div>
          ) : (
            <>
              {apptTypes.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Select Appointment Type</Label>
                  <div className="space-y-2">
                    {apptTypes.map(t => (
                      <button key={t.id} onClick={() => { setSelectedTypeId(t.id); setDate(""); setTime(""); }}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedTypeId === t.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30 hover:bg-secondary/30"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{t.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px]">{t.duration_minutes} min</Badge>
                            {locationIcon(t.location_type)}
                          </div>
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {apptTypes.length === 1 && selectedType && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedType.name}</p>
                    {selectedType.description && <p className="text-xs text-muted-foreground mt-0.5">{selectedType.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{duration} min</Badge>
                    {locationIcon(selectedType.location_type)}
                  </div>
                </div>
              )}

              {/* Time Slot Picker */}
              {selectedTypeId && (
                <CalendarSlotPicker
                  calendarId={calendar.id}
                  clientId={client.id}
                  duration={duration}
                  bufferBefore={bufferBefore}
                  bufferAfter={bufferAfter}
                  selectedDate={date}
                  selectedTime={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                />
              )}

              {/* Booking Form */}
              {date && time && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-foreground">Your Details</p>
                  <div>
                    <Label className="text-xs">Full Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Company (optional)</Label>
                    <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything we should know?" className="bg-background border-border min-h-[60px]" />
                  </div>
                  <Button onClick={handleBook} disabled={submitting || !name.trim() || !email.trim()} className="w-full" style={{ background: primaryColor }}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
                    Confirm Booking
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground">
          Powered by {companyName || "NewLight Marketing"}
        </p>
      </div>
    </div>
  );
}
