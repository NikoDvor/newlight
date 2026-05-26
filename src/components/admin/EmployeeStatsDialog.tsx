import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, KeyRound, Ban, RotateCw, LogIn } from "lucide-react";
import { startImpersonation } from "@/lib/impersonation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  role: string;
  clientId: string | null;
  clientName?: string | null;
  status: "active" | "suspended";
  onMutated?: () => void;
  returnPath?: string;
}

interface UserDetails {
  email?: string;
  phone?: string;
  created_at?: string;
  last_sign_in_at?: string;
  banned_until?: string;
}

const STAGES = ["Cold", "Warm", "Hot", "Won"] as const;

export function EmployeeStatsDialog(props: Props) {
  const { open, onOpenChange, userId, role, clientId, clientName, status, onMutated, returnPath } = props;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [details, setDetails] = useState<UserDetails>({});
  const [profile, setProfile] = useState<{ full_name?: string } | null>(null);
  const [workspaceLabel, setWorkspaceLabel] = useState<string | null>(null);

  const [sessionCount, setSessionCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [lastSession, setLastSession] = useState<{ login_at: string; device_type: string | null } | null>(null);

  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [dialCount, setDialCount] = useState(0);
  const [apptCount, setApptCount] = useState(0);
  const [bookingRate, setBookingRate] = useState(0);

  const [certStatus, setCertStatus] = useState<string>("not_started");
  const [moduleProgress, setModuleProgress] = useState<Array<{ module: string; pct: number }>>([]);
  const [quizAttempts, setQuizAttempts] = useState<Array<{ module: string; level: string; count: number }>>([]);
  const [objectionProgress, setObjectionProgress] = useState<Array<{ category: string; count: number }>>([]);

  const [activity, setActivity] = useState<Array<{ id: string; action: string; target: string | null; created_at: string }>>([]);

  useEffect(() => {
    if (!open) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  async function loadAll() {
    setLoading(true);
    try {
      // Employee profile name
      const { data: prof } = await supabase
        .from("employee_profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile(prof ?? null);

      // Auth details via edge function
      try {
        const { data: d } = await supabase.functions.invoke("admin-user-actions", {
          body: { action: "get_user_details", target_user_id: userId },
        });
        if (d && !d.error) setDetails(d);
      } catch { /* ignore */ }

      // Sessions
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("login_at, duration_seconds, device_type")
        .eq("user_id", userId)
        .order("login_at", { ascending: false })
        .limit(500);
      const sArr = sessions ?? [];
      setSessionCount(sArr.length);
      setTotalSeconds(sArr.reduce((acc, s: any) => acc + (s.duration_seconds || 0), 0));
      setLastSession(sArr[0] ? { login_at: sArr[0].login_at, device_type: (sArr[0] as any).device_type } : null);

      // Pipeline counts from nl_bdr_leads.pipeline_stage / status
      try {
        const { data: leads } = await (supabase as any)
          .from("nl_bdr_leads")
          .select("status, pipeline_stage")
          .eq("user_id", userId)
          .limit(5000);
        const counts: Record<string, number> = { Cold: 0, Warm: 0, Hot: 0, Won: 0 };
        (leads ?? []).forEach((l: any) => {
          const key = String(l.pipeline_stage || l.status || "").toLowerCase();
          if (key.includes("won") || key.includes("converted") || key.includes("closed")) counts.Won++;
          else if (key.includes("hot")) counts.Hot++;
          else if (key.includes("warm")) counts.Warm++;
          else counts.Cold++;
        });
        setPipelineCounts(counts);
      } catch {
        setPipelineCounts({ Cold: 0, Warm: 0, Hot: 0, Won: 0 });
      }

      // Dials from bdr_call_outcomes
      let dials = 0;
      try {
        const { count } = await (supabase as any)
          .from("bdr_call_outcomes")
          .select("id", { count: "exact", head: true })
          .eq("bdr_user_id", userId);
        dials = count ?? 0;
      } catch { /* ignore */ }
      setDialCount(dials);

      // Appointments from bdr_calendar_events
      let appts = 0;
      try {
        const { count } = await (supabase as any)
          .from("bdr_calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        appts = count ?? 0;
      } catch { /* ignore */ }
      setApptCount(appts);
      setBookingRate(dials > 0 ? Math.round((appts / dials) * 100) : 0);

      // BDR cert status from nl_certifications (latest attempt)
      try {
        const { data: cert } = await (supabase as any)
          .from("nl_certifications")
          .select("passed, completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setCertStatus(cert ? (cert.passed ? "passed" : "failed") : "not_started");
      } catch { setCertStatus("not_started"); }

      // Module progress M1–M10 derived from nl_training_progress (max score per module_number, cross-track)
      try {
        console.log("[EmployeeStats] module % query — user_id:", userId);
        const { data: mods, error: modsErr } = await (supabase as any)
          .from("nl_training_modules")
          .select("id, module_number")
          .order("module_number");
        const { data: progs, error: progsErr } = await (supabase as any)
          .from("nl_training_progress")
          .select("module_id, score, status")
          .eq("user_id", userId);
        console.log("[EmployeeStats] module % — modules:", mods?.length, "progress rows:", progs?.length, "errors:", modsErr, progsErr);
        console.log("[EmployeeStats] module % — sample progress:", progs?.slice(0, 5));
        const modNumMap = new Map<string, number>();
        (mods ?? []).forEach((m: any) => modNumMap.set(m.id, m.module_number));
        const bestByNumber = new Map<number, number>();
        (progs ?? []).forEach((p: any) => {
          const num = modNumMap.get(p.module_id);
          if (!num || num < 1 || num > 10) return;
          // Treat status='completed' as 100% regardless of score (some modules log score=0 on completion)
          const effective = p.status === "completed" ? 100 : (p.score ?? 0);
          const prev = bestByNumber.get(num) ?? 0;
          if (effective > prev) bestByNumber.set(num, effective);
        });
        const progress = Array.from({ length: 10 }).map((_, i) => ({
          module: `M${i + 1}`,
          pct: Math.min(100, Math.round(bestByNumber.get(i + 1) ?? 0)),
        }));
        console.log("[EmployeeStats] module % — final:", progress);
        setModuleProgress(progress);
      } catch (e) {
        console.error("[EmployeeStats] module % error:", e);
        setModuleProgress(Array.from({ length: 10 }).map((_, i) => ({ module: `M${i + 1}`, pct: 0 })));
      }

      // Quiz attempts from nl_training_progress (attempts per module, grouped into L1/L2/L3 buckets via score)
      try {
        const { data: progs } = await (supabase as any)
          .from("nl_training_progress")
          .select("module_id, attempts, score")
          .eq("user_id", userId);
        const { data: mods2 } = await (supabase as any)
          .from("nl_training_modules")
          .select("id, module_number");
        const modNumMap = new Map<string, number>();
        (mods2 ?? []).forEach((m: any) => modNumMap.set(m.id, m.module_number));
        const bucket = new Map<string, number>();
        (progs ?? []).forEach((p: any) => {
          const num = modNumMap.get(p.module_id);
          if (!num || num < 1 || num > 10) return;
          const score = p.score ?? 0;
          const level = score >= 90 ? "L3" : score >= 70 ? "L2" : "L1";
          const k = `M${num}-${level}`;
          bucket.set(k, (bucket.get(k) ?? 0) + (p.attempts ?? 1));
        });
        setQuizAttempts(
          Array.from({ length: 10 }).flatMap((_, i) =>
            ["L1", "L2", "L3"].map((lv) => ({
              module: `M${i + 1}`,
              level: lv,
              count: bucket.get(`M${i + 1}-${lv}`) ?? 0,
            }))
          )
        );
      } catch {
        setQuizAttempts(
          Array.from({ length: 10 }).flatMap((_, i) =>
            ["L1", "L2", "L3"].map((lv) => ({ module: `M${i + 1}`, level: lv, count: 0 }))
          )
        );
      }

      // Objection progress (counts toward 50)
      try {
        const { data: objs } = await supabase
          .from("nl_bdr_objections" as any)
          .select("objection_category")
          .eq("user_id", userId);
        const map = new Map<string, number>();
        (objs ?? []).forEach((o: any) => map.set(o.objection_category, (map.get(o.objection_category) || 0) + 1));
        setObjectionProgress(Array.from(map.entries()).map(([category, count]) => ({ category, count })));
      } catch { setObjectionProgress([]); }

      // Activity log
      const { data: acts } = await supabase
        .from("user_activity_log")
        .select("id, action, target, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      setActivity(acts ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function invokeAction(action: string, payload?: Record<string, unknown>) {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action, target_user_id: userId, target_email: details.email, ...payload },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Action failed");
      } else {
        toast.success("Done");
        onMutated?.();
        void loadAll();
      }
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const fullName = profile?.full_name || details.email || "Unknown user";
  const hours = (totalSeconds / 3600).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {fullName}
            {status === "suspended" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 uppercase tracking-wider">
                Suspended
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-white/40">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-5 text-sm">
            {/* Identity */}
            <Section title="Account">
              <Row label="Email" value={details.email} />
              <Row label="Phone" value={details.phone} />
              <Row label="Role" value={role.replace(/_/g, " ")} />
              <Row label="Workspace" value={clientName ?? (clientId ? clientId.slice(0, 8) : "Platform-wide")} />
              <Row label="Status" value={status} />
              <Row label="Created" value={fmtDate(details.created_at)} />
              <Row label="Last login" value={fmtDate(details.last_sign_in_at ?? lastSession?.login_at)} />
              <Row label="Last device" value={lastSession?.device_type ?? "—"} />
              <Row label="Total sessions" value={String(sessionCount)} />
              <Row label="Hours on app" value={`${hours}h`} />
            </Section>

            {/* Pipeline / sales */}
            <Section title="Pipeline">
              <div className="grid grid-cols-4 gap-2">
                {STAGES.map((s) => (
                  <Stat key={s} label={s} value={pipelineCounts[s] ?? 0} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Stat label="Dials" value={dialCount} />
                <Stat label="Appts booked" value={apptCount} />
                <Stat label="Booking rate" value={`${bookingRate}%`} />
              </div>
            </Section>

            {/* Training */}
            <Section title="Training & Certification">
              <Row label="BDR certification" value={certStatus.replace(/_/g, " ")} />
              <div className="grid grid-cols-5 gap-2 mt-2">
                {moduleProgress.map((m) => (
                  <Stat key={m.module} label={m.module} value={`${m.pct}%`} />
                ))}
              </div>
              <div className="mt-3 text-[11px] text-white/40 uppercase tracking-wider">Quiz attempts</div>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {quizAttempts.map((q) => (
                  <div key={`${q.module}-${q.level}`} className="rounded bg-white/[0.03] px-2 py-1 text-[11px]">
                    <span className="text-white/40">{q.module} {q.level}</span>
                    <span className="ml-1 text-white/80">{q.count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-white/40 uppercase tracking-wider">Objections (of 50)</div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {objectionProgress.length === 0 ? (
                  <div className="text-white/30 text-xs col-span-3">No objections logged yet</div>
                ) : (
                  objectionProgress.map((o) => (
                    <Stat key={o.category} label={o.category} value={`${o.count}/50`} />
                  ))
                )}
              </div>
            </Section>

            {/* Activity */}
            <Section title="Activity log">
              {activity.length === 0 ? (
                <div className="text-white/30 text-xs">No activity recorded yet.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                  {activity.map((a) => (
                    <div key={a.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="text-white/80">{a.action}</div>
                        {a.target && <div className="text-white/40">{a.target}</div>}
                      </div>
                      <div className="text-white/30 whitespace-nowrap">{fmtDate(a.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Account controls */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
              <Button
                size="sm"
                variant="outline"
                disabled={!!busy}
                onClick={() => invokeAction("force_password_reset", { redirect_to: `${window.location.origin}/reset-password` })}
              >
                <KeyRound className="h-3.5 w-3.5 mr-1" /> Force password reset
              </Button>
              {status === "active" ? (
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => invokeAction("suspend")}>
                  <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => invokeAction("reactivate")}>
                  <RotateCw className="h-3.5 w-3.5 mr-1" /> Reactivate
                </Button>
              )}
              <Button
                size="sm"
                className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white"
                disabled={!!busy}
                onClick={() =>
                  startImpersonation({
                    targetUserId: userId,
                    targetName: profile?.full_name ?? "",
                    targetEmail: details.email ?? "",
                    targetRole: role,
                    targetClientId: clientId,
                    returnPath: returnPath ?? window.location.pathname,
                  })
                }
              >
                <LogIn className="h-3.5 w-3.5 mr-1" /> Login as this user
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2 font-semibold">{title}</div>
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80 truncate">{value || "—"}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-white/[0.04] px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}
