import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Trash2, Save, CheckCircle2, Loader2 } from "lucide-react";

export interface EmployeeAccessEntry {
  id: string;
  full_name: string;
  work_email: string;
  phone: string;
  title: string;
  permission_level: string;
  modules_needed: string[];
  calendar_assignment: string;
  calendar_notes: string;
  invite_now: boolean;
  notes: string;
}

const PERMISSION_LEVELS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "view_only", label: "View Only" },
];

const MODULE_OPTIONS = [
  { value: "crm", label: "CRM" },
  { value: "calendar", label: "Calendar" },
  { value: "forms", label: "Forms" },
  { value: "messaging", label: "Messaging" },
  { value: "reviews", label: "Reviews" },
  { value: "billing", label: "Billing" },
  { value: "reporting", label: "Reporting" },
  { value: "website", label: "Website" },
  { value: "seo", label: "SEO" },
  { value: "social_media", label: "Social Media" },
  { value: "ads", label: "Ads" },
];

const CALENDAR_OPTIONS = [
  { value: "none", label: "None" },
  { value: "main_calendar", label: "Main Calendar" },
  { value: "team_calendar", label: "Team Calendar" },
  { value: "assigned_later", label: "Assigned Later" },
];

const emptyEmployee = (): EmployeeAccessEntry => ({
  id: crypto.randomUUID(),
  full_name: "",
  work_email: "",
  phone: "",
  title: "",
  permission_level: "staff",
  modules_needed: [],
  calendar_assignment: "none",
  calendar_notes: "",
  invite_now: false,
  notes: "",
});

const selectCls = "w-full h-9 rounded-md bg-background border border-input text-foreground text-sm px-3";

interface Props {
  clientId: string;
  setupItemId: string | null;
  initialValue: string | null;
  onSaved: () => void;
}

export function TeamAccessSection({ clientId, setupItemId, initialValue, onSaved }: Props) {
  const [employees, setEmployees] = useState<EmployeeAccessEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialValue) {
      try {
        const parsed = JSON.parse(initialValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEmployees(parsed);
          return;
        }
      } catch { /* ignore */ }
    }
    setEmployees([emptyEmployee()]);
  }, [initialValue]);

  const addEmployee = () => setEmployees(prev => [...prev, emptyEmployee()]);
  const removeEmployee = (id: string) => {
    setEmployees(prev => {
      const next = prev.filter(e => e.id !== id);
      return next.length === 0 ? [emptyEmployee()] : next;
    });
  };

  const updateEmployee = (id: string, field: keyof EmployeeAccessEntry, value: any) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const toggleModule = (id: string, mod: string) => {
    setEmployees(prev => prev.map(e => {
      if (e.id !== id) return e;
      const has = e.modules_needed.includes(mod);
      return { ...e, modules_needed: has ? e.modules_needed.filter(m => m !== mod) : [...e.modules_needed, mod] };
    }));
  };

  const handleSave = async () => {
    const valid = employees.filter(e => e.full_name.trim() && e.work_email.trim());
    if (valid.length === 0) {
      toast.error("Please fill in at least one employee with name and email");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const jsonValue = JSON.stringify(employees);

    if (setupItemId) {
      await supabase.from("client_setup_items" as any).update({
        client_value: jsonValue,
        client_submitted_at: now,
        item_status: "received",
      } as any).eq("id", setupItemId);
    }

    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: "client_setup_submission",
      module: "setup_portal",
      metadata: { item_key: "team_members", employee_count: valid.length } as any,
    });

    toast.success(`${valid.length} team member(s) saved`);
    setSaving(false);
    onSaved();
  };

  const filledCount = employees.filter(e => e.full_name.trim() && e.work_email.trim()).length;

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2 bg-primary/[0.02]">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team & User Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-3">
        <p className="text-xs text-muted-foreground">
          Tell us which team members need access, what they should be able to use, and whether they should be invited now or later.
        </p>

        {employees.map((emp, idx) => (
          <div key={emp.id} className="rounded-xl border border-border/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                {emp.full_name || `Employee ${idx + 1}`}
                {emp.permission_level && (
                  <span className="text-muted-foreground font-normal ml-2">
                    ({PERMISSION_LEVELS.find(p => p.value === emp.permission_level)?.label})
                  </span>
                )}
              </p>
              {employees.length > 1 && (
                <button onClick={() => removeEmployee(emp.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                <Input value={emp.full_name} onChange={e => updateEmployee(emp.id, "full_name", e.target.value)} placeholder="Jane Smith" className="text-sm h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Work Email *</label>
                <Input value={emp.work_email} onChange={e => updateEmployee(emp.id, "work_email", e.target.value)} placeholder="jane@company.com" type="email" className="text-sm h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <Input value={emp.phone} onChange={e => updateEmployee(emp.id, "phone", e.target.value)} placeholder="(555) 123-4567" className="text-sm h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <Input value={emp.title} onChange={e => updateEmployee(emp.id, "title", e.target.value)} placeholder="Office Manager" className="text-sm h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Permission Level</label>
                <select value={emp.permission_level} onChange={e => updateEmployee(emp.id, "permission_level", e.target.value)} className={selectCls}>
                  {PERMISSION_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Calendar Assignment</label>
                <select value={emp.calendar_assignment} onChange={e => updateEmployee(emp.id, "calendar_assignment", e.target.value)} className={selectCls}>
                  {CALENDAR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {emp.calendar_assignment === "assigned_later" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Calendar Notes</label>
                <Input value={emp.calendar_notes} onChange={e => updateEmployee(emp.id, "calendar_notes", e.target.value)} placeholder="Which calendar should they be on?" className="text-sm h-9" />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Modules Needed</label>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_OPTIONS.map(mod => {
                  const active = emp.modules_needed.includes(mod.value);
                  return (
                    <button
                      key={mod.value}
                      type="button"
                      onClick={() => toggleModule(emp.id, mod.value)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={emp.invite_now}
                  onChange={e => updateEmployee(emp.id, "invite_now", e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-foreground">Invite this person now</span>
              </label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={emp.notes} onChange={e => updateEmployee(emp.id, "notes", e.target.value)} placeholder="Any special access needs or notes…" rows={2} className="text-sm" />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addEmployee} className="gap-1.5 text-xs">
            <Plus className="h-3 w-3" /> Add Employee
          </Button>
          <div className="flex items-center gap-3">
            {filledCount > 0 && (
              <span className="text-xs text-muted-foreground">{filledCount} employee(s) ready</span>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Team Access
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
