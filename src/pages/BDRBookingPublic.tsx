import { useEffect, useMemo, useState } from "react";
import { BookingSlotPicker } from "@/components/BookingSlotPicker";
import { useParams } from "react-router-dom";
import { Loader2, Check, Calendar as CalIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoUploader } from "@/components/LogoUploader";


// Included by default in every plan — always submitted, never shown as selectable.
const INCLUDED_MODULE_KEYS = [
  "paid_ads",
  "seo",
  "website_management",
  "tracking_attribution",
  "crm_automation",
  "lifecycle_nurture",
  "reputation_reviews",
];


// Sales tools bundle — all keys included when the user answers "Yes" to having a sales team.
const SALES_TOOLS = [
  { key: "sales_meeting_intelligence", label: "Meeting Intelligence" },
  { key: "sales_call_tracking", label: "Call Tracking" },
  { key: "sales_followups", label: "Follow-Ups" },
  { key: "sales_tasks", label: "Tasks" },
  { key: "sales_contacts", label: "Contacts" },
  { key: "sales_companies", label: "Companies" },
  { key: "sales_deals", label: "Deals" },
  { key: "sales_pipeline", label: "Pipeline" },
  { key: "sales_appointments", label: "Appointments" },
  { key: "sales_approvals", label: "Approvals" },
];
const SALES_TOOL_KEYS = SALES_TOOLS.map(t => t.key);

interface Cal {
  id: string;
  client_id: string;
  name: string;
  booking_slug: string;
  availability: any;
  timezone: string;
  booking_title: string | null;
  booking_description: string | null;
  booking_active: boolean;
  booking_form_id: string | null;
  closing_booking_slug?: string | null;
  payment_booking_slug?: string | null;
  min_notice_minutes?: number | null;
}

export type BookingMode = "discovery" | "closing" | "payment";

interface FormDef {
  id: string;
  form_name: string;
  intro_text: string | null;
  button_text: string | null;
  client_id: string;
}

interface FormField {
  id: string;
  field_label: string;
  field_key: string;
  field_type: string;
  placeholder_text: string | null;
  help_text: string | null;
  is_required: boolean;
  field_order: number;
  options_json: any;
}

import { computeAvailableSlots, weeklyMapToRows, DEFAULT_MIN_NOTICE_MINUTES } from "@/lib/availabilitySlots";

function buildSlots(availability: any, minNoticeMinutes: number) {
  const rows = weeklyMapToRows(availability || {});
  const dates = computeAvailableSlots(rows, {
    durationMinutes: 30,
    slotIntervalMinutes: 30,
    minNoticeMinutes: minNoticeMinutes ?? DEFAULT_MIN_NOTICE_MINUTES,
    daysAhead: 15,
  });
  return dates.map(s => ({
    date: s,
    label: s.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
  }));
}

export default function BDRBookingPublic({ mode = "discovery" }: { mode?: BookingMode } = {}) {
  const { slug } = useParams<{ slug: string }>();
  const [cal, setCal] = useState<Cal | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Builder step (Step 1) state
  const [formDef, setFormDef] = useState<FormDef | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formStepComplete, setFormStepComplete] = useState(false);
  const [savedSubmissionId, setSavedSubmissionId] = useState<string | null>(null);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);

  // Step 2 (time slot + contact) state
  const [contact, setContact] = useState({ customer_name: "", business_name: "", phone: "", email: "", notes: "" });
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [hasSalesTeam, setHasSalesTeam] = useState<"" | "yes" | "no">("");
  const [hasCompliance, setHasCompliance] = useState<"" | "yes" | "no">("");
  const [logoUrl, setLogoUrl] = useState<string>("");



  useEffect(() => {
    (async () => {
      if (!slug) return;
      const lookupValue = decodeURIComponent(slug).trim();
      const rpcName =
        mode === "closing" ? "get_public_bdr_closing_calendar"
        : mode === "payment" ? "get_public_bdr_payment_calendar"
        : "get_public_bdr_calendar";
      const { data: rpcData, error: calErr } = await (supabase as any)
        .rpc(rpcName, { _slug_or_id: lookupValue });
      const raw = Array.isArray(rpcData) ? rpcData[0] ?? null : rpcData;
      // Normalize closing/payment-mode rows so downstream code can read the same fields.
      const data: Cal | null = raw
        ? (mode === "closing"
            ? {
                id: raw.id,
                client_id: raw.client_id,
                name: raw.name,
                booking_slug: raw.booking_slug,
                availability: raw.availability,
                timezone: raw.timezone,
                booking_title: raw.closing_booking_title,
                booking_description: raw.closing_booking_description,
                booking_active: raw.closing_booking_active,
                booking_form_id: raw.closing_booking_form_id,
                closing_booking_slug: raw.closing_booking_slug,
              }
            : mode === "payment"
            ? {
                id: raw.id,
                client_id: raw.client_id,
                name: raw.name,
                booking_slug: raw.booking_slug,
                availability: raw.availability,
                timezone: raw.timezone,
                booking_title: raw.payment_booking_title,
                booking_description: raw.payment_booking_description,
                booking_active: raw.payment_booking_active,
                booking_form_id: raw.payment_booking_form_id,
                payment_booking_slug: raw.payment_booking_slug,
              }
            : raw)
        : null;
      console.error("[BDRBookingPublic] calendar lookup", { mode, lookupValue, found: !!data, calErr });
      setCal(data);


      // If a form is assigned, load its definition from client_forms (fields live in intake_questions jsonb).
      if (data?.booking_form_id) {
        const formId = data.booking_form_id as string;
        const { data: fd, error: fdErr } = await (supabase as any)
          .from("client_forms")
          .select("id, form_name, client_id, intake_questions, required_fields, confirmation_message, form_settings")
          .eq("id", formId)
          .maybeSingle();
        console.error("[BDRBookingPublic] booking_form_id:", formId, "client_forms row:", fd, "err:", fdErr);
        const settings = (fd as any)?.form_settings || {};
        setRequiresPayment(Boolean(settings.requires_payment));
        setPaymentLinkUrl(typeof settings.stripe_payment_link_url === "string" && settings.stripe_payment_link_url.trim()
          ? settings.stripe_payment_link_url.trim()
          : null);
        if (fd) {
          setFormDef({
            id: fd.id,
            form_name: fd.form_name,
            intro_text: fd.confirmation_message || null,
            button_text: null,
            client_id: fd.client_id,
          });
          const requiredKeys: string[] = Array.isArray(fd.required_fields)
            ? fd.required_fields.map((r: any) => String(r))
            : [];
          let questions: any[] = Array.isArray(fd.intake_questions) ? fd.intake_questions : [];
          // Fallback: form exists but has no configured questions — render a sensible default intake.
          if (questions.length === 0) {
            questions = [
              { id: "full_name", label: "Your full name", type: "text", required: true },
              { id: "business_name", label: "Business name", type: "text", required: true },
              { id: "email", label: "Email", type: "email", required: true },
              { id: "phone", label: "Phone", type: "phone", required: true },
              { id: "goals", label: "What are you hoping to improve?", type: "textarea", required: false },
            ];
            console.error("[BDRBookingPublic] intake_questions empty — using default intake fields");
          }
          const mapped: FormField[] = questions.map((q: any, idx: number) => {
            const key = String(q.id ?? q.key ?? q.field_key ?? `q_${idx}`);
            return {
              id: key,
              field_label: String(q.label ?? q.field_label ?? key),
              field_key: key,
              field_type: String(q.type ?? q.field_type ?? "text"),
              placeholder_text: q.placeholder ?? q.placeholder_text ?? null,
              help_text: q.help ?? q.help_text ?? null,
              is_required: Boolean(q.required ?? q.is_required ?? requiredKeys.includes(key)),
              field_order: Number(q.order ?? idx),
              options_json: q.options ?? q.options_json ?? null,
            };
          }).sort((a, b) => a.field_order - b.field_order);
          console.error("[BDRBookingPublic] mapped form fields:", mapped);
          setFormFields(mapped);
          if (mapped.length === 0) setFormStepComplete(true);
        } else {
          console.error("[BDRBookingPublic] booking_form_id set but client_forms row not visible (RLS?)");
          setFormStepComplete(true);
        }
      } else {
        // No form => Step 1 is a no-op; go straight to Step 2.
        setFormStepComplete(true);
      }
      setLoading(false);
    })();
  }, [slug]);

  const slots = useMemo(() => (cal ? buildSlots(cal.availability, cal.min_notice_minutes ?? DEFAULT_MIN_NOTICE_MINUTES) : []), [cal]);

  // Prefill Step-2 contact fields from common form keys (name/email/phone/business) if present.
  useEffect(() => {
    if (!formStepComplete || !formFields.length) return;
    const grab = (needles: string[]) => {
      for (const f of formFields) {
        const k = (f.field_key || "").toLowerCase();
        const lbl = (f.field_label || "").toLowerCase();
        if (needles.some(n => k.includes(n) || lbl.includes(n))) {
          const v = formValues[f.field_key];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
      }
      return "";
    };
    setContact(prev => ({
      customer_name: prev.customer_name || grab(["name", "full_name", "first_name"]),
      business_name: prev.business_name || grab(["business", "company", "org"]),
      phone: prev.phone || grab(["phone", "mobile", "cell"]),
      email: prev.email || grab(["email"]),
      notes: prev.notes,
    }));

  }, [formStepComplete, formFields, formValues]);

  const validateFormStep = (): string | null => {
    for (const f of formFields) {
      if (!f.is_required) continue;
      const v = formValues[f.field_key];
      const isEmpty =
        v === undefined ||
        v === null ||
        (typeof v === "string" && !v.trim()) ||
        (Array.isArray(v) && v.length === 0);
      if (isEmpty) return `"${f.field_label}" is required`;
    }
    return null;
  };

  const submitFormStep = async () => {
    if (!cal || !formDef) return;
    const err = validateFormStep();
    if (err) { alert(err); return; }
    setSubmitting(true);
    // Insert into form_submissions using the form's own client_id (RLS allows anon insert
    // when form.is_active and client_id matches).
    const { data, error } = await (supabase as any)
      .from("form_submissions")
      .insert({
        form_id: formDef.id,
        client_id: formDef.client_id,
        submission_data: formValues,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) { alert("Couldn't save your response: " + error.message); return; }
    setSavedSubmissionId(data?.id ?? null);
    setFormStepComplete(true);
  };

  const submitBooking = async () => {
    if (!contact.customer_name || !selectedSlot) return;
    setSubmitting(true);
    // Always include mandatory modules; conditionally add sales tools and compliance.
    const mergedModules = Array.from(new Set([
      ...INCLUDED_MODULE_KEYS,
      ...(hasSalesTeam === "yes" ? SALES_TOOL_KEYS : []),
      ...(hasCompliance === "yes" ? ["financial_compliance"] : []),
    ]));
    const has_sales_team = hasSalesTeam === "" ? null : hasSalesTeam === "yes";
    const { error } = await supabase.functions.invoke("bdr-book", {
      body: {
        booking_slug: mode === "closing"
          ? (cal.closing_booking_slug || cal.booking_slug || cal.id)
          : mode === "payment"
          ? ((cal as any).payment_booking_slug || cal.booking_slug || cal.id)
          : (cal.booking_slug || cal.id),
        meeting_kind: mode === "closing" ? "closing" : mode === "payment" ? "payment" : "discovery",
        ...contact,
        starts_at: selectedSlot,
        duration_minutes: 30,
        form_submission_id: savedSubmissionId,
        modules_of_interest: mergedModules,
        has_sales_team,
        sales_team_size: null,
        logo_url: logoUrl || null,
      },
    });
    setSubmitting(false);
    if (error) { alert("Couldn't book: " + error.message); return; }

    // Note: workspace provisioning is handled server-side by the trigger on
    // bdr_calendar_events → booking-confirmation-sms → provision-from-booking.
    // We no longer call provision-from-booking directly from the browser.



    setDone(true);
  };






  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[hsl(215,35%,8%)]"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  if (!cal) return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(215,35%,8%)] p-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border border-white/10 bg-white/[0.03]">
        <h1 className="text-xl font-bold text-white">This booking link is no longer active</h1>
        <p className="text-sm text-white/60">It may have expired or been replaced with a new one.</p>
        <div className="space-y-1 text-sm">
          <a href="tel:+18058363557" className="block text-[hsl(211,96%,68%)] hover:text-[hsl(211,96%,56%)] transition-colors">
            (805) 836-3557
          </a>
          <a href="mailto:team@newlightgen.com" className="block text-[hsl(211,96%,68%)] hover:text-[hsl(211,96%,56%)] transition-colors">
            team@newlightgen.com
          </a>
        </div>
      </div>
    </div>
  );
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

  const showFormStep = !!cal.booking_form_id && !formStepComplete;
  const totalSteps = cal.booking_form_id ? 2 : 1;
  const currentStep = showFormStep ? 1 : totalSteps === 2 ? 2 : 1;

  return (
    <div className="min-h-screen bg-[hsl(215,35%,8%)] py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="text-center">
          <CalIcon className="h-8 w-8 text-[hsl(211,96%,68%)] mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">{cal.booking_title || cal.name}</h1>
          <p className="text-sm text-white/55 whitespace-pre-wrap">{cal.booking_description || "Pick a time and we'll be in touch."}</p>
          {totalSteps === 2 && (
            <div className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/45">
              <span className={currentStep === 1 ? "text-[hsl(211,96%,68%)]" : ""}>Step 1 · Details</span>
              <ChevronRight className="h-3 w-3 opacity-40" />
              <span className={currentStep === 2 ? "text-[hsl(211,96%,68%)]" : ""}>Step 2 · Time</span>
            </div>
          )}
        </div>

        {showFormStep && formDef && (
          <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
            {formDef.intro_text && (
              <p className="text-sm text-white/70 whitespace-pre-wrap">{formDef.intro_text}</p>
            )}
            {formFields.map(f => (
              <FormFieldRenderer
                key={f.id}
                field={f}
                value={formValues[f.field_key]}
                onChange={v => setFormValues(prev => ({ ...prev, [f.field_key]: v }))}
              />
            ))}
            <Button
              onClick={submitFormStep}
              disabled={submitting}
              className="w-full bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (formDef.button_text || "Continue to time selection")}
            </Button>
          </div>
        )}

        {!showFormStep && (
          <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Your name" required><Input value={contact.customer_name} onChange={e => setContact({ ...contact, customer_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
              <Field label="Business" required><Input value={contact.business_name} onChange={e => setContact({ ...contact, business_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
              <Field label="Phone" required><Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
              <Field label="Email" required><Input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
            </div>
            <Field label="Notes" required>
              <textarea value={contact.notes} onChange={e => setContact({ ...contact, notes: e.target.value })} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
            </Field>
            <LogoUploader
              value={logoUrl}
              onChange={setLogoUrl}
              label="Business logo (optional)"
              dark
              clientId="public-booking"
            />

            <Field label="Modules of interest">
              <div className="space-y-4">
                <Field label="Do you have a sales team?" required>
                  <select
                    value={hasSalesTeam}
                    onChange={e => setHasSalesTeam(e.target.value as "" | "yes" | "no")}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                  >
                    <option value="" className="bg-[hsl(215,35%,12%)]">— Select —</option>
                    <option value="yes" className="bg-[hsl(215,35%,12%)]">Yes</option>
                    <option value="no" className="bg-[hsl(215,35%,12%)]">No</option>
                  </select>
                </Field>

                <Field label="Do you have compliance restrictions?" required>
                  <select
                    value={hasCompliance}
                    onChange={e => setHasCompliance(e.target.value as "" | "yes" | "no")}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                  >
                    <option value="" className="bg-[hsl(215,35%,12%)]">— Select —</option>
                    <option value="yes" className="bg-[hsl(215,35%,12%)]">Yes</option>
                    <option value="no" className="bg-[hsl(215,35%,12%)]">No</option>
                  </select>
                </Field>
              </div>
            </Field>



            {mode === "payment" && requiresPayment && (
              <div className="rounded-xl border border-[hsl(211,96%,56%)]/40 bg-[hsl(211,96%,56%)]/10 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">Step 1 · Complete your payment</p>
                  <p className="text-xs text-white/60 mt-1">
                    Secure your onboarding by completing payment first. Then pick a kickoff time below.
                  </p>
                </div>
                {paymentLinkUrl ? (
                  <Button
                    type="button"
                    onClick={() => window.open(paymentLinkUrl!, "_blank", "noopener,noreferrer")}
                    className="w-full h-12 text-base bg-[hsl(142,72%,42%)] hover:bg-[hsl(142,72%,36%)] text-white font-semibold"
                  >
                    Pay Now
                  </Button>
                ) : (
                  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    Payment link not configured yet — contact your admin to finalize this step.
                  </div>
                )}
              </div>
            )}

            <BookingSlotPicker slots={slots} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />

            <Button onClick={submitBooking} disabled={submitting || !contact.customer_name || !contact.business_name || !contact.phone || !contact.email || !contact.notes || !hasSalesTeam || !hasCompliance || !selectedSlot}
              className="w-full bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "payment" ? "Book kickoff call" : "Book appointment")}
            </Button>
            {!contact.customer_name || !contact.business_name || !contact.phone || !contact.email || !contact.notes || !hasSalesTeam || !hasCompliance || !selectedSlot ? (
              <p className="text-sm text-red-400 text-center">Please fill in all required fields and select a time slot.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-white/60">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FormFieldRenderer({ field, value, onChange }: { field: FormField; value: any; onChange: (v: any) => void }) {
  const label = (
    <Label className="text-xs text-white/60">
      {field.field_label}{field.is_required ? " *" : ""}
    </Label>
  );
  const help = field.help_text ? <p className="text-[11px] text-white/40">{field.help_text}</p> : null;
  const baseCls = "bg-white/5 border-white/10 text-white";
  const options: Array<{ label: string; value: string }> = Array.isArray(field.options_json)
    ? field.options_json.map((o: any) =>
        typeof o === "string" ? { label: o, value: o } : { label: o.label ?? o.value, value: o.value ?? o.label },
      )
    : Array.isArray(field.options_json?.options)
      ? field.options_json.options.map((o: any) =>
          typeof o === "string" ? { label: o, value: o } : { label: o.label ?? o.value, value: o.value ?? o.label },
        )
      : [];

  let control: React.ReactNode;
  switch ((field.field_type || "text").toLowerCase()) {
    case "textarea":
    case "long_text":
      control = (
        <textarea
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder_text || ""}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
        />
      );
      break;
    case "select":
    case "dropdown":
      control = (
        <select
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
        >
          <option value="" className="bg-[hsl(215,35%,12%)]">— Select —</option>
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-[hsl(215,35%,12%)]">{o.label}</option>
          ))}
        </select>
      );
      break;
    case "radio":
      control = (
        <div className="space-y-1.5">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input type="radio" name={field.field_key} checked={value === o.value}
                onChange={() => onChange(o.value)} className="accent-[hsl(211,96%,56%)]" />
              {o.label}
            </label>
          ))}
        </div>
      );
      break;
    case "checkbox":
    case "checkboxes":
    case "multiselect": {
      const arr: string[] = Array.isArray(value) ? value : [];
      control = (
        <div className="space-y-1.5">
          {options.length === 0 ? (
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
                className="accent-[hsl(211,96%,56%)]" />
              {field.placeholder_text || field.field_label}
            </label>
          ) : options.map(o => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
              <input type="checkbox" checked={arr.includes(o.value)}
                onChange={e => onChange(e.target.checked ? [...arr, o.value] : arr.filter(v => v !== o.value))}
                className="accent-[hsl(211,96%,56%)]" />
              {o.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "number":
      control = (
        <Input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder_text || ""} className={baseCls} />
      );
      break;
    case "email":
      control = (
        <Input type="email" value={value ?? ""} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder_text || ""} className={baseCls} />
      );
      break;
    case "phone":
    case "tel":
      control = (
        <Input type="tel" value={value ?? ""} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder_text || ""} className={baseCls} />
      );
      break;
    case "date":
      control = (
        <Input type="date" value={value ?? ""} onChange={e => onChange(e.target.value)} className={baseCls} />
      );
      break;
    default:
      control = (
        <Input value={value ?? ""} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder_text || ""} className={baseCls} />
      );
  }

  return <div className="space-y-1">{label}{control}{help}</div>;
}
