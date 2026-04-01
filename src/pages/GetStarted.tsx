import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { provisionWorkspaceDefaults } from "@/lib/workspaceProvisioner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CalendarSlotPicker } from "@/components/CalendarSlotPicker";
import {
  Building2, User, Globe, MapPin, Phone, Mail,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2,
  Sparkles, Calendar, AlertCircle
} from "lucide-react";
import { WorkspaceHandoff } from "@/components/WorkspaceHandoff";

const BUSINESS_TYPES = [
  "Agency", "Dental", "Med Spa", "Salon", "Legal", "HVAC",
  "Real Estate", "Fitness", "Restaurant", "Automotive",
  "Construction", "Consulting", "Healthcare", "E-commerce",
  "Window Washing", "Landscaping", "Plumbing", "Roofing",
  "Cleaning Service", "Other",
];

// Admin/NewLight master calendar config — first active admin calendar is used
const ADMIN_CLIENT_SLUG = "newlight-marketing";
const DEFAULT_PUBLIC_BOOKING_SLUGS = ["newlight-intro-call", "intro-call"];
const DEFAULT_PUBLIC_CALENDAR_NAME = "Intro Call";
const DEFAULT_TIMEZONE = "America/Los_Angeles";

type FormStep = "info" | "booking";
type PageState = "form" | "submitting" | "success" | "error";

interface CalendarRow {
  id: string;
  client_id: string;
  calendar_name: string;
  timezone: string | null;
  is_active: boolean;
  status: string;
}

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone?: string | null;
}

interface BlackoutRow {
  start_datetime: string;
  end_datetime: string;
}

interface CalendarDebugState {
  resolvedClientSlug: string;
  matchedClientId: string | null;
  matchedCalendarId: string | null;
  activeCalendarCount: number;
  availabilityRowCount: number;
  timezone: string;
  firstAvailableDate: string | null;
  bookingLinkSlug: string | null;
  lookupSource: string | null;
  failureReason: string | null;
}

const createInitialCalendarDebug = (): CalendarDebugState => ({
  resolvedClientSlug: ADMIN_CLIENT_SLUG,
  matchedClientId: null,
  matchedCalendarId: null,
  activeCalendarCount: 0,
  availabilityRowCount: 0,
  timezone: DEFAULT_TIMEZONE,
  firstAvailableDate: null,
  bookingLinkSlug: null,
  lookupSource: null,
  failureReason: null,
});

function getFirstAvailableDate(availabilityRows: AvailabilityRow[], blackoutRows: BlackoutRow[]) {
  if (!availabilityRows.length) return null;

  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + i);
    const dateValue = candidate.toISOString().split("T")[0];
    const dayOfWeek = candidate.getDay();
    const hasAvailability = availabilityRows.some((row) => row.day_of_week === dayOfWeek);

    if (!hasAvailability) continue;

    const midday = new Date(`${dateValue}T12:00:00`);
    const isBlackedOut = blackoutRows.some((row) => {
      const start = new Date(row.start_datetime);
      const end = new Date(row.end_datetime);
      return midday >= start && midday <= end;
    });

    if (!isBlackedOut) {
      return dateValue;
    }
  }

  return null;
}

export default function GetStarted() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");

  // Calendar booking state
  const [adminCalendar, setAdminCalendar] = useState<any>(null);
  const [adminClientId, setAdminClientId] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDebug, setCalendarDebug] = useState<CalendarDebugState>(() => createInitialCalendarDebug());
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [step, setStep] = useState<FormStep>("info");
  const [pageState, setPageState] = useState<PageState>("form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const canProceed = businessName.trim() && contactName.trim() && email.trim() && phone.trim();
  const canBook = selectedDate && selectedTime;
  const progress = step === "info" ? 50 : 100;

  // Load admin calendar when moving to booking step
  useEffect(() => {
    if (step !== "booking" || adminCalendar) return;
    setCalendarLoading(true);

    const loadCalendar = async () => {
      const nextDebug = createInitialCalendarDebug();

      try {
        let resolvedCalendar: CalendarRow | null = null;
        let resolvedClientId: string | null = null;

        const [adminClientRes, publicBookingLinkRes, globalActiveCalendarCountRes] = await Promise.all([
          supabase
            .from("clients")
            .select("id, workspace_slug, timezone")
            .eq("workspace_slug", ADMIN_CLIENT_SLUG)
            .maybeSingle(),
          supabase
            .from("calendar_booking_links")
            .select("calendar_id, client_id, slug")
            .eq("is_active", true)
            .eq("is_public", true)
            .in("slug", DEFAULT_PUBLIC_BOOKING_SLUGS)
            .order("created_at")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("calendars")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
        ]);

        nextDebug.activeCalendarCount = globalActiveCalendarCountRes.count ?? 0;

        if (adminClientRes.error) {
          nextDebug.failureReason = `client_lookup_error: ${adminClientRes.error.message}`;
        }

        if (adminClientRes.data) {
          resolvedClientId = adminClientRes.data.id;
          nextDebug.matchedClientId = adminClientRes.data.id;
          nextDebug.timezone = adminClientRes.data.timezone || DEFAULT_TIMEZONE;

          const [clientCalendarCountRes, clientCalendarRes] = await Promise.all([
            supabase
              .from("calendars")
              .select("id", { count: "exact", head: true })
              .eq("client_id", adminClientRes.data.id)
              .eq("is_active", true),
            supabase
              .from("calendars")
              .select("id, client_id, calendar_name, timezone, is_active, status")
              .eq("client_id", adminClientRes.data.id)
              .eq("is_active", true)
              .order("created_at")
              .limit(1)
              .maybeSingle(),
          ]);

          nextDebug.activeCalendarCount = clientCalendarCountRes.count ?? nextDebug.activeCalendarCount;

          if (clientCalendarRes.error) {
            nextDebug.failureReason = `client_calendar_lookup_error: ${clientCalendarRes.error.message}`;
          }

          if (clientCalendarRes.data) {
            resolvedCalendar = clientCalendarRes.data as CalendarRow;
            nextDebug.lookupSource = "client_slug";
          }
        }

        if (!resolvedCalendar && publicBookingLinkRes.data) {
          nextDebug.bookingLinkSlug = publicBookingLinkRes.data.slug;
          resolvedClientId = publicBookingLinkRes.data.client_id;
          nextDebug.matchedClientId = publicBookingLinkRes.data.client_id;

          const linkedCalendarRes = await supabase
            .from("calendars")
            .select("id, client_id, calendar_name, timezone, is_active, status")
            .eq("id", publicBookingLinkRes.data.calendar_id)
            .eq("is_active", true)
            .maybeSingle();

          if (linkedCalendarRes.error) {
            nextDebug.failureReason = `public_link_calendar_lookup_error: ${linkedCalendarRes.error.message}`;
          }

          if (linkedCalendarRes.data) {
            resolvedCalendar = linkedCalendarRes.data as CalendarRow;
            nextDebug.lookupSource = "public_booking_link";
          }
        }

        if (!resolvedCalendar) {
          const introCalendarRes = await supabase
            .from("calendars")
            .select("id, client_id, calendar_name, timezone, is_active, status")
            .eq("is_active", true)
            .eq("calendar_name", DEFAULT_PUBLIC_CALENDAR_NAME)
            .order("created_at")
            .limit(1)
            .maybeSingle();

          if (introCalendarRes.error) {
            nextDebug.failureReason = `intro_calendar_lookup_error: ${introCalendarRes.error.message}`;
          }

          if (introCalendarRes.data) {
            resolvedCalendar = introCalendarRes.data as CalendarRow;
            resolvedClientId = introCalendarRes.data.client_id;
            nextDebug.matchedClientId = introCalendarRes.data.client_id;
            nextDebug.lookupSource = "calendar_name_fallback";
          }
        }

        if (!resolvedCalendar) {
          const anyCalendarRes = await supabase
            .from("calendars")
            .select("id, client_id, calendar_name, timezone, is_active, status")
            .eq("is_active", true)
            .order("created_at")
            .limit(1)
            .maybeSingle();

          if (anyCalendarRes.error) {
            nextDebug.failureReason = `active_calendar_fallback_error: ${anyCalendarRes.error.message}`;
          }

          if (anyCalendarRes.data) {
            resolvedCalendar = anyCalendarRes.data as CalendarRow;
            resolvedClientId = anyCalendarRes.data.client_id;
            nextDebug.matchedClientId = anyCalendarRes.data.client_id;
            nextDebug.lookupSource = "any_active_calendar_fallback";
          }
        }

        if (!resolvedCalendar) {
          setAdminCalendar(null);
          setAdminClientId(null);
          setCalendarDebug({
            ...nextDebug,
            failureReason: nextDebug.failureReason || "no_matching_calendar_or_public_booking_link",
          });
          return;
        }

        nextDebug.matchedCalendarId = resolvedCalendar.id;
        nextDebug.timezone = resolvedCalendar.timezone || nextDebug.timezone || DEFAULT_TIMEZONE;

        const [availabilityRes, blackoutRes] = await Promise.all([
          supabase
            .from("calendar_availability")
            .select("day_of_week, start_time, end_time, timezone")
            .eq("calendar_id", resolvedCalendar.id)
            .eq("is_active", true),
          supabase
            .from("calendar_blackout_dates")
            .select("start_datetime, end_datetime")
            .eq("calendar_id", resolvedCalendar.id),
        ]);

        if (availabilityRes.error) {
          nextDebug.failureReason = `availability_lookup_error: ${availabilityRes.error.message}`;
        }

        nextDebug.availabilityRowCount = availabilityRes.data?.length ?? 0;
        nextDebug.firstAvailableDate = getFirstAvailableDate(
          (availabilityRes.data ?? []) as AvailabilityRow[],
          (blackoutRes.data ?? []) as BlackoutRow[]
        );

        if (!availabilityRes.data?.length) {
          nextDebug.failureReason = nextDebug.failureReason || "calendar_has_no_active_availability";
        }

        setAdminCalendar(resolvedCalendar);
        setAdminClientId(resolvedClientId);
        setCalendarDebug(nextDebug);
      } catch (loadError: any) {
        setAdminCalendar(null);
        setAdminClientId(null);
        setCalendarDebug({
          ...nextDebug,
          failureReason: loadError?.message || "calendar_load_failed",
        });
      } finally {
        setCalendarLoading(false);
      }
    };

    loadCalendar();
  }, [step, adminCalendar]);

  const handleSubmit = async () => {
    if (!canProceed || !canBook || !adminCalendar || !adminClientId) return;
    setPageState("submitting");
    setError("");

    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const endTime = new Date(startTime.getTime() + 30 * 60000);

      const { data, error: fnError } = await supabase.functions.invoke(
        "provision-from-booking",
        {
          body: {
            business_name: businessName,
            contact_name: contactName,
            contact_email: email,
            contact_phone: phone || null,
            company_name: businessName,
            logo_url: null,
            primary_color: "#3B82F6",
            secondary_color: "#06B6D4",
            industry: businessType || null,
            location: location || null,
            website: website || null,
            timezone: "America/Los_Angeles",
            appointment_id: null,
            calendar_client_id: adminClientId,
            calendar_id: adminCalendar.id,
            appointment_start: startTime.toISOString(),
            appointment_end: endTime.toISOString(),
            appointment_title: `Intro Call — ${businessName}`,
            appointment_description: `First meeting with ${contactName} from ${businessName}. Business type: ${businessType || "Not specified"}.`,
            appointment_timezone: "America/Los_Angeles",
            booking_source: "get_started_form",
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.appointment_id) throw new Error("Booking completed without a persisted appointment record");

      if (data?.client_id && !data?.already_exists) {
        try {
          await provisionWorkspaceDefaults(data.client_id, {
            industry: businessType || null,
            timezone: "America/Los_Angeles",
            skipIfExists: true,
            ownerEmail: email,
            ownerName: contactName,
          });
        } catch (provErr) {
          console.warn("Provisioning partial:", provErr);
        }
      }

      setResult({
        ...data,
        invite_warning: data?.invite_error || null,
        invite_status: data?.invite_sent
          ? "invite_sent"
          : data?.invite_error
          ? "invite_failed"
          : data?.existing_user
          ? "access_link_generated"
          : "invite_attempted",
      });
      setPageState("success");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setPageState("error");
    }
  };

  // ─── Submitting ──────────────────────────────────────────
  if (pageState === "submitting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Booking your meeting…</h2>
          <p className="text-sm text-muted-foreground">
            Setting up your personalized workspace and confirming your intro call.
          </p>
          <div className="mt-6 space-y-2">
            {["Booking meeting", "Creating workspace", "Setting up your dashboard"].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.8 }}
                className="flex items-center gap-2 text-xs text-muted-foreground justify-center"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                {s}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Success ─────────────────────────────────────────────
  if (pageState === "success" && result) {
    return (
      <WorkspaceHandoff
        businessName={businessName}
        workspaceUrl={result.workspace_url || "/"}
        workspaceSlug={result.workspace_slug}
        setupLink={result.setup_link}
        inviteSent={result.invite_sent}
        alreadyExists={result.already_exists || result.existing_user}
        inviteWarning={result.invite_warning}
        ownerEmail={email}
        ownerPhone={phone || null}
        clientId={result.client_id}
        inviteStatus={result.invite_status}
        emailDeliveryStatus={result.email_delivery_status}
        smsDeliveryStatus={result.sms_delivery_status}
      />
    );
  }

  // ─── Error ───────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Booking Failed</h2>
          <p className="text-sm text-muted-foreground mb-2">We couldn't complete your booking. Please try again.</p>
          <p className="text-xs text-destructive mb-6 font-mono">{error}</p>
          <Button onClick={() => { setPageState("form"); setError(""); }} variant="outline">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {step === "info" ? "Book Your Intro Call" : "Choose a Time"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "info"
              ? "Tell us about your business and we'll get you set up."
              : "Pick a time for your first meeting with our team."}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className={step === "info" ? "font-semibold text-foreground" : ""}>Your Info</span>
            <span className={step === "booking" ? "font-semibold text-foreground" : ""}>Book Meeting</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <AnimatePresence mode="wait">
            {step === "info" ? (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs mb-1.5 block">
                    Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Dental"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Contact Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@acme.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      type="tel"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Website</Label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://acme.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Business Type</Label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select…</option>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t.toLowerCase()}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Primary Location</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Los Angeles, CA"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setStep("booking")}
                    disabled={!canProceed}
                    className="w-full gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Continue to Booking
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="booking"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {calendarLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading available times…</span>
                  </div>
                ) : !adminCalendar ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-dashed bg-secondary/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Runtime booking debug
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                        <p><span className="text-muted-foreground">Resolved client slug:</span> <span className="font-mono text-foreground">{calendarDebug.resolvedClientSlug}</span></p>
                        <p><span className="text-muted-foreground">Matched client id:</span> <span className="font-mono text-foreground">{calendarDebug.matchedClientId || "none"}</span></p>
                        <p><span className="text-muted-foreground">Matched calendar id:</span> <span className="font-mono text-foreground">{calendarDebug.matchedCalendarId || "none"}</span></p>
                        <p><span className="text-muted-foreground">Active calendar count:</span> <span className="font-mono text-foreground">{calendarDebug.activeCalendarCount}</span></p>
                        <p><span className="text-muted-foreground">Availability row count:</span> <span className="font-mono text-foreground">{calendarDebug.availabilityRowCount}</span></p>
                        <p><span className="text-muted-foreground">Timezone:</span> <span className="font-mono text-foreground">{calendarDebug.timezone}</span></p>
                        <p><span className="text-muted-foreground">First available date:</span> <span className="font-mono text-foreground">{calendarDebug.firstAvailableDate || "none"}</span></p>
                        <p><span className="text-muted-foreground">Booking link slug:</span> <span className="font-mono text-foreground">{calendarDebug.bookingLinkSlug || "none"}</span></p>
                        <p className="sm:col-span-2"><span className="text-muted-foreground">Lookup source:</span> <span className="font-mono text-foreground">{calendarDebug.lookupSource || "none"}</span></p>
                      </div>
                      {calendarDebug.failureReason && (
                        <p className="text-[11px] text-destructive mt-2 font-mono break-all">
                          Failure: {calendarDebug.failureReason}
                        </p>
                      )}
                    </div>

                    <div className="text-center py-4 space-y-3">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        No available booking calendar found. Please contact us directly.
                      </p>
                      <a href="mailto:hello@newlightmarketing.com" className="text-sm text-primary hover:underline">
                        hello@newlightmarketing.com
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground">Booking for</p>
                      <p className="text-sm font-semibold text-foreground">{businessName}</p>
                      <p className="text-xs text-muted-foreground">{contactName} · {email}</p>
                    </div>

                    <div className="rounded-xl border border-dashed bg-secondary/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Runtime booking debug
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                        <p><span className="text-muted-foreground">Resolved client slug:</span> <span className="font-mono text-foreground">{calendarDebug.resolvedClientSlug}</span></p>
                        <p><span className="text-muted-foreground">Matched client id:</span> <span className="font-mono text-foreground">{calendarDebug.matchedClientId || "none"}</span></p>
                        <p><span className="text-muted-foreground">Matched calendar id:</span> <span className="font-mono text-foreground">{calendarDebug.matchedCalendarId || "none"}</span></p>
                        <p><span className="text-muted-foreground">Active calendar count:</span> <span className="font-mono text-foreground">{calendarDebug.activeCalendarCount}</span></p>
                        <p><span className="text-muted-foreground">Availability row count:</span> <span className="font-mono text-foreground">{calendarDebug.availabilityRowCount}</span></p>
                        <p><span className="text-muted-foreground">Timezone:</span> <span className="font-mono text-foreground">{calendarDebug.timezone}</span></p>
                        <p><span className="text-muted-foreground">First available date:</span> <span className="font-mono text-foreground">{calendarDebug.firstAvailableDate || "none"}</span></p>
                        <p><span className="text-muted-foreground">Booking link slug:</span> <span className="font-mono text-foreground">{calendarDebug.bookingLinkSlug || "none"}</span></p>
                        <p className="sm:col-span-2"><span className="text-muted-foreground">Lookup source:</span> <span className="font-mono text-foreground">{calendarDebug.lookupSource || "none"}</span></p>
                      </div>
                      {calendarDebug.failureReason && (
                        <p className="text-[11px] text-destructive mt-2 font-mono break-all">
                          Failure: {calendarDebug.failureReason}
                        </p>
                      )}
                    </div>

                    <CalendarSlotPicker
                      calendarId={adminCalendar.id}
                      clientId={adminClientId!}
                      duration={30}
                      bufferBefore={0}
                      bufferAfter={0}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onDateChange={setSelectedDate}
                      onTimeChange={setSelectedTime}
                    />

                    {selectedDate && selectedTime && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-primary/5 border border-primary/10"
                      >
                        <p className="text-xs text-muted-foreground">Selected time</p>
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(`${selectedDate}T${selectedTime}`).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">30 minute intro call</p>
                      </motion.div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep("info")} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canBook || !adminCalendar}
                    className="flex-1 gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Book My Intro Call
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          By booking you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
