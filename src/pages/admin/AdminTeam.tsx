import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, UserRoundPlus, Trash2 } from "lucide-react";

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
  client_id: string | null;
}

export default function AdminTeam() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("client_owner");
  const [inviteClientId, setInviteClientId] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualFullName, setManualFullName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualRolePreset, setManualRolePreset] = useState("workspace_admin");
  const [manualDepartment, setManualDepartment] = useState("");
  const [manualJobTitle, setManualJobTitle] = useState("");
  const [manualClientId, setManualClientId] = useState("");
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const manualRoleOptions = [
    { value: "workspace_admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "marketing_staff", label: "Marketing Staff" },
    { value: "support_staff", label: "Support Staff" },
    { value: "custom", label: "Custom" },
  ];

  const fetchData = async () => {
    const [rolesRes, clientsRes] = await Promise.all([
      supabase.from("user_roles").select("*").order("role"),
      supabase.from("clients").select("id, business_name").order("business_name"),
    ]);
    setRoles(rolesRes.data ?? []);
    setClients(clientsRes.data ?? []);
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
          client_id: ["client_owner", "client_team", "read_only"].includes(inviteRole) ? inviteClientId || null : null,
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

  const handleRemove = async (roleId: string) => {
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
    setManualRolePreset("workspace_admin");
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
    if (!manualClientId) {
      toast.error("Assign the user to a client workspace");
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
          client_id: manualClientId,
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
                  <option value="client_owner">Client Owner</option>
                  <option value="client_team">Client Team Member</option>
                  <option value="read_only">Read Only</option>
                </select>
              </div>
              {["client_owner", "client_team", "read_only"].includes(inviteRole) && (
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
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["User ID", "Role", "Client", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white/70 text-xs font-mono">{r.user_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${roleColor(r.role)}`}>{r.role.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {r.client_id ? clients.find(c => c.id === r.client_id)?.business_name || r.client_id.slice(0, 8) : "Platform-wide"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleRemove(r.id)} className="text-white/30 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-white/30">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
