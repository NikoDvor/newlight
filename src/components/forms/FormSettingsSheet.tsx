import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Info } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
  clientId: string | null;
  onSaved: () => void;
}

export function FormSettingsSheet({ open, onOpenChange, form, clientId, onSaved }: Props) {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [apptTypes, setApptTypes] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    linked_calendar_id: "",
    linked_appointment_type_id: "",
    create_contact_on_submit: true,
    update_existing_contact: true,
    create_task_on_submit: false,
    booking_mode: "none",
    page_title: "",
    intro_text: "",
    button_text: "Submit",
    confirmation_message: "Thank you! We will be in touch soon.",
    show_logo: true,
    show_timezone: false,
    collect_notes: true,
  });

  useEffect(() => {
    if (!form) return;
    setSettings({
      linked_calendar_id: form.linked_calendar_id || "",
      linked_appointment_type_id: form.linked_appointment_type_id || "",
      create_contact_on_submit: form.create_contact_on_submit ?? true,
      update_existing_contact: form.update_existing_contact ?? true,
      create_task_on_submit: form.create_task_on_submit ?? false,
      booking_mode: form.booking_mode || "none",
      page_title: form.page_title || "",
      intro_text: form.intro_text || "",
      button_text: form.button_text || "Submit",
      confirmation_message: form.confirmation_message || "",
      show_logo: form.show_logo ?? true,
      show_timezone: form.show_timezone ?? false,
      collect_notes: form.collect_notes ?? true,
    });
  }, [form]);

  useEffect(() => {
    if (!clientId || !open) return;
    const load = async () => {
      const [cRes, aRes] = await Promise.all([
        supabase.from("calendars").select("id, calendar_name").eq("client_id", clientId).eq("is_active", true),
        supabase.from("calendar_appointment_types").select("id, name, calendar_id").eq("client_id", clientId).eq("is_active", true),
      ]);
      setCalendars(cRes.data || []);
      setApptTypes(aRes.data || []);
    };
    load();
  }, [clientId, open]);

  const save = async () => {
    if (!form) return;
    const { error } = await supabase.from("forms").update({
      linked_calendar_id: settings.linked_calendar_id || null,
      linked_appointment_type_id: settings.linked_appointment_type_id || null,
      create_contact_on_submit: settings.create_contact_on_submit,
      update_existing_contact: settings.update_existing_contact,
      create_task_on_submit: settings.create_task_on_submit,
      booking_mode: settings.booking_mode,
      page_title: settings.page_title || null,
      intro_text: settings.intro_text || null,
      button_text: settings.button_text,
      confirmation_message: settings.confirmation_message,
      show_logo: settings.show_logo,
      show_timezone: settings.show_timezone,
      collect_notes: settings.collect_notes,
    }).eq("id", form.id);

    if (error) { toast.error("Failed to save settings"); return; }
    toast.success("Form settings saved");
    onSaved();
  };

  const filteredApptTypes = settings.linked_calendar_id
    ? apptTypes.filter((a) => a.calendar_id === settings.linked_calendar_id)
    : apptTypes;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Form Settings</SheetTitle>
          <SheetDescription>{form?.form_name} — CRM, calendar, and display settings</SheetDescription>
        </SheetHeader>

        {/* CRM Settings */}
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-secondary/50 border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">CRM Connection</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Control how form submissions interact with your CRM contacts and pipeline.</p>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Create Contact on Submit</Label>
            <Switch checked={settings.create_contact_on_submit} onCheckedChange={(v) => setSettings((s) => ({ ...s, create_contact_on_submit: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Update Existing Contact</Label>
            <Switch checked={settings.update_existing_contact} onCheckedChange={(v) => setSettings((s) => ({ ...s, update_existing_contact: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Create Task on Submit</Label>
            <Switch checked={settings.create_task_on_submit} onCheckedChange={(v) => setSettings((s) => ({ ...s, create_task_on_submit: v }))} />
          </div>
        </div>

        {/* Calendar Settings */}
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-secondary/50 border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Calendar Connection</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Link this form to a calendar so submissions can trigger bookings automatically.</p>
          </div>

          <div className="space-y-2">
            <Label>Booking Mode</Label>
            <Select value={settings.booking_mode} onValueChange={(v) => setSettings((s) => ({ ...s, booking_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Booking</SelectItem>
                <SelectItem value="booking_only">Booking Only</SelectItem>
                <SelectItem value="intake_then_book">Intake → Then Book</SelectItem>
                <SelectItem value="book_then_intake">Book → Then Intake</SelectItem>
                <SelectItem value="combined">Combined Form + Booking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.booking_mode !== "none" && (
            <>
              <div className="space-y-2">
                <Label>Linked Calendar</Label>
                <Select value={settings.linked_calendar_id} onValueChange={(v) => setSettings((s) => ({ ...s, linked_calendar_id: v, linked_appointment_type_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select calendar" /></SelectTrigger>
                  <SelectContent>
                    {calendars.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.calendar_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Appointment Type</Label>
                <Select value={settings.linked_appointment_type_id} onValueChange={(v) => setSettings((s) => ({ ...s, linked_appointment_type_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {filteredApptTypes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Display Settings */}
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-semibold">Display & Branding</h4>
          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input value={settings.page_title} onChange={(e) => setSettings((s) => ({ ...s, page_title: e.target.value }))} placeholder="e.g. Book Your Free Consultation" />
          </div>
          <div className="space-y-2">
            <Label>Intro Text</Label>
            <Textarea value={settings.intro_text} onChange={(e) => setSettings((s) => ({ ...s, intro_text: e.target.value }))} rows={2} placeholder="Brief description shown above the form" />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input value={settings.button_text} onChange={(e) => setSettings((s) => ({ ...s, button_text: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Confirmation Message</Label>
            <Textarea value={settings.confirmation_message} onChange={(e) => setSettings((s) => ({ ...s, confirmation_message: e.target.value }))} rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Logo</Label>
            <Switch checked={settings.show_logo} onCheckedChange={(v) => setSettings((s) => ({ ...s, show_logo: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show Timezone</Label>
            <Switch checked={settings.show_timezone} onCheckedChange={(v) => setSettings((s) => ({ ...s, show_timezone: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Collect Notes</Label>
            <Switch checked={settings.collect_notes} onCheckedChange={(v) => setSettings((s) => ({ ...s, collect_notes: v }))} />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save Settings</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
