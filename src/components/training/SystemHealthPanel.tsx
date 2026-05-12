import { useState } from "react";
import { ChevronDown, ChevronUp, Play, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const cardStyle = { background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" };

type TestResult = {
  name: string;
  status: "pass" | "fail" | "warn";
  summary: string;
  details: string[];
};

export default function SystemHealthPanel() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const runAll = async () => {
    setRunning(true);
    const out: TestResult[] = [];

    // T1 — Terminology & Glossary
    try {
      const { data: chapters } = await (supabase as any)
        .from("nl_training_chapters")
        .select("id, title, content, module_id, nl_training_modules!inner(track, module_number)")
        .eq("nl_training_modules.track", "bdr")
        .eq("nl_training_modules.module_number", 1);
      const term = (chapters || []).find((c: any) =>
        /terminology|glossary/i.test(c.title || "")
      );
      if (!term) {
        out.push({ name: "Terminology & Glossary Chapter", status: "fail", summary: "✗ Chapter missing in Module 1", details: [] });
      } else {
        const len = (term.content || "").length;
        const { count: qCount } = await (supabase as any)
          .from("nl_training_questions").select("id", { count: "exact", head: true })
          .eq("chapter_id", term.id);
        const ok = len > 100;
        out.push({
          name: "Terminology & Glossary Chapter",
          status: ok ? "pass" : "fail",
          summary: ok ? "✓ Terminology chapter has real content" : "✗ Terminology chapter is empty/missing",
          details: [`Content length: ${len} chars`, `Quiz questions: ${qCount ?? 0}`],
        });
      }
    } catch (e: any) {
      out.push({ name: "Terminology & Glossary Chapter", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T2 — Chapter Read Tracking
    try {
      const { data: progress } = await (supabase as any)
        .from("nl_training_progress").select("user_id, chapter_id, status");
      const byUser: Record<string, any[]> = {};
      (progress || []).forEach((p: any) => { (byUser[p.user_id] ||= []).push(p); });
      const top = Object.entries(byUser).sort((a, b) => b[1].length - a[1].length)[0];
      if (!top) {
        out.push({ name: "Chapter Read Tracking", status: "fail", summary: "✗ No progress records found", details: [] });
      } else {
        const [uid, recs] = top;
        const read = recs.filter((r: any) => r.status === "in_progress" || r.status === "completed").length;
        out.push({
          name: "Chapter Read Tracking",
          status: read > 0 ? "pass" : "fail",
          summary: read > 0
            ? `✓ Chapter read tracking firing — ${read} chapters read for user ${uid.slice(0,8)}`
            : "✗ Read tracking not recording correctly",
          details: [`Total progress rows: ${recs.length}`, `Distinct chapters: ${new Set(recs.map((r:any)=>r.chapter_id)).size}`],
        });
      }
    } catch (e: any) {
      out.push({ name: "Chapter Read Tracking", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T3 — Outcome Pipeline Movement
    try {
      const { data: leads } = await (supabase as any)
        .from("nl_bdr_leads").select("id, business_name, status, deal_id").eq("status", "appointment_booked");
      if (!leads || leads.length === 0) {
        out.push({ name: "Outcome Pipeline Movement", status: "warn", summary: "⚠ No appointment_booked leads to verify", details: [] });
      } else {
        const dealIds = leads.map((l: any) => l.deal_id).filter(Boolean);
        const { data: deals } = dealIds.length
          ? await (supabase as any).from("crm_deals").select("id, pipeline_stage").in("id", dealIds)
          : { data: [] };
        const dealMap: Record<string, string> = {};
        (deals || []).forEach((d: any) => { dealMap[d.id] = d.pipeline_stage; });
        const mismatched = leads.filter((l: any) => l.deal_id && dealMap[l.deal_id] !== "appointment_booked");
        out.push({
          name: "Outcome Pipeline Movement",
          status: mismatched.length === 0 ? "pass" : "fail",
          summary: mismatched.length === 0
            ? "✓ Pipeline movement wired — lead status matches deal stage"
            : `✗ Pipeline broken — ${mismatched.length} mismatched`,
          details: [`Booked leads: ${leads.length}`, `Mismatched: ${mismatched.length}`],
        });
      }
    } catch (e: any) {
      out.push({ name: "Outcome Pipeline Movement", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T4 — Objection Logging
    try {
      const { data: obs } = await (supabase as any).from("nl_bdr_objections").select("user_id, objection_category");
      const total = (obs || []).length;
      const users = new Set((obs || []).map((o: any) => o.user_id));
      const cats = [...new Set((obs || []).map((o: any) => o.objection_category))];
      const counts: Record<string, Record<string, number>> = {};
      (obs || []).forEach((o: any) => {
        counts[o.user_id] ||= {};
        counts[o.user_id][o.objection_category] = (counts[o.user_id][o.objection_category] || 0) + 1;
      });
      const nearThreshold: string[] = [];
      Object.entries(counts).forEach(([u, c]) => Object.entries(c).forEach(([cat, n]) => {
        if (n >= 40 && n < 50) nearThreshold.push(`${u.slice(0,8)} · ${cat}: ${n}/50`);
      }));
      out.push({
        name: "Objection Logging Flow",
        status: total > 0 ? "pass" : "fail",
        summary: total > 0
          ? `✓ Objection logging active — ${total} records across ${users.size} users`
          : "✗ No objection records found — logging may not be firing",
        details: [
          `Categories logged: ${cats.join(", ") || "—"}`,
          `Near 50-threshold: ${nearThreshold.length ? nearThreshold.join("; ") : "none"}`,
        ],
      });
    } catch (e: any) {
      out.push({ name: "Objection Logging Flow", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T5 — Motivation Carousel
    try {
      const { data: refl } = await (supabase as any).from("nl_user_reflections").select("user_id, field_key, value");
      const users = new Set((refl || []).map((r: any) => r.user_id));
      const keys = [...new Set((refl || []).map((r: any) => r.field_key))];
      out.push({
        name: "Motivation Carousel Data",
        status: users.size > 0 ? "pass" : "fail",
        summary: users.size > 0
          ? `✓ Reflection data exists — carousel will display for ${users.size} users`
          : "✗ No reflection data — all users see empty state",
        details: [`Total reflections: ${(refl || []).length}`, `Field keys: ${keys.join(", ") || "—"}`],
      });
    } catch (e: any) {
      out.push({ name: "Motivation Carousel Data", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T6 — BDR Performance Page Data
    try {
      const { data: leads } = await (supabase as any).from("nl_bdr_leads").select("user_id, status");
      const total = (leads || []).length;
      const bdrs = new Set((leads || []).map((l: any) => l.user_id));
      const dist: Record<string, number> = {};
      (leads || []).forEach((l: any) => { dist[l.status] = (dist[l.status] || 0) + 1; });
      out.push({
        name: "BDR Performance Page Data",
        status: total > 0 ? "pass" : "fail",
        summary: total > 0
          ? `✓ BDR performance data exists — ${total} leads from ${bdrs.size} BDRs`
          : "✗ No lead data — performance page will be empty",
        details: [Object.entries(dist).map(([s, n]) => `${s}: ${n}`).join(" · ") || "—"],
      });
    } catch (e: any) {
      out.push({ name: "BDR Performance Page Data", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T7 — Module Exam Records
    try {
      const { data: exams } = await (supabase as any).from("nl_module_exams").select("user_id, module_id, passed");
      const total = (exams || []).length;
      const passes = (exams || []).filter((e: any) => e.passed).length;
      const modulesAttempted = new Set((exams || []).map((e: any) => e.module_id));
      const passByUser: Record<string, Set<string>> = {};
      (exams || []).filter((e: any) => e.passed).forEach((e: any) => {
        (passByUser[e.user_id] ||= new Set()).add(e.module_id);
      });
      const certEligible = Object.values(passByUser).filter((s) => s.size >= 8).length;
      out.push({
        name: "Module Exam Records",
        status: total > 0 ? "pass" : "fail",
        summary: total > 0 ? `✓ Exam records found — ${total} attempts, ${passes} passes` : "✗ No exam records",
        details: [`Distinct modules attempted: ${modulesAttempted.size}`, `Certification eligible users: ${certEligible}`],
      });
    } catch (e: any) {
      out.push({ name: "Module Exam Records", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T8 — Objection Mastery Unlocks
    try {
      const { data: unlocks } = await (supabase as any).from("nl_objection_unlocks").select("*");
      const total = (unlocks || []).length;
      const cats = [...new Set((unlocks || []).map((u: any) => u.objection_category))];
      out.push({
        name: "Objection Mastery Unlock Status",
        status: total > 0 ? "pass" : "warn",
        summary: total > 0 ? "✓ Objection mastery unlocks active" : "⚠ No unlocks triggered yet — threshold not reached",
        details: [`Unlocks: ${total}`, `Categories: ${cats.join(", ") || "—"}`],
      });
    } catch (e: any) {
      out.push({ name: "Objection Mastery Unlock Status", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    // T9 — CRM Pipeline Integrity
    try {
      const { data: deals } = await (supabase as any)
        .from("crm_deals").select("id, pipeline_stage").eq("lead_source", "bdr_field");
      const dist: Record<string, number> = {};
      (deals || []).forEach((d: any) => { dist[d.pipeline_stage] = (dist[d.pipeline_stage] || 0) + 1; });
      // Check stuck: deals at new_lead with linked lead status advanced
      const newLeadIds = (deals || []).filter((d: any) => d.pipeline_stage === "new_lead").map((d: any) => d.id);
      let stuck = 0;
      if (newLeadIds.length) {
        const { data: linked } = await (supabase as any)
          .from("nl_bdr_leads").select("deal_id, status").in("deal_id", newLeadIds);
        stuck = (linked || []).filter((l: any) => l.status && l.status !== "new_lead" && l.status !== "contacted").length;
      }
      out.push({
        name: "CRM Pipeline Integrity",
        status: stuck === 0 ? "pass" : "fail",
        summary: stuck === 0
          ? "✓ BDR pipeline deals advancing correctly"
          : `✗ ${stuck} deals stuck — outcome logged but pipeline not updated`,
        details: [
          `Total BDR deals: ${(deals || []).length}`,
          Object.entries(dist).map(([s, n]) => `${s}: ${n}`).join(" · ") || "—",
        ],
      });
    } catch (e: any) {
      out.push({ name: "CRM Pipeline Integrity", status: "fail", summary: "✗ Query error", details: [e.message] });
    }

    setResults(out);
    setRanAt(new Date().toLocaleString());
    setRunning(false);
  };

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail");
  const warned = results.filter((r) => r.status === "warn");
  const overall = results.length === 0
    ? null
    : failed.length === 0
      ? "✓ System Healthy"
      : "⚠ Issues Found — review above";

  const colorFor = (s: TestResult["status"]) =>
    s === "pass" ? "hsl(142,72%,42%)" : s === "warn" ? "hsl(38,92%,50%)" : "hsl(0,72%,55%)";

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">System Health</span>
          {results.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(211,96%,56%,.1)", color: "hsl(211,96%,56%)" }}>
              {passed}/{results.length} passed
            </span>
          )}
          {ranAt && <span className="text-[10px] text-muted-foreground">Last run: {ranAt}</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={runAll} disabled={running}>
              {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
              Run All Tests
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setResults([]); setRanAt(null); }} disabled={running}>
              <X className="h-3 w-3 mr-1" /> Clear Panel
            </Button>
          </div>

          {results.map((r, i) => (
            <div key={i} className="rounded-lg p-3" style={cardStyle}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{r.name}</span>
                <span className="text-[11px] font-bold" style={{ color: colorFor(r.status) }}>{r.summary}</span>
              </div>
              {r.details.length > 0 && (
                <ul className="mt-1.5 text-[10px] text-muted-foreground space-y-0.5">
                  {r.details.map((d, j) => <li key={j}>· {d}</li>)}
                </ul>
              )}
            </div>
          ))}

          {overall && (
            <div className="rounded-lg p-3 mt-2" style={{ ...cardStyle, borderColor: failed.length === 0 ? "hsl(142,72%,42%)" : "hsl(0,72%,55%)" }}>
              <p className="text-xs font-bold text-foreground">Overall Status</p>
              <p className="text-[11px] mt-1" style={{ color: failed.length === 0 ? "hsl(142,72%,42%)" : "hsl(0,72%,55%)" }}>{overall}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Passed: {passed}/{results.length}
                {failed.length > 0 && ` · Failures: ${failed.map((f) => f.name).join(", ")}`}
                {warned.length > 0 && ` · Warnings: ${warned.map((w) => w.name).join(", ")}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
