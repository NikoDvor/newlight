import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2 } from "lucide-react";

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multi_select", label: "Multi Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "file_upload", label: "File Upload" },
];

const FORM_TYPES = [
  { value: "contact", label: "Contact" },
  { value: "booking", label: "Booking" },
  { value: "intake", label: "Intake" },
  { value: "estimate", label: "Estimate" },
  { value: "support", label: "Support" },
  { value: "custom", label: "Custom" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
  fields: any[];
  setFields: (fields: any[]) => void;
  clientId: string | null;
  onSaved: () => void;
}

export function FormEditorSheet({ open, onOpenChange, form, fields, setFields, clientId, onSaved }: Props) {
  const [formName, setFormName] = useState(form?.form_name || "New Form");
  const [formType, setFormType] = useState(form?.form_type || "contact");
  const [description, setDescription] = useState(form?.description || "");
  const [saving, setSaving] = useState(false);

  // Reset state when form changes
  const resetState = () => {
    setFormName(form?.form_name || "New Form");
    setFormType(form?.form_type || "contact");
    setDescription(form?.description || "");
  };

  const addField = () => {
    const order = fields.length;
    setFields([
      ...fields,
      {
        id: `nf-${Date.now()}`,
        field_label: "New Field",
        field_key: `field_${order}`,
        field_type: "short_text",
        is_required: false,
        field_order: order,
        placeholder_text: "",
        help_text: "",
        options_json: null,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, key: string, value: any) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const save = async () => {
    if (!clientId) return;
    setSaving(true);

    try {
      let formId = form?.id;

      if (form) {
        await supabase.from("forms").update({
          form_name: formName,
          form_type: formType,
          description,
        }).eq("id", form.id);
      } else {
        const { data, error } = await supabase.from("forms").insert({
          client_id: clientId,
          form_name: formName,
          form_type: formType,
          description,
        }).select().single();
        if (error) throw error;
        formId = data.id;
      }

      // Delete existing fields and re-insert
      if (form) {
        await supabase.from("form_fields").delete().eq("form_id", formId);
      }

      const fieldRows = fields.map((f, i) => ({
        client_id: clientId,
        form_id: formId,
        field_label: f.field_label,
        field_key: f.field_key || f.field_label.toLowerCase().replace(/\s+/g, "_"),
        field_type: f.field_type,
        placeholder_text: f.placeholder_text || null,
        help_text: f.help_text || null,
        is_required: f.is_required,
        field_order: i,
        options_json: f.options_json || null,
      }));

      if (fieldRows.length > 0) {
        await supabase.from("form_fields").insert(fieldRows);
      }

      toast.success(form ? "Form updated" : "Form created");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{form ? "Edit Form" : "New Form"}</SheetTitle>
          <SheetDescription>Configure fields, labels, and types</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Form Name</Label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="mt-6">
          <Label className="mb-3 block">Fields</Label>
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="flex items-start gap-2 bg-secondary rounded-xl p-3 group">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0 mt-2" />
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={field.field_label}
                      onChange={(e) => updateField(field.id, "field_label", e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Label"
                    />
                    <Select
                      value={field.field_type}
                      onValueChange={(v) => updateField(field.id, "field_type", v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      value={field.placeholder_text || ""}
                      onChange={(e) => updateField(field.id, "placeholder_text", e.target.value)}
                      className="h-7 text-xs flex-1"
                      placeholder="Placeholder text"
                    />
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={field.is_required}
                        onCheckedChange={(v) => updateField(field.id, "is_required", v)}
                        className="scale-75"
                      />
                      <span className="text-[10px] text-muted-foreground">Required</span>
                    </div>
                  </div>
                  {(field.field_type === "dropdown" || field.field_type === "multi_select") && (
                    <Input
                      value={Array.isArray(field.options_json) ? field.options_json.join(", ") : ""}
                      onChange={(e) => updateField(field.id, "options_json", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                      className="h-7 text-xs"
                      placeholder="Options (comma-separated)"
                    />
                  )}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => removeField(field.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4 gap-1.5" onClick={addField}>
          <Plus className="h-4 w-4" /> Add Field
        </Button>

        <div className="mt-8 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Form"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
