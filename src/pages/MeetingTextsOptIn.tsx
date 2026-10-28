import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public page linked from an extra attendee's meeting emails
 * ("Text me reminders"). Viewing the page changes nothing — email scanners
 * prefetch links — the attendee must tap the button to opt in.
 */
interface Info { found: boolean; name: string; phone_last4: string; has_phone: boolean; sms_consent: boolean }

export default function MeetingTextsOptIn() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"on" | "off" | null>(null);

  useEffect(() => {
    (async () => {
      if (!token || !/^[0-9a-f-]{36}$/i.test(token)) { setLoading(false); return; }
      const { data } = await (supabase as any).rpc("nl_attendee_optin_info", { _token: token });
      setInfo((data as Info) || null);
      setLoading(false);
    })();
  }, [token]);

  const save = async (consent: boolean) => {
    setSaving(true); setError("");
    const { data, error: e } = await (supabase as any).rpc("nl_attendee_sms_optin", {
      _token: token, _phone: info?.has_phone ? null : phone, _consent: consent,
    });
    setSaving(false);
    if (e || !data?.ok) { setError(e?.message || data?.error || "Something went wrong. Try again."); return; }
    setDone(consent ? "on" : "off");
  };

  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="text-xs font-semibold tracking-wider text-sky-600 uppercase">NewLight</div>
        {children}
      </div>
    </div>
  );

  if (loading) return shell(<div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>);
  if (!info?.found) return shell(<p className="text-sm">This link isn't valid anymore.</p>);
  if (done) return shell(
    <div className="space-y-2 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="h-5 w-5 text-emerald-600" /></div>
      <p className="text-sm">{done === "on" ? "Text reminders are on. Reply STOP to any text to turn them off." : "Text reminders are off. You'll still get emails."}</p>
    </div>,
  );

  const phoneOk = info.has_phone || phone.replace(/\D/g, "").length >= 10;
  return shell(
    <>
      <h1 className="text-lg font-bold">Text me meeting reminders</h1>
      <p className="text-sm text-slate-600">
        Hi {info.name}. Get texts about your NewLight meetings — confirmations, Zoom links, reminders and time changes
        {info.has_phone && info.phone_last4 ? <> at the number ending in <strong>{info.phone_last4}</strong></> : null}.
      </p>
      {!info.has_phone && (
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )}
      {info.sms_consent ? (
        <>
          <p className="text-sm text-emerald-700">Text reminders are already on.</p>
          <button disabled={saving} onClick={() => save(false)} className="w-full rounded-md border border-slate-300 py-2 text-sm">
            Turn texts off
          </button>
        </>
      ) : (
        <button disabled={saving || !phoneOk} onClick={() => save(true)}
          className="w-full rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold py-2.5 text-sm">
          {saving ? "Saving…" : "Text me reminders"}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-slate-500">
        Meeting texts only. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
      </p>
    </>,
  );
}
