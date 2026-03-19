import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Plus, GripVertical, Trash2, Eye, Users, Mail,
  Phone, MessageSquare, Settings2, ClipboardList, Copy, Calendar,
  Sparkles, ChevronRight, CheckCircle2, LayoutTemplate
} from "lucide-react";
import { motion } from "framer-motion";
import { FormEditorSheet } from "@/components/forms/FormEditorSheet";
import { FormSettingsSheet } from "@/components/forms/FormSettingsSheet";
import { FormSubmissionsView } from "@/components/forms/FormSubmissionsView";
import { FormTemplateDialog } from "@/components/forms/FormTemplateDialog";

export default function FormBuilder() {
  const { activeClientId } = useWorkspace();
  const [forms, setForms] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [editFields, setEditFields] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [fRes, sRes] = await Promise.all([
      supabase.from("forms").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("form_submissions").select("*").eq("client_id", activeClientId).order("submitted_at", { ascending: false }).limit(50),
    ]);
    setForms(fRes.data || []);
    setSubmissions(sRes.data || []);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEditor = async (form: any) => {
    setSelectedForm(form);
    const { data: fields } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", form.id)
      .order("field_order");
    setEditFields(fields || []);
    setEditorOpen(true);
  };

  const createFromTemplate = async (template: any) => {
    if (!activeClientId) return;
    const config = typeof template.template_config === "string"
      ? JSON.parse(template.template_config)
      : template.template_config;

    const { data: form, error } = await supabase
      .from("forms")
      .insert({
        client_id: activeClientId,
        form_name: template.template_name,
        form_type: template.form_type,
        description: `Created from ${template.template_name} template`,
      })
      .select()
      .single();

    if (error || !form) { toast.error("Failed to create form"); return; }

    const fields = (config.fields || []).map((f: any, i: number) => ({
      client_id: activeClientId,
      form_id: form.id,
      field_label: f.label,
      field_key: f.key,
      field_type: f.type,
      is_required: f.required || false,
      field_order: i,
      options_json: f.options ? f.options : null,
    }));

    if (fields.length > 0) {
      await supabase.from("form_fields").insert(fields);
    }

    toast.success("Form created from template");
    setTemplateDialogOpen(false);
    fetchData();
  };

  const duplicateForm = async (form: any) => {
    if (!activeClientId) return;
    const { data: newForm } = await supabase
      .from("forms")
      .insert({
        client_id: activeClientId,
        form_name: `${form.form_name} (Copy)`,
        form_type: form.form_type,
        description: form.description,
        linked_calendar_id: form.linked_calendar_id,
        linked_appointment_type_id: form.linked_appointment_type_id,
        create_contact_on_submit: form.create_contact_on_submit,
        booking_mode: form.booking_mode,
      })
      .select()
      .single();

    if (!newForm) { toast.error("Failed to duplicate"); return; }

    const { data: fields } = await supabase
      .from("form_fields")
      .select("*")
      .eq("form_id", form.id)
      .order("field_order");

    if (fields && fields.length > 0) {
      await supabase.from("form_fields").insert(
        fields.map((f: any) => ({
          client_id: activeClientId,
          form_id: newForm.id,
          field_label: f.field_label,
          field_key: f.field_key,
          field_type: f.field_type,
          placeholder_text: f.placeholder_text,
          help_text: f.help_text,
          is_required: f.is_required,
          field_order: f.field_order,
          options_json: f.options_json,
        }))
      );
    }

    toast.success("Form duplicated");
    fetchData();
  };

  const toggleFormActive = async (form: any) => {
    await supabase.from("forms").update({ is_active: !form.is_active }).eq("id", form.id);
    toast.success(form.is_active ? "Form deactivated" : "Form activated");
    fetchData();
  };

  const deleteForm = async (form: any) => {
    await supabase.from("form_fields").delete().eq("form_id", form.id);
    await supabase.from("forms").delete().eq("id", form.id);
    toast.success("Form deleted");
    fetchData();
  };

  const totalSubmissions = submissions.length;
  const activeForms = forms.filter((f) => f.is_active).length;

  const FORM_TYPE_LABELS: Record<string, string> = {
    contact: "Contact",
    booking: "Booking",
    intake: "Intake",
    estimate: "Estimate",
    support: "Support",
    custom: "Custom",
  };

  const emptyState = forms.length === 0 && !loading;

  return (
    <div>
      <PageHeader title="Forms & Leads" description="Build forms, capture leads, and track submissions">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setTemplateDialogOpen(true)}>
            <LayoutTemplate className="h-4 w-4" /> From Template
          </Button>
          <Button className="gap-1.5" onClick={() => {
            setSelectedForm(null);
            setEditFields([
              { id: `nf-1`, field_label: "Full Name", field_key: "full_name", field_type: "short_text", is_required: true, field_order: 0 },
              { id: `nf-2`, field_label: "Email", field_key: "email", field_type: "email", is_required: true, field_order: 1 },
            ]);
            setEditorOpen(true);
          }}>
            <Plus className="h-4 w-4" /> New Form
          </Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel
        title="Forms & Lead Capture"
        description="Create custom forms to capture leads, book appointments, and collect customer information. Forms connect directly to your CRM and calendar system."
        tips={[
          "Start with a template for the fastest setup",
          "Connect booking forms to your calendar for automatic scheduling",
          "Form submissions automatically create CRM contacts when enabled",
          "Use intake forms to collect detailed info before appointments",
        ]}
      />

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Forms" value={String(forms.length)} change={`${activeForms} active`} changeType="positive" icon={ClipboardList} />
        <MetricCard label="Total Submissions" value={String(totalSubmissions)} change="All time" changeType="positive" icon={FileText} />
        <MetricCard label="Active Forms" value={String(activeForms)} change="Accepting submissions" changeType="positive" icon={CheckCircle2} />
        <MetricCard label="Templates Available" value="5" change="Ready to use" changeType="positive" icon={LayoutTemplate} />
      </WidgetGrid>

      {emptyState ? (
        <motion.div
          className="mt-8 rounded-2xl border-2 border-dashed border-border p-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Forms Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first form to start capturing leads, booking appointments, and collecting customer information.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              <LayoutTemplate className="h-4 w-4 mr-2" /> Start From Template
            </Button>
            <Button onClick={() => {
              setSelectedForm(null);
              setEditFields([
                { id: `nf-1`, field_label: "Full Name", field_key: "full_name", field_type: "short_text", is_required: true, field_order: 0 },
                { id: `nf-2`, field_label: "Email", field_key: "email", field_type: "email", is_required: true, field_order: 1 },
              ]);
              setEditorOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Create Custom Form
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="mt-8">
          <Tabs defaultValue="forms">
            <TabsList className="bg-secondary h-10 rounded-lg">
              <TabsTrigger value="forms" className="rounded-md text-sm">Forms</TabsTrigger>
              <TabsTrigger value="submissions" className="rounded-md text-sm">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="forms" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <motion.div
                    key={form.id}
                    className="card-widget p-5 rounded-2xl"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold truncate pr-2">{form.form_name}</h3>
                      <Badge variant={form.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {form.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5 mb-3">
                      <Badge variant="outline" className="text-[10px]">{FORM_TYPE_LABELS[form.form_type] || form.form_type}</Badge>
                      {form.linked_calendar_id && <Badge variant="outline" className="text-[10px]"><Calendar className="h-2.5 w-2.5 mr-0.5" />Calendar</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{form.description || "No description"}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEditor(form)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setSelectedForm(form); setSettingsOpen(true); }}>
                          <Settings2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => duplicateForm(form)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={form.is_active} onCheckedChange={() => toggleFormActive(form)} className="scale-75" />
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => deleteForm(form)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="mt-4">
              <FormSubmissionsView submissions={submissions} forms={forms} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <FormEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        form={selectedForm}
        fields={editFields}
        setFields={setEditFields}
        clientId={activeClientId}
        onSaved={() => { fetchData(); setEditorOpen(false); }}
      />

      <FormSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        form={selectedForm}
        clientId={activeClientId}
        onSaved={() => { fetchData(); setSettingsOpen(false); }}
      />

      <FormTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelect={createFromTemplate}
      />
    </div>
  );
}
