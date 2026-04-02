import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Send, CheckCircle2, Clock, Eye, Pause, UserPlus, RefreshCw, Loader2, AlertCircle
} from "lucide-react";
import type { EmployeeAccessEntry } from "@/components/setup/TeamAccessSection";

interface WorkspaceUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  role_preset: string;
  status: string;
  provisioning_status: string;
  modules_requested: string[] | null;
  calendar_assignment: string | null;
  invite_now_requested: boolean;
  internal_notes: string | null;
  submitted_at: string | null;
  provisioned_at: string | null;
  user_id: string | null;
}

const PROV_STATUSES = [
  { value: "requested", label: "Requested", color: "hsl(38 92% 50%)", icon: Clock },
  { value: "reviewed", label: "Reviewed", color: "hsl(211 96% 56%)", icon: Eye },
  { value: "ready_to_invite", label: "Ready", color: "hsl(270 60% 60%)", icon: UserPlus },
  { value: "invited", label: "Invited", color: "hsl(211 96% 56%)", icon: Send },
  { value: "active", label: "Active", color: "hsl(152 60% 44%)", icon: CheckCircle2 },
  { value: "deferred", label: "Deferred", color: "hsl(0 0% 50%)", icon: Pause },
];

const ROLE_MAP: Record<string, string> = {
  admin: "workspace_admin",
  manager: "manager",
  staff: "front_desk",
  view_only: "read_only",
};

const INVITE_ROLE_MAP: Record<string, string> = {
  admin: "client_owner",
  manager: "client_team",
  staff: "client_team",
  view_only: "read_only",
};

const CAL_OPTIONS = [
  { value: "none", label: "None" },
  { value: "main_calendar", label: "Main Calendar" },
  { value: "team_calendar", label: "Team Calendar" },
  { value: "assigned_later", label: "Assigned Later" },
];

interface Props {
  clientId: string;
  teamMembersJson: string | null;
  onRefresh: () => void;
}

export function TeamAccessReview({ clientId, teamMembersJson, onRefresh }: Props) {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("workspace_users")
      .select("id, full_name, email, phone, job_title, role_preset, status, provisioning_status, modules_requested, calendar_assignment, invite_now_requested, internal_notes, submitted_at, provisioned_at, user_id")
      .eq("client_id", clientId)
      .order("created_at");
    setUsers((data || []) as any as WorkspaceUser[]);
    setLoaded(true);
    setLoading(false);
  };

  const syncFromSubmission = async () => {
    if (!teamMembersJson) { toast.error("No team submission data found"); return; }
    setSyncing(true);
    try {
      const employees: EmployeeAccessEntry[] = JSON.parse(teamMembersJson);
      let created = 0;
      let skipped = 0;
      for (const emp of employees) {
        if (!emp.full_name?.trim() || !emp.work_email?.trim()) continue;
        // Check if already exists
        const { data: existing } = await supabase
          .from("workspace_users")
          .select("id")
          .eq("client_id", clientId)
          .eq("email", emp.work_email.trim().toLowerCase())
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const rolePreset = ROLE_MAP[emp.permission_level] || "front_desk";
        await supabase.from("workspace_users").insert({
          client_id: clientId,
          full_name: emp.full_name.trim(),
          email: emp.work_email.trim().toLowerCase(),
          phone: emp.phone || null,
          job_title: emp.title || null,
          role_preset: rolePreset,
          provisioning_status: "requested",
          modules_requested: emp.modules_needed || [],
          calendar_assignment: emp.calendar_assignment || "none",
          invite_now_requested: emp.invite_now || false,
          internal_notes: emp.notes || null,
          submitted_at: new Date().toISOString(),
          status: "pending",
        } as any);
        created++;
      }

      await supabase.from("audit_logs").insert({
        client_id: clientId,
        action: "team_access_synced",
        module: "lifecycle",
        metadata: { created, skipped, source: "setup_portal_submission" } as any,
      });

      toast.success(`${created} employee(s) synced, ${skipped} already existed`);
      await loadUsers();
    } catch (e) {
      toast.error("Failed to sync: " + (e as Error).message);
    }
    setSyncing(false);
  };

  const updateProvStatus = async (user: WorkspaceUser, newStatus: string) => {
    const oldStatus = user.provisioning_status;
    const updates: any = { provisioning_status: newStatus };
    if (newStatus === "active") updates.provisioned_at = new Date().toISOString();
    if (newStatus === "active") updates.status = "active";

    await supabase.from("workspace_users").update(updates).eq("id", user.id);
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: "team_provisioning_status_change",
      module: "lifecycle",
      metadata: { email: user.email, old_status: oldStatus, new_status: newStatus } as any,
    });

    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updates } : u));
    toast.success(`${user.full_name} → ${newStatus}`);
  };

  const updateField = async (userId: string, field: string, value: any) => {
    await supabase.from("workspace_users").update({ [field]: value } as any).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
  };

  const handleInvite = async (user: WorkspaceUser) => {
    setInviting(user.id);
    try {
      const inviteRole = INVITE_ROLE_MAP[user.role_preset] || "client_team";
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: user.email, role: inviteRole, client_id: clientId },
      });

      if (error) {
        toast.error("Invite failed: " + error.message);
      } else {
        const updates: any = { provisioning_status: "invited" };
        if (data?.user_id) updates.user_id = data.user_id;

        await supabase.from("workspace_users").update(updates).eq("id", user.id);
        await supabase.from("audit_logs").insert({
          client_id: clientId,
          action: "team_user_invited",
          module: "lifecycle",
          metadata: {
            email: user.email,
            invite_email_sent: data?.invite_email_sent,
            already_existed: data?.already_existed,
          } as any,
        });

        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updates } : u));

        if (data?.invite_email_sent) {
          toast.success(`Invite sent to ${user.email}`);
        } else if (data?.already_existed) {
          toast.success(`${user.email} already has an account — role assigned`);
        } else if (data?.setup_link) {
          navigator.clipboard.writeText(data.setup_link);
          toast.success("Setup link copied to clipboard");
        }
      }
    } catch (e) {
      toast.error("Invite error: " + (e as Error).message);
    }
    setInviting(null);
  };

  const updateNotes = async (userId: string, notes: string) => {
    await supabase.from("workspace_users").update({ internal_notes: notes } as any).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, internal_notes: notes } : u));
  };

  if (!loaded) {
    return (
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" /> Team Access Provisioning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={loadUsers} disabled={loading} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5 text-xs h-8">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
            Load Team Access Review
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasSubmission = !!teamMembersJson;
  const requestedCount = users.filter(u => u.provisioning_status === "requested").length;
  const invitedCount = users.filter(u => ["invited", "active"].includes(u.provisioning_status)).length;
  const urgentCount = users.filter(u => u.invite_now_requested && !["invited", "active"].includes(u.provisioning_status)).length;

  return (
    <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" /> Team Access Provisioning
          </CardTitle>
          <div className="flex gap-2">
            {hasSubmission && (
              <Button size="sm" variant="outline" onClick={syncFromSubmission} disabled={syncing}
                className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-[10px] h-7">
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Sync from Submission
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={loadUsers} disabled={loading}
              className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-[10px] h-7">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex gap-4 flex-wrap text-[10px]">
          <span className="text-white/30">Total: <span className="font-bold text-white/60">{users.length}</span></span>
          <span className="text-white/30">Pending: <span className="font-bold text-amber-400">{requestedCount}</span></span>
          <span className="text-white/30">Invited/Active: <span className="font-bold text-emerald-400">{invitedCount}</span></span>
          {urgentCount > 0 && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {urgentCount} urgent invite(s) requested
            </span>
          )}
        </div>

        {users.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-white/30">No team members provisioned yet.</p>
            {hasSubmission && (
              <p className="text-[10px] text-white/20 mt-1">Click "Sync from Submission" to import client-submitted employees.</p>
            )}
          </div>
        )}

        {users.map(user => {
          const provStatus = PROV_STATUSES.find(s => s.value === user.provisioning_status) || PROV_STATUSES[0];
          const ProvIcon = provStatus.icon;
          return (
            <div key={user.id} className="p-3 rounded-xl border transition-colors" style={{
              borderColor: user.invite_now_requested && !["invited", "active"].includes(user.provisioning_status)
                ? "hsla(38,92%,50%,.25)" : "hsla(211,96%,60%,.08)",
              background: "hsla(211,96%,60%,.02)",
            }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{user.full_name}</span>
                  <Badge variant="outline" className="text-[9px] border-0 gap-0.5 shrink-0"
                    style={{ color: provStatus.color, background: `${provStatus.color}15` }}>
                    <ProvIcon className="h-2.5 w-2.5" />
                    {provStatus.label}
                  </Badge>
                  {user.invite_now_requested && !["invited", "active"].includes(user.provisioning_status) && (
                    <Badge className="text-[8px] bg-amber-500/10 text-amber-400 border-0">INVITE NOW</Badge>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-2">
                <div>
                  <p className="text-white/25">Email</p>
                  <p className="text-white/60 truncate">{user.email}</p>
                </div>
                <div>
                  <p className="text-white/25">Title</p>
                  <p className="text-white/60">{user.job_title || "—"}</p>
                </div>
                <div>
                  <p className="text-white/25">Role</p>
                  <select
                    value={user.role_preset}
                    onChange={e => updateField(user.id, "role_preset", e.target.value)}
                    className="text-[10px] rounded px-1.5 py-0.5 bg-white/[0.06] border border-white/10 text-white w-full"
                  >
                    <option value="workspace_admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="front_desk">Front Desk</option>
                    <option value="sales_rep">Sales Rep</option>
                    <option value="service_provider">Service Provider</option>
                    <option value="support_staff">Support</option>
                    <option value="marketing_staff">Marketing</option>
                    <option value="read_only">View Only</option>
                  </select>
                </div>
                <div>
                  <p className="text-white/25">Calendar</p>
                  <select
                    value={user.calendar_assignment || "none"}
                    onChange={e => updateField(user.id, "calendar_assignment", e.target.value)}
                    className="text-[10px] rounded px-1.5 py-0.5 bg-white/[0.06] border border-white/10 text-white w-full"
                  >
                    {CAL_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Modules */}
              {user.modules_requested && user.modules_requested.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {user.modules_requested.map(m => (
                    <span key={m} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[hsla(211,96%,60%,.08)] text-[hsl(var(--nl-sky))]">{m}</span>
                  ))}
                </div>
              )}

              {/* Notes */}
              <input
                type="text"
                placeholder="Internal admin notes…"
                defaultValue={user.internal_notes || ""}
                onBlur={e => { if (e.target.value !== (user.internal_notes || "")) updateNotes(user.id, e.target.value); }}
                className="w-full text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] text-white/40 placeholder:text-white/15 focus:border-white/20 focus:text-white/60 outline-none mb-2"
              />

              {/* Actions */}
              <div className="flex gap-1.5 flex-wrap">
                {user.provisioning_status === "requested" && (
                  <Button size="sm" variant="outline" onClick={() => updateProvStatus(user, "reviewed")}
                    className="border-white/10 text-white hover:bg-white/10 text-[9px] h-6 px-2 gap-1">
                    <Eye className="h-2.5 w-2.5" /> Mark Reviewed
                  </Button>
                )}
                {["requested", "reviewed"].includes(user.provisioning_status) && (
                  <Button size="sm" variant="outline" onClick={() => updateProvStatus(user, "ready_to_invite")}
                    className="border-white/10 text-white hover:bg-white/10 text-[9px] h-6 px-2 gap-1">
                    <UserPlus className="h-2.5 w-2.5" /> Ready to Invite
                  </Button>
                )}
                {["ready_to_invite", "reviewed", "requested"].includes(user.provisioning_status) && (
                  <Button size="sm" onClick={() => handleInvite(user)} disabled={inviting === user.id}
                    className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white text-[9px] h-6 px-2 gap-1">
                    {inviting === user.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
                    Invite User
                  </Button>
                )}
                {user.provisioning_status === "invited" && (
                  <Button size="sm" variant="outline" onClick={() => updateProvStatus(user, "active")}
                    className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-[9px] h-6 px-2 gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Mark Active
                  </Button>
                )}
                {!["deferred", "active"].includes(user.provisioning_status) && (
                  <Button size="sm" variant="outline" onClick={() => updateProvStatus(user, "deferred")}
                    className="border-white/10 text-white/30 hover:bg-white/10 text-[9px] h-6 px-2 gap-1">
                    <Pause className="h-2.5 w-2.5" /> Defer
                  </Button>
                )}
                {user.provisioning_status === "deferred" && (
                  <Button size="sm" variant="outline" onClick={() => updateProvStatus(user, "requested")}
                    className="border-white/10 text-white hover:bg-white/10 text-[9px] h-6 px-2 gap-1">
                    <RefreshCw className="h-2.5 w-2.5" /> Reactivate
                  </Button>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex gap-3 mt-2 text-[8px] text-white/20">
                {user.submitted_at && <span>Submitted: {new Date(user.submitted_at).toLocaleDateString()}</span>}
                {user.provisioned_at && <span>Provisioned: {new Date(user.provisioned_at).toLocaleDateString()}</span>}
                {user.user_id && <span className="text-emerald-400/40">Auth linked ✓</span>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
