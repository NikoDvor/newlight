import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Search, MoreHorizontal, Mail, Pencil, Trash2, ShieldOff, RotateCcw, Shield, Calendar, GraduationCap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_PRESETS } from "@/lib/rolePresets";
import AddTeamMemberForm from "@/components/team/AddTeamMemberForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WorkspaceUser {
  id: string;
  client_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  role_preset: string;
  status: string;
  is_bookable_staff: boolean;
  last_active_at: string | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
}

export default function TeamManagement() {
  const { activeClientId } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceUser[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  const fetchMembers = async () => {
    if (!activeClientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("workspace_users")
      .select("*")
      .eq("client_id", activeClientId)
      .order("created_at", { ascending: false });
    setMembers((data as any[]) ?? []);
    setLoading(false);
  };

  const fetchAuditLogs = async () => {
    if (!activeClientId) return;
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("client_id", activeClientId)
      .eq("module", "team")
      .order("created_at", { ascending: false })
      .limit(20);
    setAuditLogs((data as any[]) ?? []);
  };

  useEffect(() => { fetchMembers(); fetchAuditLogs(); }, [activeClientId]);

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    if (s === "pending_invite") return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    return "bg-white/5 text-white/40 border-white/10";
  };

  const handleDisable = async (member: WorkspaceUser) => {
    const newStatus = member.status === "inactive" ? "active" : "inactive";
    await supabase.from("workspace_users").update({ status: newStatus }).eq("id", member.id);
    await supabase.from("audit_logs").insert({
      client_id: activeClientId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: newStatus === "inactive" ? "team_member_disabled" : "team_member_enabled",
      module: "team",
      metadata: { workspace_user_id: member.id, full_name: member.full_name },
    });
    toast.success(`${member.full_name} ${newStatus === "inactive" ? "disabled" : "re-enabled"}`);
    fetchMembers();
    fetchAuditLogs();
  };

  const handleRemove = async (member: WorkspaceUser) => {
    await supabase.from("workspace_users").delete().eq("id", member.id);
    await supabase.from("audit_logs").insert({
      client_id: activeClientId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "team_member_removed",
      module: "team",
      metadata: { full_name: member.full_name, email: member.email },
    });
    toast.success(`${member.full_name} removed`);
    fetchMembers();
    fetchAuditLogs();
  };

  const handleResendInvite = async (member: WorkspaceUser) => {
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: { email: member.email, role: "client_team", client_id: activeClientId },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Failed to resend invite");
      } else {
        toast.success("Invite resent to " + member.email);
      }
    } catch {
      toast.error("Failed to resend invite");
    }
  };

  // Empty state
  if (!loading && members.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team & Users" description="Manage team members, roles, and permissions for this workspace" />
        <Card className="p-12 text-center border-border bg-card">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Team Members Yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Add your team members to give them access to this workspace. Assign roles, calendar access, and module permissions so everyone has the right level of access.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => { setEditMember(null); setShowAdd(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Team Member
            </Button>
            <Button variant="outline" onClick={() => { setEditMember(null); setShowAdd(true); }}>
              <Shield className="h-4 w-4 mr-1.5" /> Use Role Preset
            </Button>
            <Button variant="outline" onClick={() => { setEditMember(null); setShowAdd(true); }}>
              <Calendar className="h-4 w-4 mr-1.5" /> Assign Bookable Staff
            </Button>
          </div>
        </Card>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
            <AddTeamMemberForm clientId={activeClientId!} existingMember={null} onComplete={() => { setShowAdd(false); fetchMembers(); fetchAuditLogs(); }} onCancel={() => setShowAdd(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Team & Users" description="Manage team members, roles, and permissions for this workspace" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Members", value: members.length, icon: Users },
          { label: "Active", value: members.filter(m => m.status === "active").length, icon: Shield },
          { label: "Pending Invite", value: members.filter(m => m.status === "pending_invite").length, icon: Mail },
          { label: "Bookable Staff", value: members.filter(m => m.is_bookable_staff).length, icon: Calendar },
        ].map(s => (
          <Card key={s.label} className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <s.icon className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-4">
          {/* Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search team members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => { setEditMember(null); setShowAdd(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Team Member
            </Button>
          </div>

          {/* Table */}
          <Card className="border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {["Name", "Role", "Status", "Department", "Bookable", "Last Active", "Actions"].map(h => (
                    <TableHead key={h} className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {ROLE_PRESETS[m.role_preset]?.label || m.role_preset.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(m.status)}`}>
                        {m.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.department || "—"}</TableCell>
                    <TableCell className="text-sm">{m.is_bookable_staff ? "✓" : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditMember(m); setShowAdd(true); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {m.status === "pending_invite" && (
                            <DropdownMenuItem onClick={() => handleResendInvite(m)}>
                              <Mail className="h-3.5 w-3.5 mr-2" /> Resend Invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDisable(m)}>
                            {m.status === "inactive" ? (
                              <><RotateCcw className="h-3.5 w-3.5 mr-2" /> Re-enable</>
                            ) : (
                              <><ShieldOff className="h-3.5 w-3.5 mr-2" /> Disable Access</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRemove(m)} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {loading ? "Loading..." : "No team members match your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Team Activity</h3>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No team activity logged yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="text-sm text-foreground capitalize">{log.action.replace(/_/g, " ")}</p>
                      {log.metadata?.full_name && (
                        <p className="text-xs text-muted-foreground">{log.metadata.full_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <AddTeamMemberForm
            clientId={activeClientId!}
            existingMember={editMember}
            onComplete={() => { setShowAdd(false); setEditMember(null); fetchMembers(); fetchAuditLogs(); }}
            onCancel={() => { setShowAdd(false); setEditMember(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
