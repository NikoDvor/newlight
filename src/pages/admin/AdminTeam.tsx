import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, UserRoundPlus, Trash2, Send, Activity, ChevronDown, Users } from "lucide-react";
import { SendAppLinkDialog } from "@/components/admin/SendAppLinkDialog";
import { EmployeeStatsDialog } from "@/components/admin/EmployeeStatsDialog";

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
  client_id: string | null;
  status?: string | null;
}

interface ClientOption {
  id: string;
  business_name: string;
  workspace_slug: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  sms_consent: boolean | null;
}

interface WorkspaceMember {
  user_id: string;
  client_id: string;
  status: string | null;
  source?: "workspace_users" | "employee_profiles";
}


export default function AdminTeam() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("client_owner");
  const [inviteClientId, setInviteClientId] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualFullName, setManualFullName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualRolePreset, setManualRolePreset] = useState("bdr");
  const [manualDepartment, setManualDepartment] = useState("");
  const [manualJobTitle, setManualJobTitle] = useState("");
  const [manualClientId, setManualClientId] = useState("");
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [appLinkClientId, setAppLinkClientId] = useState<string>("");
  const [appLinkClient, setAppLinkClient] = useState<ClientOption | null>(null);
  const [appLinkSelectKey, setAppLinkSelectKey] = useState(0);
  const [statsFor, setStatsFor] = useState<RoleRow | null>(null);
  const [loading, setLoading] = useState(false);

  const manualRoleOptions = [
    { value: "bdr", label: "BDR" },
    { value: "sdr", label: "SDR" },
    { value: "project_manager", label: "Project Manager" },
    { value: "service_manager", label: "Service Manager" },
    { value: "admin", label: "Admin" },
  ];

  const fetchData = async () => {
    const [rolesRes, clientsRes, wsRes, empRes] = await Promise.all([
      supabase.from("user_roles").select("*").order("role"),
      supabase.from("clients").select("id, business_name, workspace_slug, owner_name, owner_email, owner_phone, sms_consent").order("business_name"),
      supabase.from("workspace_users").select("user_id, client_id, status"),
      supabase.from("employee_profiles").select("user_id, client_id"),
    ]);
    console.log("[AdminTeam] user_roles:", rolesRes.data, rolesRes.error);
    console.log("[AdminTeam] workspace_users:", wsRes.data, wsRes.error);
    console.log("[AdminTeam] employee_profiles:", empRes.data, empRes.error);
    console.log("[AdminTeam] clients:", clientsRes.data?.length, clientsRes.error);

    const wsMembers: WorkspaceMember[] = ((wsRes.data ?? []) as any[])
      .filter((m) => m?.user_id && m?.client_id)
      .map((m) => ({ user_id: m.user_id, client_id: m.client_id, status: m.status ?? null, source: "workspace_users" as const }));
    const empMembers: WorkspaceMember[] = ((empRes.data ?? []) as any[])
      .filter((m) => m?.user_id && m?.client_id)
      .map((m) => ({ user_id: m.user_id, client_id: m.client_id, status: "active", source: "employee_profiles" as const }));

    setRoles(rolesRes.data ?? []);
    setClients(clientsRes.data ?? []);
    setWorkspaceMembers([...wsMembers, ...empMembers]);
  };


  useEffect(() => { fetchData(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Email is required");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("invite-user", {
        body: {
          email: inviteEmail,
          role: inviteRole,
          client_id: ["client_owner", "client_team", "read_only", "project_manager"].includes(inviteRole) ? inviteClientId || null : null,
        },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || "Failed to invite user");
      } else {
        toast.success("Invitation sent to " + inviteEmail);
        setShowInvite(false);
        setInviteEmail("");
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to invite user");
    }
    setLoading(false);
  };

  const handleRemove = async (roleId: string, userId: string) => {
    const otherRoles = roles.filter(r => r.user_id === userId && r.id !== roleId);
    const fullDelete = otherRoles.length === 0
      ? window.confirm("Permanently delete this user account? This removes them from authentication so the email can be reused.")
      : false;

    if (fullDelete) {
      try {
        const res = await supabase.functions.invoke("delete-user-manual", { body: { user_id: userId } });
        if (res.error || res.data?.error) {
          let backendError: string | null = res.data?.error ?? null;
          const ctx: any = (res.error as any)?.context;
          if (!backendError && ctx?.json) {
            try { backendError = (await ctx.json())?.error ?? null; } catch { /* ignore */ }
          }
          toast.error(backendError || res.error?.message || "Failed to delete user");
          return;
        }
        toast.success("User account fully deleted");
        fetchData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user");
      }
      return;
    }

    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("User role removed");
      fetchData();
    }
  };

  const resetManualForm = () => {
    setManualFullName("");
    setManualEmail("");
    setManualPassword("");
    setManualRolePreset("bdr");
    setManualDepartment("");
    setManualJobTitle("");
    setManualClientId("");
    setShowManualPassword(false);
  };

  const handleManualCreate = async () => {
    if (!manualFullName.trim() || !manualEmail.trim() || !manualPassword) {
      toast.error("Full name, email, and temporary password are required");
      return;
    }
    if (manualPassword.length < 8) {
      toast.error("Temporary password must be at least 8 characters");
      return;
    }
    setManualLoading(true);
    try {
      const res = await supabase.functions.invoke("create-user-manual", {
        body: {
          full_name: manualFullName.trim(),
          email: manualEmail.trim(),
          temporary_password: manualPassword,
          role_preset: manualRolePreset,
          department: manualDepartment.trim() || null,
          job_title: manualJobTitle.trim() || null,
          client_id: manualClientId || null,
        },
      });

      if (res.error || res.data?.error) {
        let backendError: string | null = res.data?.error ?? null;
        const ctx: any = (res.error as any)?.context;
        if (!backendError && ctx) {
          try {
            if (typeof ctx.json === "function") {
              const parsed = await ctx.json();
              backendError = parsed?.error ?? null;
            } else if (typeof ctx.text === "function") {
              const txt = await ctx.text();
              try { backendError = JSON.parse(txt)?.error ?? txt; } catch { backendError = txt; }
            } else if (ctx.body && typeof ctx.body === "string") {
              try { backendError = JSON.parse(ctx.body)?.error ?? ctx.body; } catch { backendError = ctx.body; }
            }
          } catch { /* ignore */ }
        }
        toast.error(backendError || res.error?.message || "Failed to create account");
      } else {
        toast.success("Account created successfully");
        setShowManualAdd(false);
        resetManualForm();
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    }
    setManualLoading(false);
  };

  const roleColor = (r: string) => {
    if (r === "admin") return "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-electric))]";
    if (r === "operator") return "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]";
    return "bg-white/5 text-white/50";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team & Users</h1>
          <p className="text-sm text-white/50 mt-1">Invite and manage platform users</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                <UserPlus className="h-4 w-4 mr-1" /> Invite User
              </Button>
            </DialogTrigger>
          <DialogContent style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
            <DialogHeader>
              <DialogTitle className="text-white">Invite User</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Email</label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com"
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="project_manager">Project Manager (sub-account owner)</option>
                  <option value="client_owner">Client Owner</option>
                  <option value="client_team">Client Team Member</option>
                  <option value="read_only">Read Only</option>
                </select>
              </div>
              {["client_owner", "client_team", "read_only", "project_manager"].includes(inviteRole) && (
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Assign to Client</label>
                  <select value={inviteClientId} onChange={e => setInviteClientId(e.target.value)}
                    className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                  </select>
                </div>
              )}
              <Button onClick={handleInvite} disabled={loading} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
              <p className="text-[10px] text-white/30 text-center">User will receive an email to set their password</p>
            </div>
          </DialogContent>
          </Dialog>
          <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
            <DialogTrigger asChild>
              <Button className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10">
                <UserRoundPlus className="h-4 w-4 mr-1" /> Add Manually
              </Button>
            </DialogTrigger>
            <DialogContent style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
              <DialogHeader><DialogTitle className="text-white">Add Manually</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><label className="text-xs text-white/50 mb-1 block">Full Name</label><Input value={manualFullName} onChange={e => setManualFullName(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" /></div>
                <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" /></div>
                <div><label className="text-xs text-white/50 mb-1 block">Temporary Password</label><div className="relative"><Input type={showManualPassword ? "text" : "password"} value={manualPassword} onChange={e => setManualPassword(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 pr-10" /><button type="button" onClick={() => setShowManualPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">{showManualPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <div><label className="text-xs text-white/50 mb-1 block">Role preset</label><select value={manualRolePreset} onChange={e => { const v = e.target.value; setManualRolePreset(v); if (v === "admin") setManualClientId(""); }} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">{manualRoleOptions.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
                {["bdr", "sdr", "project_manager", "service_manager"].includes(manualRolePreset) ? (
                  <div><label className="text-xs text-white/50 mb-1 block">Assign to Client</label><select value={manualClientId} onChange={e => setManualClientId(e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3"><option value="">NewLight Internal (default)</option>{clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}</select><p className="text-[10px] text-white/30 mt-1">Their leads, calls, and calendar are scoped to this workspace.</p></div>
                ) : (
                  <div><label className="text-xs text-white/50 mb-1 block">Assignment</label><div className="w-full h-10 rounded-md bg-white/[0.03] border border-white/10 text-white/60 text-sm px-3 flex items-center">Platform-wide (Internal Team)</div></div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-xs text-white/50 mb-1 block">Department</label><Input value={manualDepartment} onChange={e => setManualDepartment(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" /></div><div><label className="text-xs text-white/50 mb-1 block">Job Title</label><Input value={manualJobTitle} onChange={e => setManualJobTitle(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" /></div></div>
                <Button onClick={handleManualCreate} disabled={manualLoading} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">{manualLoading ? "Creating..." : "Create Account"}</Button>
                <p className="text-[10px] text-white/30 text-center">No email will be sent. Share the temporary password securely.</p>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setAppLinkClient(clients[0] ?? null)} disabled={clients.length === 0} className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10">
            <Send className="h-4 w-4 mr-1" /> Send App Link
          </Button>
        </div>
      </div>

      <Card className="border-0 bg-white/[0.04] p-4" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Client app download links</p>
            <p className="text-xs text-white/40 mt-1">Preview, copy, or resend any client’s branded app download link.</p>
          </div>
          <select
            key={appLinkSelectKey}
            value={appLinkClientId}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              setAppLinkClientId(id);
              setAppLinkClient(clients.find((c) => c.id === id) ?? null);
            }}
            className="h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3 min-w-[220px]"
          >
            <option value="">Select client…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
        </div>
      </Card>

      <GroupedUsers
        roles={roles}
        workspaceMembers={workspaceMembers}
        clients={clients}
        onStats={setStatsFor}
        onRemove={handleRemove}
        roleColor={roleColor}
      />

      <SendAppLinkDialog
        client={appLinkClient}
        open={!!appLinkClient}
        onOpenChange={(open) => {
          if (!open) {
            setAppLinkClient(null);
            setAppLinkClientId("");
            setAppLinkSelectKey((k) => k + 1);
          }
        }}
        onSent={fetchData}
      />

      {statsFor && (
        <EmployeeStatsDialog
          open={!!statsFor}
          onOpenChange={(o) => { if (!o) setStatsFor(null); }}
          userId={statsFor.user_id}
          role={statsFor.role}
          clientId={statsFor.client_id}
          clientName={statsFor.client_id ? clients.find(c => c.id === statsFor.client_id)?.business_name : null}
          status={(statsFor.status === "suspended" ? "suspended" : "active") as "active" | "suspended"}
          onMutated={fetchData}
          returnPath="/admin/team"
        />
      )}
    </div>
  );
}

interface GroupedUsersProps {
  roles: RoleRow[];
  workspaceMembers: WorkspaceMember[];
  clients: ClientOption[];
  onStats: (r: RoleRow) => void;
  onRemove: (roleId: string, userId: string) => void;
  roleColor: (r: string) => string;
}

function GroupedUsers({ roles, workspaceMembers, clients, onStats, onRemove, roleColor }: GroupedUsersProps) {
  const groups = useMemo(() => {
    try {
      const safeRoles = (roles ?? []).filter((r) => r && r.user_id);
      const safeMembers = (workspaceMembers ?? []).filter((m) => m && m.user_id && m.client_id);
      const safeClients = (clients ?? []).filter((c) => c && c.id);

      // user -> assigned client_id from workspace membership (workspace_users or employee_profiles)
      const userToClient = new Map<string, string>();
      safeMembers.forEach((m) => {
        if (!userToClient.has(m.user_id)) userToClient.set(m.user_id, m.client_id);
      });

      const map = new Map<string, { id: string; name: string; roles: RoleRow[] }>();
      map.set("__platform__", { id: "__platform__", name: "Platform-wide (Admin / Service Manager)", roles: [] });
      safeClients.forEach((c) => map.set(c.id, { id: c.id, name: c.business_name || c.id.slice(0, 8), roles: [] }));

      const ensure = (key: string) => {
        if (!map.has(key)) {
          const c = safeClients.find((cc) => cc.id === key);
          map.set(key, { id: key, name: c?.business_name || `Workspace ${String(key).slice(0, 8)}`, roles: [] });
        }
        return map.get(key)!;
      };

      const seen = new Set<string>();
      safeRoles.forEach((r) => {
        // If role has no client_id but the user has a workspace assignment, prefer that workspace.
        const assigned = !r.client_id && userToClient.has(r.user_id) ? userToClient.get(r.user_id)! : null;
        const key = r.client_id ?? assigned ?? "__platform__";
        ensure(key).roles.push({ ...r, client_id: r.client_id ?? assigned ?? null });
        seen.add(`${key}:${r.user_id}`);
      });

      safeMembers.forEach((m) => {
        const sig = `${m.client_id}:${m.user_id}`;
        if (seen.has(sig)) return;
        ensure(m.client_id).roles.push({
          id: `ws-${m.client_id}-${m.user_id}`,
          user_id: m.user_id,
          role: "client_team",
          client_id: m.client_id,
          status: m.status ?? null,
        });
        seen.add(sig);
      });

      const result = Array.from(map.values()).filter((g) => g.roles.length > 0);
      console.log("[AdminTeam] groups:", result.map((g) => ({ name: g.name, count: g.roles.length })));
      return result;
    } catch (err) {
      console.error("GroupedUsers grouping failed", err);
      return [];
    }
  }, [roles, workspaceMembers, clients]);



  if (groups.length === 0) {
    return (
      <Card className="border-0 bg-white/[0.04] p-12 text-center text-white/30" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        No users found
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <WorkspaceGroup
          key={g.id}
          name={g.name}
          roles={g.roles}
          clients={clients}
          onStats={onStats}
          onRemove={onRemove}
          roleColor={roleColor}
          defaultOpen={g.id === "__platform__"}
        />
      ))}
    </div>
  );
}

function WorkspaceGroup({
  name, roles, clients, onStats, onRemove, roleColor, defaultOpen,
}: {
  name: string;
  roles: RoleRow[];
  clients: ClientOption[];
  onStats: (r: RoleRow) => void;
  onRemove: (roleId: string, userId: string) => void;
  roleColor: (r: string) => string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-white/40" />
            <span className="text-sm font-semibold text-white">{name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/60">
              {roles.length} {roles.length === 1 ? "member" : "members"}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto border-t border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["User ID", "Role", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-white/70 text-xs font-mono">{(r.user_id ?? "").slice(0, 8) || "—"}...</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${roleColor(r.role ?? "")}`}>{(r.role ?? "unknown").replace(/_/g, " ")}</span>
                        {r.status === "suspended" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 uppercase tracking-wider">Suspended</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => onStats(r)} className="text-white/40 hover:text-[hsl(var(--nl-electric))] transition-colors" title="View stats, controls & Login As">
                          <Activity className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onRemove(r.id, r.user_id)} className="text-white/30 hover:text-red-400 transition-colors" title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

