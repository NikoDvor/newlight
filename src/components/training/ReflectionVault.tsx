import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

export interface ReflectionField {
  field_key: string;
  label: string;
  placeholder: string;
  rows: number;
}

interface ReflectionVaultProps {
  chapterId: string;
  fields: ReflectionField[];
}

export function ReflectionVault({ chapterId, fields }: ReflectionVaultProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId || !chapterId) return;
    (supabase as any)
      .from("nl_user_reflections")
      .select("field_key, field_value")
      .eq("user_id", userId)
      .eq("chapter_id", chapterId)
      .then(({ data }: any) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r: any) => { map[r.field_key] = r.field_value; });
          setValues(map);
        }
      });
  }, [userId, chapterId]);

  const save = useCallback(
    async (fieldKey: string, value: string) => {
      if (!userId) return;
      await (supabase as any).from("nl_user_reflections").upsert(
        {
          user_id: userId,
          chapter_id: chapterId,
          field_key: fieldKey,
          field_value: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chapter_id,field_key" }
      );
      setSavedKeys((prev) => new Set(prev).add(fieldKey));
      setTimeout(() => setSavedKeys((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      }), 2000);
    },
    [userId, chapterId]
  );

  const handleChange = (fieldKey: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    if (timers.current[fieldKey]) clearTimeout(timers.current[fieldKey]);
    timers.current[fieldKey] = setTimeout(() => save(fieldKey, value), 1500);
  };

  const handleBlur = (fieldKey: string) => {
    if (timers.current[fieldKey]) clearTimeout(timers.current[fieldKey]);
    save(fieldKey, values[fieldKey] ?? "");
  };

  return (
    <div
      className="mt-8 rounded-2xl p-5 sm:p-8 space-y-6"
      style={{
        background: "hsla(215,35%,10%,.8)",
        border: "1px solid hsla(211,96%,60%,.12)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="h-1 w-8 rounded-full"
          style={{ background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(217,90%,50%))" }}
        />
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
          Your Reflection
        </span>
      </div>

      {fields.map((f) => (
        <div key={f.field_key} className="space-y-2">
          <label className="block text-sm font-semibold text-white/90">{f.label}</label>
          <div className="relative">
            <textarea
              rows={f.rows}
              placeholder={f.placeholder}
              value={values[f.field_key] ?? ""}
              onChange={(e) => handleChange(f.field_key, e.target.value)}
              onBlur={() => handleBlur(f.field_key)}
              className="w-full rounded-xl px-4 py-3 text-sm leading-relaxed text-white/85 placeholder:text-white/30 resize-none focus:outline-none focus:ring-1"
              style={{
                background: "hsla(215,35%,14%,.9)",
                border: "1px solid hsla(211,96%,60%,.15)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "hsla(211,96%,60%,.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px hsla(211,96%,60%,.1)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "hsla(211,96%,60%,.15)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {savedKeys.has(f.field_key) && (
              <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[11px] font-medium text-[hsl(152,60%,50%)] animate-in fade-in duration-300">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
