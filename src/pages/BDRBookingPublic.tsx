import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Check, Calendar as CalIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
}

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

function buildSlots(availability: any) {
  const slots: { date: Date; label: string }[] = [];
  const now = new Date();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
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
      const s = new Date(d);
      s.setHours(Math.floor(m / 60), m % 60, 0, 0);
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

  // Form Builder step (Step 1) state
  const [formDef, setFormDef] = useState<FormDef | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formStepComplete, setFormStepComplete] = useState(false);
  const [savedSubmissionId, setSavedSubmissionId] = useState<string | null>(null);

  // Step 2 (time slot + contact) state
  const [contact, setContact] = useState({ customer_name: "", business_name: "", phone: "", email: "", notes: "", improvement_area: "" });
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await (supabase as any)
        .from("bdr_calendars")
        .select("id, client_id, name, booking_slug, availability, timezone, booking_title, booking_description, booking_active, booking_form_id")
        .eq("booking_slug", slug)
        .maybeSingle();
      setCal(data);

      // If a form is assigned, load its definition + fields via anon-readable endpoints.
      if (data?.booking_form_id) {
        const formId = data.booking_form_id as string;
        const [{ data: fd }, { data: ff }] = await Promise.all([
          (supabase as any)
            .from("forms")
            .select("id, form_name, intro_text, button_text, client_id")
            .eq("id", formId)
            .eq("is_active", true)
            .maybeSingle(),
          (supabase as any)
            .from("form_fields")
            .select("id, field_label, field_key, field_type, placeholder_text, help_text, is_required, field_order, options_json")
            .eq("form_id", formId)
            .order("field_order", { ascending: true }),
        ]);
        setFormDef(fd || null);
        setFormFields((ff || []) as FormField[]);
      } else {
        // No form => Step 1 is a no-op; go straight to Step 2.
        setFormStepComplete(true);
      }
      setLoading(false);
    })();
  }, [slug]);

  const slots = useMemo(() => (cal ? buildSlots(cal.availability) : []), [cal]);

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
    const { error } = await supabase.functions.invoke("bdr-book", {
      body: {
        booking_slug: slug,
        ...contact,
        starts_at: selectedSlot,
        duration_minutes: 30,
        form_submission_id: savedSubmissionId,
      },
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
              <Field label="Your name *"><Input value={contact.customer_name} onChange={e => setContact({ ...contact, customer_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
              <Field label="Business"><Input value={contact.business_name} onChange={e => setContact({ ...contact, business_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
              <Field label="Phone"><Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
              <Field label="Email"><Input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} className="bg-white/5 border-white/10 text-white" /></Field>
            </div>
            <Field label="Notes (optional)">
              <textarea value={contact.notes} onChange={e => setContact({ ...contact, notes: e.target.value })} rows={2}
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
            <Button onClick={submitBooking} disabled={submitting || !contact.customer_name || !selectedSlot}
              className="w-full bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book appointment"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-white/60">{label}</Label>{children}</div>;
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
