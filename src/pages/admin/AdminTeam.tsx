import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, UserRoundPlus, Trash2, Send, Activity, ChevronDown, Users, Calendar, CalendarPlus } from "lucide-react";
import { SendAppLinkDialog } from "@/components/admin/SendAppLinkDialog";
import { EmployeeStatsDialog } from "@/components/admin/EmployeeStatsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ClientOption {
  id: string;
  business_name: string;
  workspace_slug: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  sms_consent: boolean | null;
}

interface UserRow {
  key: string;             // unique per (user_id, client_id|platform)
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  role_id: string | null;  // user_roles.id (for removal)
  client_id: string | null;
  status: "active" | "suspended";
}

interface WorkspaceGroupData {
  id: string;
  name: string;
  users: UserRow[];
}

const PLATFORM_KEY = "__platform__";

export default function AdminTeam() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [groups, setGroups] = useState<WorkspaceGroupData[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("client_owner");
  const [inviteClientId, setInviteClientId] = useState("");

  // Manual add dialog
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualFullName, setManualFullName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualRolePreset, setManualRolePreset] = useState("bdr");
  const [manualDepartment, setManualDepartment] = useState("");
  const [manualJobTitle, setManualJobTitle] = useState("");
  const [manualClientId, setManualClientId] = useState("");
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);


  // App link modal (stays on this page, never navigates)
  const [appLinkClient, setAppLinkClient] = useState<ClientOption | null>(null);
  const [appLinkSelectValue, setAppLinkSelectValue] = useState<string>("");

  // Stats dialog
  const [statsFor, setStatsFor] = useState<UserRow | null>(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = (location.state as any)?.tab || searchParams.get("tab") || "users";
  const [staffCalendars, setStaffCalendars] = useState([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  const manualRoleOptions = [
    { value: "bdr", label: "BDR" },
    { value: "sdr", label: "SDR" },
    { value: "project_manager", label: "Project Manager" },
    { value: "service_manager", label: "Service Manager" },
    { value: "admin", label: "Admin" },
  ];

  const fetchData = async () => {
    const [clientsRes, rolesRes, wsRes, empRes] = await Promise.all([
      supabase.from("clients").select("id, business_name, workspace_slug, owner_name, owner_email, owner_phone, sms_consent").order("business_name"),
      supabase.from("user_roles").select("id, user_id, role, client_id, status"),
      supabase.from("workspace_users").select("user_id, client_id, status, full_name, email, role_preset"),
      supabase.from("employee_profiles").select("user_id, client_id, full_name, email, employee_role, status"),
    ]);

    const clientList = (clientsRes.data ?? []) as ClientOption[];
    const roleRows = (rolesRes.data ?? []) as any[];
    const wsRows = (wsRes.data ?? []) as any[];
    const empRows = (empRes.data ?? []) as any[];

    // Identity lookup
    const identity = new Map<string, { full_name: string; email: string }>();
    [...wsRows, ...empRows].forEach((r) => {
      if (!r?.user_id) return;
      const existing = identity.get(r.user_id);
      identity.set(r.user_id, {
        full_name: existing?.full_name || r.full_name || "",
        email: existing?.email || r.email || "",
      });
    });

    // Build group buckets
    const buckets = new Map<string, WorkspaceGroupData>();
    buckets.set(PLATFORM_KEY, { id: PLATFORM_KEY, name: "Platform-wide (Admin / Service Manager)", users: [] });
    clientList.forEach((c) => buckets.set(c.id, { id: c.id, name: c.business_name || `Workspace ${c.id.slice(0, 8)}`, users: [] }));
    const ensureBucket = (id: string | null): WorkspaceGroupData => {
      const key = id ?? PLATFORM_KEY;
      if (!buckets.has(key)) {
        buckets.set(key, { id: key, name: `Workspace ${key.slice(0, 8)}`, users: [] });
      }
      return buckets.get(key)!;
    };

    const seen = new Set<string>(); // `${clientKey}:${user_id}`
    const pushUser = (row: UserRow) => {
      const sig = `${row.client_id ?? PLATFORM_KEY}:${row.user_id}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      ensureBucket(row.client_id).users.push(row);
    };

    // 1. user_roles -> definitive role/status
    roleRows.forEach((r) => {
      if (!r?.user_id) return;
      const id = identity.get(r.user_id);
      pushUser({
        key: `role-${r.id}`,
        user_id: r.user_id,
        full_name: id?.full_name || "",
        email: id?.email || "",
        role: r.role || "unknown",
        role_id: r.id,
        client_id: r.client_id ?? null,
        status: r.status === "suspended" ? "suspended" : "active",
      });
    });

    // 2. employee_profiles -> ensure marketing_staff / employees appear under their client
    empRows.forEach((e) => {
      if (!e?.user_id || !e?.client_id) return;
      pushUser({
        key: `emp-${e.user_id}-${e.client_id}`,
        user_id: e.user_id,
        full_name: e.full_name || identity.get(e.user_id)?.full_name || "",
        email: e.email || identity.get(e.user_id)?.email || "",
        role: e.employee_role || "marketing_staff",
        role_id: null,
        client_id: e.client_id,
        status: e.status === "suspended" ? "suspended" : "active",
      });
    });

    // 3. workspace_users -> ensure all members appear
    wsRows.forEach((w) => {
      if (!w?.user_id || !w?.client_id) return;
      pushUser({
        key: `ws-${w.user_id}-${w.client_id}`,
        user_id: w.user_id,
        full_name: w.full_name || identity.get(w.user_id)?.full_name || "",
        email: w.email || identity.get(w.user_id)?.email || "",
        role: w.role_preset || "client_team",
        role_id: null,
        client_id: w.client_id,
        status: w.status === "suspended" ? "suspended" : "active",
      });
    });

    const result = Array.from(buckets.values()).filter((g) => g.users.length > 0);
    console.log("[AdminTeam] groups:", result.map((g) => ({ name: g.name, count: g.users.length })));
    setClients(clientList);
    setGroups(result);
  };

  const fetchStaffCalendars = async () => {
    setLoadingCalendars(true);
    const { data } = await supabase
      .from("calendars")
      .select("*, workers(id, full_name, role_title, department, status, client_id)")
      .eq("calendar_type", "staff")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setStaffCalendars(data || []);
    setLoadingCalendars(false);
  };

  useEffect(() => { fetchData(); fetchStaffCalendars(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error("Email is required"); return; }
    setLoading(true);
    try {
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

  const handleRemove = async (row: UserRow) => {
    if (!row.role_id) {
      toast.error("This member is managed via workspace_users / employee_profiles, not a removable role row.");
      return;
    }
    if (!window.confirm("Remove this user's role assignment?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", row.role_id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); fetchData(); }
  };

  const resetManualForm = () => {
    setManualFullName(""); setManualEmail(""); setManualPhone(""); setManualPassword("");
    setManualRolePreset("bdr"); setManualDepartment(""); setManualJobTitle("");
    setManualClientId(""); setShowManualPassword(false);
  };

  const handleManualCreate = async () => {
    if (!manualFullName.trim() || !manualEmail.trim() || !manualPassword) {
      toast.error("Full name, email, and temporary password are required"); return;
    }
    if (manualPassword.length < 8) { toast.error("Temporary password must be at least 8 characters"); return; }
    const phoneTrimmed = manualPhone.trim();
    const phoneRequired = ["bdr", "sdr"].includes(manualRolePreset);
    if (phoneRequired && !phoneTrimmed) {
      toast.error("Phone number is required for BDR/SDR"); return;
    }
    if (phoneTrimmed && !/^\+[1-9]\d{7,14}$/.test(phoneTrimmed)) {
      toast.error("Phone must be in E.164 format (e.g. +18055551234)"); return;
    }
    setManualLoading(true);
    try {
      const res = await supabase.functions.invoke("create-user-manual", {
        body: {
          full_name: manualFullName.trim(),
          email: manualEmail.trim(),
          phone: phoneTrimmed || null,
          temporary_password: manualPassword,
          role_preset: manualRolePreset,
          department: manualDepartment.trim() || null,
          job_title: manualJobTitle.trim() || null,
          client_id: manualClientId || null,
        },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || "Failed to create account");
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
    if (r === "operator" || r === "service_manager") return "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]";
    if (r === "project_manager") return "bg-purple-500/15 text-purple-300";
    if (r === "bdr" || r === "sdr") return "bg-amber-500/15 text-amber-300";
    return "bg-white/5 text-white/60";
  };

  const openAppLinkFor = (id: string) => {
    if (!id) return;
    const c = clients.find((x) => x.id === id) ?? null;
    setAppLinkClient(c);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="mb-4 bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="users" className="text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">
            Users
          </TabsTrigger>
          <TabsTrigger value="calendars" className="text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">
            Staff Calendars
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
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
              <DialogHeader><DialogTitle className="text-white">Invite User</DialogTitle></DialogHeader>
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

          <Dialog open={showManualAdd} onOpenChange={(o) => { setShowManualAdd(o); if (!o) resetManualForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10">
                <UserRoundPlus className="h-4 w-4 mr-1" /> Add Manually
              </Button>
            </DialogTrigger>
            <DialogContent style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
              <DialogHeader><DialogTitle className="text-white">Add Manually</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><label className="text-xs text-white/50 mb-1 block">Full Name</label><Input value={manualFullName} onChange={e => setManualFullName(e.target.value)} className="bg-white/[0.06] border-white/10 text-white" /></div>
                <div><label className="text-xs text-white/50 mb-1 block">Email</label><Input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="bg-white/[0.06] border-white/10 text-white" /></div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Temporary Password</label>
                  <div className="relative">
                    <Input type={showManualPassword ? "text" : "password"} value={manualPassword} onChange={e => setManualPassword(e.target.value)} className="bg-white/[0.06] border-white/10 text-white pr-10" />
                    <button type="button" onClick={() => setShowManualPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {showManualPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Role preset</label>
                  <select value={manualRolePreset} onChange={e => { const v = e.target.value; setManualRolePreset(v); if (v === "admin") setManualClientId(""); }} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">
                    {manualRoleOptions.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </div>
                {["bdr", "sdr", "project_manager", "service_manager"].includes(manualRolePreset) ? (
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Assign to Client</label>
                    <select value={manualClientId} onChange={e => setManualClientId(e.target.value)} className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3">
                      <option value="">NewLight Internal (default)</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div><label className="text-xs text-white/50 mb-1 block">Assignment</label><div className="w-full h-10 rounded-md bg-white/[0.03] border border-white/10 text-white/60 text-sm px-3 flex items-center">Platform-wide (Internal Team)</div></div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-xs text-white/50 mb-1 block">Department</label><Input value={manualDepartment} onChange={e => setManualDepartment(e.target.value)} className="bg-white/[0.06] border-white/10 text-white" /></div>
                  <div><label className="text-xs text-white/50 mb-1 block">Job Title</label><Input value={manualJobTitle} onChange={e => setManualJobTitle(e.target.value)} className="bg-white/[0.06] border-white/10 text-white" /></div>
                </div>
                <Button onClick={handleManualCreate} disabled={manualLoading} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">{manualLoading ? "Creating..." : "Create Account"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Client app download links - dropdown opens modal on this same page */}
      <Card className="border-0 bg-white/[0.04] p-4" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Client app download links</p>
            <p className="text-xs text-white/40 mt-1">Preview, copy, or resend any client's branded app download link.</p>
          </div>
          <select
            value={appLinkSelectValue}
            onChange={(e) => {
              const id = e.target.value;
              setAppLinkSelectValue(id);
              openAppLinkFor(id);
            }}
            className="h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3 min-w-[220px]"
          >
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
        </div>
      </Card>

      {/* Grouped workspace sections */}
      {groups.length === 0 ? (
        <Card className="border-0 bg-white/[0.04] p-12 text-center text-white/30" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          No users found
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <WorkspaceGroupCard
              key={g.id}
              group={g}
              defaultOpen={g.id === PLATFORM_KEY}
              roleColor={roleColor}
              onStats={setStatsFor}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Send App Link modal - lives on this page; closing resets the dropdown */}
      </TabsContent>

      <TabsContent value="calendars">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                Staff Calendars
              </h2>
              <p className="text-xs text-white/40 mt-1">
                All employee personal calendars across every client workspace. View or book on behalf of any staff member.
              </p>
            </div>
          </div>

          {loadingCalendars ? (
            <div className="text-center text-white/30 py-12 text-sm">
              Loading calendars...
            </div>
          ) : staffCalendars.length === 0 ? (
            <Card className="border-0 bg-white/[0.04] p-12 text-center" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <div className="flex flex-col items-center gap-3">
                <CalendarPlus className="h-8 w-8 text-white/20" />
                <div>
                  <p className="text-white/50 text-sm font-medium">No staff calendars yet</p>
                  <p className="text-white/30 text-xs mt-1">
                    Staff calendars are created automatically when workers are added in Workforce.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Employee", "Role", "Department", "Client Workspace", "Calendar", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffCalendars.map((cal) => {
                    const worker = (cal.workers as any) || {};
                    const clientName = clients.find(c => c.id === worker.client_id)?.business_name || "—";
                    return (
                      <tr key={cal.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/60">
                              {(worker.full_name || "?").substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-white/90 text-sm">{worker.full_name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/60 text-xs">{worker.role_title || "—"}</td>
                        <td className="px-4 py-3 text-white/60 text-xs">{worker.department || "—"}</td>
                        <td className="px-4 py-3 text-white/60 text-xs">{clientName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-[hsl(var(--nl-sky))]" />
                            <span className="text-white/80 text-xs">{cal.calendar_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/50">
                            {worker.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.location.assign(`/calendar-management/${cal.id}`)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors flex items-center gap-1"
                              title="View calendar"
                            >
                              <Eye className="h-3 w-3" /> View
                            </button>
                            <button
                              onClick={() => window.location.assign(`/book/${cal.id}`)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-[hsla(211,96%,60%,.12)] text-[hsl(var(--nl-sky))] hover:bg-[hsla(211,96%,60%,.2)] transition-colors flex items-center gap-1"
                              title="Book on behalf"
                            >
                              <CalendarPlus className="h-3 w-3" /> Book
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Send App Link modal - lives on this page; closing resets the dropdown */}
      <SendAppLinkDialog
        client={appLinkClient}
        open={!!appLinkClient}
        onOpenChange={(open) => {
          if (!open) {
            setAppLinkClient(null);
            setAppLinkSelectValue("");
          }
        }}
        onSent={fetchData}
      />

      {/* Employee stats / Login As dialog */}
      {statsFor && (
        <EmployeeStatsDialog
          open={!!statsFor}
          onOpenChange={(o) => { if (!o) setStatsFor(null); }}
          userId={statsFor.user_id}
          role={statsFor.role}
          clientId={statsFor.client_id}
          clientName={(statsFor as any)._groupName ?? (statsFor.client_id ? clients.find(c => c.id === statsFor.client_id)?.business_name ?? null : null)}
          status={statsFor.status}
          onMutated={fetchData}
          returnPath="/admin/team"
        />
      )}
      </Tabs>
    </div>
  );
}

function WorkspaceGroupCard({
  group, defaultOpen, roleColor, onStats, onRemove,
}: {
  group: WorkspaceGroupData;
  defaultOpen?: boolean;
  roleColor: (r: string) => string;
  onStats: (r: UserRow) => void;
  onRemove: (r: UserRow) => void;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-white/40" />
            <span className="text-sm font-semibold text-white">{group.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/60">
              {group.users.length} {group.users.length === 1 ? "member" : "members"}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto border-t border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Name", "Email", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.users.map((u, i) => (
                  <motion.tr key={u.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-white/90 text-sm">
                      {u.full_name || <span className="text-white/40 font-mono text-xs">{u.user_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">{u.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${roleColor(u.role)}`}>
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.status === "suspended" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 uppercase tracking-wider">Suspended</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 uppercase tracking-wider">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onStats({ ...u, client_id: u.client_id ?? (group.id === "__platform__" ? null : group.id), _groupName: group.name } as any)}
                          className="text-white/40 hover:text-[hsl(var(--nl-electric))] transition-colors"
                          title="View stats, controls & Login As"
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </button>
                        {u.role_id && (
                          <button
                            onClick={() => onRemove(u)}
                            className="text-white/30 hover:text-red-400 transition-colors"
                            title="Remove role"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
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
