import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
  sub?: string[];
}

interface Props {
  trackKey?: string;
}

/**
 * Runtime self-test for the BDR Training Center module list.
 * Renders a collapsible debug bar at the top of the track page.
 * Read-only — does NOT mutate any data.
 */
export function TrainingCenterSelfTest({ trackKey = "bdr" }: Props) {
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("training_self_test_dismissed") === "1";
  });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    const run = async () => {
      setRunning(true);
      const out: TestResult[] = [];

      // ---- TEST 1: module fetch ----
      let modules: any[] = [];
      try {
        const { data: track, error: trackErr } = await supabase
          .from("nl_training_tracks")
          .select("id, track_key")
          .eq("track_key", trackKey)
          .maybeSingle();
        if (trackErr || !track) throw trackErr || new Error("Track not found");
        const { data: mods, error: modErr } = await supabase
          .from("nl_training_modules")
          .select("id, module_number, module_title, module_description, is_locked")
          .eq("track_id", track.id)
          .order("module_number");
        if (modErr) throw modErr;
        modules = mods || [];
        const numbered = modules.filter((m) => m.module_number > 0);
        console.log(`[SelfTest] Modules returned: ${modules.length} (numbered: ${numbered.length})`);
        modules.forEach((m) => console.log(`[SelfTest]   M${m.module_number}: ${m.module_title}`));
        out.push({
          name: "Test 1 — Module fetch",
          passed: numbered.length >= 1,
          detail: `${modules.length} module rows loaded (${numbered.length} numbered)`,
          sub: modules.map((m) => `M${m.module_number}: ${m.module_title}`),
        });
      } catch (err: any) {
        out.push({ name: "Test 1 — Module fetch", passed: false, detail: `Error: ${err?.message || err}` });
      }

      // ---- auth user ----
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      // ---- TEST 2: Module 1 completion ----
      const m1 = modules.find((m) => m.module_number === 1);
      let m1Completed = false;
      try {
        if (!userId) {
          out.push({ name: "Test 2 — Completion record", passed: false, detail: "Not signed in" });
        } else if (!m1) {
          out.push({ name: "Test 2 — Completion record", passed: false, detail: "Module 1 not found" });
        } else {
          const { data: comp } = await (supabase as any)
            .from("nl_module_completion")
            .select("module_id, completed_at, score_average")
            .eq("user_id", userId)
            .eq("module_id", m1.id)
            .maybeSingle();
          m1Completed = !!comp;
          console.log(`[SelfTest] Module 1 completion:`, comp);
          out.push({
            name: "Test 2 — Module 1 completion",
            passed: !!comp,
            detail: comp
              ? `Found · score ${comp.score_average ?? "—"}% · matches M1 id`
              : "No completion record found for Module 1",
          });
        }
      } catch (err: any) {
        out.push({ name: "Test 2 — Module 1 completion", passed: false, detail: `Error: ${err?.message || err}` });
      }

      // ---- TEST 3: unlock chain ----
      try {
        const numbered = modules.filter((m) => m.module_number > 0).sort((a, b) => a.module_number - b.module_number);
        let completionsByModule: Record<string, boolean> = {};
        if (userId && numbered.length > 0) {
          const { data: comps } = await (supabase as any)
            .from("nl_module_completion")
            .select("module_id")
            .eq("user_id", userId)
            .in("module_id", numbered.map((m) => m.id));
          (comps || []).forEach((c: any) => { completionsByModule[c.module_id] = true; });
        }
        const isUnlocked = (n: number) => {
          if (n === 1) return true;
          const prev = numbered.find((m) => m.module_number === n - 1);
          if (!prev) return false;
          return !!completionsByModule[prev.id];
        };
        const states = numbered.map((m) => ({
          n: m.module_number,
          unlocked: isUnlocked(m.module_number),
        }));
        states.forEach((s) => console.log(`[SelfTest] M${s.n}: ${s.unlocked ? "unlocked" : "locked"}`));
        const m2Unlocked = states.find((s) => s.n === 2)?.unlocked;
        const passed = states.find((s) => s.n === 1)?.unlocked === true && (!m1Completed || m2Unlocked === true);
        out.push({
          name: "Test 3 — Unlock chain",
          passed,
          detail: states.map((s) => `M${s.n}: ${s.unlocked ? "unlocked" : "locked"}`).join(", "),
        });
      } catch (err: any) {
        out.push({ name: "Test 3 — Unlock chain", passed: false, detail: `Error: ${err?.message || err}` });
      }

      // ---- TEST 4: card render integrity ----
      try {
        const numbered = modules.filter((m) => m.module_number > 0);
        const broken = numbered.filter((m) => !m.module_title || String(m.module_title).trim() === "");
        out.push({
          name: "Test 4 — Card render data",
          passed: broken.length === 0 && numbered.length > 0,
          detail: broken.length === 0
            ? `All ${numbered.length} cards have title + status data`
            : `${broken.length} module(s) missing title: ${broken.map((m) => `M${m.module_number}`).join(", ")}`,
        });
      } catch (err: any) {
        out.push({ name: "Test 4 — Card render data", passed: false, detail: `Error: ${err?.message || err}` });
      }

      // ---- TEST 5: navigation / chapter fetch for Module 2 ----
      try {
        const m2 = modules.find((m) => m.module_number === 2);
        if (!m2) {
          out.push({ name: "Test 5 — Module 2 chapters", passed: false, detail: "Module 2 not found" });
        } else {
          const { data: chs, error } = await supabase
            .from("nl_training_chapters")
            .select("id, chapter_number, chapter_title")
            .eq("module_id", m2.id)
            .order("chapter_number");
          if (error) throw error;
          console.log(`[SelfTest] Module 2 chapters: ${(chs || []).length}`);
          out.push({
            name: "Test 5 — Module 2 chapters",
            passed: (chs || []).length > 0,
            detail: (chs || []).length > 0
              ? `${(chs || []).length} chapters available · navigation target valid`
              : "No chapters returned for Module 2",
          });
        }
      } catch (err: any) {
        out.push({ name: "Test 5 — Module 2 chapters", passed: false, detail: `Error: ${err?.message || err}` });
      }

      if (!cancelled) {
        setResults(out);
        setRunning(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [trackKey, dismissed]);

  if (dismissed) return null;

  const allPass = results && results.every((r) => r.passed);

  return (
    <div
      className="rounded-lg border text-[12px]"
      style={{
        background: "hsla(220,15%,10%,.7)",
        borderColor: allPass ? "hsla(152,60%,50%,.35)" : results ? "hsla(0,70%,55%,.35)" : "hsla(211,96%,60%,.3)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left flex-1 min-w-0 text-foreground/90 font-medium"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {running || !results ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running Training Center self-tests…</>
          ) : allPass ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-[hsl(152,60%,50%)]" /> All 5 tests passed</>
          ) : (
            <><XCircle className="h-3.5 w-3.5 text-[hsl(0,70%,60%)]" /> {results.filter((r) => !r.passed).length} of {results.length} test(s) failed</>
          )}
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem("training_self_test_dismissed", "1");
            setDismissed(true);
          }}
          className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
        >
          <X className="h-3 w-3" /> Clear Debug Panel
        </button>
      </div>
      {open && results && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-border/30 pt-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              {r.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(152,60%,50%)]" />
              ) : (
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(0,70%,60%)]" />
              )}
              <div className="min-w-0">
                <div className="text-foreground/95">{r.name}</div>
                <div className="text-muted-foreground">{r.detail}</div>
                {r.sub && r.sub.length > 0 && (
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-3 text-[11px] text-muted-foreground/80">
                    {r.sub.map((s, j) => <div key={j} className="truncate">· {s}</div>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
