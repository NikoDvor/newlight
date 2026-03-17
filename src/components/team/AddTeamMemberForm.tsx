import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { ROLE_PRESETS, MODULE_KEYS, type AccessLevel } from "@/lib/rolePresets";

interface Props {
  clientId: string;
  existingMember: any | null;
  onComplete: () => void;
  onCancel: () => void;
}

const ACCESS_LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "None" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
  { value: "manage", label: "Manage" },
];

export default function AddTeamMemberForm({ clientId, existingMember, onComplete, onCancel }: Props) {
  // Basic info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("pending_invite");

  // Role & permissions
  const [rolePreset, setRolePreset] = useState("custom");
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({});

  // Calendar
  const [isBookableStaff, setIsBookableStaff] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [calendarAccess, setCalendarAccess] = useState<Record<string, { can_view: boolean; can_edit: boolean; can_be_booked: boolean; receives_notifications: boolean }>>({});

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState({
    booking_notifications: true, cancellation_notifications: true, lead_notifications: false,
    task_notifications: true, review_notifications: false, support_notifications: false,
    payroll_notifications: false, channel_in_app: true, channel_email: true, channel_sms: false,
  });

  // Training
  const [trainingScope, setTrainingScope] = useState("all");

  // Meeting Intelligence
  const [meetingIntel, setMeetingIntel] = useState({
    can_view_recordings: false, can_view_transcripts: false,
    can_view_summaries: false, can_view_ai_actions: false, scope_type: "assigned",
  });

  // Internal
  const [commissionRate, setCommissionRate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [saving, setSaving] = useState(false);

  // Load calendars
  useEffect(() => {
    if (!clientId) return;
    supabase.from("calendars").select("id, calendar_name").eq("client_id", clientId).eq("is_active", true)
      .then(({ data }) => setCalendars(data ?? []));
  }, [clientId]);

  // Load existing member data
  useEffect(() => {
    if (!existingMember) return;
    setFullName(existingMember.full_name);
    setEmail(existingMember.email);
    setPhone(existingMember.phone || "");
    setJobTitle(existingMember.job_title || "");
    setDepartment(existingMember.department || "");
    setStatus(existingMember.status);
    setRolePreset(existingMember.role_preset);
    setIsBookableStaff(existingMember.is_bookable_staff);
    setCommissionRate(existingMember.commission_rate?.toString() || "");
    setInternalNotes(existingMember.internal_notes || "");

    // Load permissions
    supabase.from("workspace_permissions").select("module_key, access_level")
      .eq("workspace_user_id", existingMember.id)
      .then(({ data }) => {
        if (data) {
          const perms: Record<string, AccessLevel> = {};
          data.forEach((p: any) => { perms[p.module_key] = p.access_level; });
          setPermissions(perms);
        }
      });

    // Load calendar access
    supabase.from("calendar_user_access").select("*").eq("workspace_user_id", existingMember.id)
      .then(({ data }) => {
        if (data) {
          const acc: typeof calendarAccess = {};
          data.forEach((c: any) => {
            acc[c.calendar_id] = { can_view: c.can_view, can_edit: c.can_edit, can_be_booked: c.can_be_booked, receives_notifications: c.receives_notifications };
          });
          setCalendarAccess(acc);
        }
      });

    // Load notification prefs
    supabase.from("user_notification_preferences").select("*").eq("workspace_user_id", existingMember.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotifPrefs({
            booking_notifications: data.booking_notifications, cancellation_notifications: data.cancellation_notifications,
            lead_notifications: data.lead_notifications, task_notifications: data.task_notifications,
            review_notifications: data.review_notifications, support_notifications: data.support_notifications,
            payroll_notifications: data.payroll_notifications, channel_in_app: data.channel_in_app,
            channel_email: data.channel_email, channel_sms: data.channel_sms,
          });
        }
      });

    // Load meeting intel
    supabase.from("meeting_intelligence_access").select("*").eq("workspace_user_id", existingMember.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMeetingIntel({
            can_view_recordings: data.can_view_recordings, can_view_transcripts: data.can_view_transcripts,
            can_view_summaries: data.can_view_summaries, can_view_ai_actions: data.can_view_ai_actions,
            scope_type: data.scope_type,
          });
        }
      });
  }, [existingMember]);

  // Apply role preset
  const applyPreset = (preset: string) => {
    setRolePreset(preset);
    if (ROLE_PRESETS[preset]) {
      setPermissions({ ...ROLE_PRESETS[preset].defaults });
      // Auto-set meeting intel based on preset
      const hasIntel = ROLE_PRESETS[preset].defaults.meeting_intel !== "none";
      setMeetingIntel(prev => ({
        ...prev,
        can_view_recordings: hasIntel, can_view_summaries: hasIntel,
        can_view_transcripts: hasIntel, can_view_ai_actions: hasIntel,
      }));
    }
  };

  const handleSave = async () => {
    if (!fullName || !email) { toast.error("Name and email are required"); return; }
    setSaving(true);

    try {
      let workspaceUserId: string;

      if (existingMember) {
        await supabase.from("workspace_users").update({
          full_name: fullName, email, phone: phone || null, job_title: jobTitle || null,
          department: department || null, role_preset: rolePreset, status,
          is_bookable_staff: isBookableStaff, commission_rate: commissionRate ? parseFloat(commissionRate) : null,
          internal_notes: internalNotes || null,
        }).eq("id", existingMember.id);
        workspaceUserId = existingMember.id;
      } else {
        const { data, error } = await supabase.from("workspace_users").insert({
          client_id: clientId, full_name: fullName, email, phone: phone || null,
          job_title: jobTitle || null, department: department || null, role_preset: rolePreset,
          status, is_bookable_staff: isBookableStaff,
          commission_rate: commissionRate ? parseFloat(commissionRate) : null,
          internal_notes: internalNotes || null,
        }).select("id").single();
        if (error) throw error;
        workspaceUserId = data.id;
      }

      // Upsert permissions
      if (existingMember) {
        await supabase.from("workspace_permissions").delete().eq("workspace_user_id", workspaceUserId);
      }
      const permRows = MODULE_KEYS.map(m => ({
        client_id: clientId, workspace_user_id: workspaceUserId,
        module_key: m.key, access_level: permissions[m.key] || "none",
      }));
      await supabase.from("workspace_permissions").insert(permRows);

      // Upsert calendar access
      if (existingMember) {
        await supabase.from("calendar_user_access").delete().eq("workspace_user_id", workspaceUserId);
      }
      const calRows = Object.entries(calendarAccess)
        .filter(([_, v]) => v.can_view || v.can_edit || v.can_be_booked)
        .map(([calId, v]) => ({
          client_id: clientId, workspace_user_id: workspaceUserId, calendar_id: calId, ...v,
        }));
      if (calRows.length > 0) await supabase.from("calendar_user_access").insert(calRows);

      // Upsert notification prefs
      if (existingMember) {
        await supabase.from("user_notification_preferences").delete().eq("workspace_user_id", workspaceUserId);
      }
      await supabase.from("user_notification_preferences").insert({
        client_id: clientId, workspace_user_id: workspaceUserId, ...notifPrefs,
      });

      // Upsert training access
      if (existingMember) {
        await supabase.from("training_user_access").delete().eq("workspace_user_id", workspaceUserId);
      }
      if (permissions.training !== "none") {
        await supabase.from("training_user_access").insert({
          client_id: clientId, workspace_user_id: workspaceUserId, training_scope: trainingScope,
        });
      }

      // Upsert meeting intel access
      if (existingMember) {
        await supabase.from("meeting_intelligence_access").delete().eq("workspace_user_id", workspaceUserId);
      }
      if (permissions.meeting_intel !== "none") {
        await supabase.from("meeting_intelligence_access").insert({
          client_id: clientId, workspace_user_id: workspaceUserId, ...meetingIntel,
        });
      }

      // Send invite if new + pending
      if (!existingMember && status === "pending_invite") {
        await supabase.functions.invoke("invite-user", {
          body: { email, role: "client_team", client_id: clientId },
        });
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        client_id: clientId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: existingMember ? "team_member_updated" : "team_member_added",
        module: "team",
        metadata: { workspace_user_id: workspaceUserId, full_name: fullName, role_preset: rolePreset },
      });

      toast.success(existingMember ? "Team member updated" : "Team member added");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const toggleCalAccess = (calId: string, field: string, value: boolean) => {
    setCalendarAccess(prev => ({
      ...prev,
      [calId]: { ...(prev[calId] || { can_view: false, can_edit: false, can_be_booked: false, receives_notifications: false }), [field]: value },
    }));
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="w-full justify-start mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
        <TabsTrigger value="role" className="text-xs">Role & Modules</TabsTrigger>
        <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
        <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
        <TabsTrigger value="training" className="text-xs">Training</TabsTrigger>
        <TabsTrigger value="intel" className="text-xs">Meeting Intel</TabsTrigger>
        <TabsTrigger value="internal" className="text-xs">Internal</TabsTrigger>
      </TabsList>

      {/* BASIC INFO */}
      <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" /></div>
          <div><Label className="text-xs">Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" disabled={!!existingMember} /></div>
          <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
          <div><Label className="text-xs">Job Title</Label><Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Sales Rep" /></div>
          <div><Label className="text-xs">Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Sales" /></div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending_invite">Pending Invite</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      {/* ROLE & MODULES */}
      <TabsContent value="role" className="space-y-4">
        <div>
          <Label className="text-xs">Role Preset</Label>
          <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1"><Info className="h-3 w-3" /> Selecting a preset auto-fills module permissions. You can customize after.</p>
          <Select value={rolePreset} onValueChange={applyPreset}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_PRESETS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <span className="font-medium">{v.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">— {v.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Module Access</Label>
          <div className="grid gap-1.5">
            {MODULE_KEYS.map(m => (
              <div key={m.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
                <span className="text-sm">{m.label}</span>
                <Select value={permissions[m.key] || "none"} onValueChange={(v: AccessLevel) => setPermissions(p => ({ ...p, [m.key]: v }))}>
                  <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      {/* CALENDAR */}
      <TabsContent value="calendar" className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Bookable Staff</Label>
          <Switch checked={isBookableStaff} onCheckedChange={setIsBookableStaff} />
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Bookable staff appear as booking targets on calendars they're assigned to.</p>
        {calendars.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Calendar Permissions</Label>
            {calendars.map(cal => {
              const acc = calendarAccess[cal.id] || { can_view: false, can_edit: false, can_be_booked: false, receives_notifications: false };
              return (
                <Card key={cal.id} className="p-3 space-y-2">
                  <p className="text-sm font-medium">{cal.calendar_name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "can_view", label: "View" },
                      { key: "can_edit", label: "Edit" },
                      { key: "can_be_booked", label: "Can be booked" },
                      { key: "receives_notifications", label: "Notifications" },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{f.label}</span>
                        <Switch checked={(acc as any)[f.key]} onCheckedChange={v => toggleCalAccess(cal.id, f.key, v)} />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No calendars configured yet. Create calendars first to assign access.</p>
        )}
      </TabsContent>

      {/* NOTIFICATIONS */}
      <TabsContent value="notifications" className="space-y-4">
        <Label className="text-xs font-semibold">Notification Types</Label>
        <div className="space-y-2">
          {[
            { key: "booking_notifications", label: "Booking Notifications" },
            { key: "cancellation_notifications", label: "Cancellation Notifications" },
            { key: "lead_notifications", label: "Lead Notifications" },
            { key: "task_notifications", label: "Task Notifications" },
            { key: "review_notifications", label: "Review Recovery Notifications" },
            { key: "support_notifications", label: "Support / Ticket Notifications" },
            { key: "payroll_notifications", label: "Payroll / Timesheet Notifications" },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">{n.label}</span>
              <Switch checked={(notifPrefs as any)[n.key]} onCheckedChange={v => setNotifPrefs(p => ({ ...p, [n.key]: v }))} />
            </div>
          ))}
        </div>
        <Label className="text-xs font-semibold mt-4">Channels</Label>
        <div className="space-y-2">
          {[
            { key: "channel_in_app", label: "In-App" },
            { key: "channel_email", label: "Email" },
            { key: "channel_sms", label: "SMS" },
          ].map(c => (
            <div key={c.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">{c.label}</span>
              <Switch checked={(notifPrefs as any)[c.key]} onCheckedChange={v => setNotifPrefs(p => ({ ...p, [c.key]: v }))} />
            </div>
          ))}
        </div>
      </TabsContent>

      {/* TRAINING */}
      <TabsContent value="training" className="space-y-4">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Control which training courses and categories this team member can access.</p>
        <div>
          <Label className="text-xs">Training Scope</Label>
          <Select value={trainingScope} onValueChange={setTrainingScope}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="assigned">Assigned Only</SelectItem>
              <SelectItem value="onboarding">Onboarding Curriculum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      {/* MEETING INTELLIGENCE */}
      <TabsContent value="intel" className="space-y-4">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Control access to meeting recordings, transcripts, summaries, and AI insights.</p>
        <div className="space-y-2">
          {[
            { key: "can_view_recordings", label: "View Recordings" },
            { key: "can_view_transcripts", label: "View Transcripts" },
            { key: "can_view_summaries", label: "View Summaries" },
            { key: "can_view_ai_actions", label: "View AI Action Items" },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">{f.label}</span>
              <Switch checked={(meetingIntel as any)[f.key]} onCheckedChange={v => setMeetingIntel(p => ({ ...p, [f.key]: v }))} />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-xs">Scope</Label>
          <Select value={meetingIntel.scope_type} onValueChange={v => setMeetingIntel(p => ({ ...p, scope_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="assigned">Assigned Meetings Only</SelectItem>
              <SelectItem value="all">All Permitted Meetings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      {/* INTERNAL */}
      <TabsContent value="internal" className="space-y-4">
        <div><Label className="text-xs">Commission % (optional)</Label><Input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} placeholder="10" /></div>
        <div><Label className="text-xs">Internal Notes</Label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Any notes about this team member..." rows={3} /></div>
      </TabsContent>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? "Saving..." : existingMember ? "Update Member" : "Add & Send Invite"}
        </Button>
      </div>
    </Tabs>
  );
}
