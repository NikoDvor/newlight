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
import { Users, UserPlus, Search, MoreHorizontal, Mail, Pencil, Trash2, ShieldOff, RotateCcw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_PRESETS } from "@/lib/rolePresets";
import AddTeamMemberForm from "@/components/team/AddTeamMemberForm";

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

export default function TeamManagement() {
  const { activeClientId } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceUser[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchMembers(); }, [activeClientId]);

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
    toast.success(`${member.full_name} ${newStatus === "inactive" ? "disabled" : "re-enabled"}`);
    fetchMembers();
  };

  const handleRemove = async (member: WorkspaceUser) => {
    await supabase.from("workspace_users").delete().eq("id", member.id);
    toast.success(`${member.full_name} removed`);
    fetchMembers();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Users"
        subtitle="Manage team members, roles, and permissions for this workspace"
        icon={<Users className="h-5 w-5" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Members", value: members.length },
          { label: "Active", value: members.filter(m => m.status === "active").length },
          { label: "Pending Invite", value: members.filter(m => m.status === "pending_invite").length },
          { label: "Bookable Staff", value: members.filter(m => m.is_bookable_staff).length },
        ].map(s => (
          <Card key={s.label} className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
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
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
                  {loading ? "Loading..." : "No team members found. Add your first team member to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <AddTeamMemberForm
            clientId={activeClientId!}
            existingMember={editMember}
            onComplete={() => { setShowAdd(false); setEditMember(null); fetchMembers(); }}
            onCancel={() => { setShowAdd(false); setEditMember(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
