import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Plus, GripVertical, Trash2, Eye, Users, Mail,
  Phone, Building2, MessageSquare, Settings2, ClipboardList
} from "lucide-react";
import { motion } from "framer-motion";

// --- Form builder types ---
interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required: boolean;
}

interface FormData {
  id: string;
  name: string;
  fields: FormField[];
  submissions: number;
  status: "Active" | "Inactive";
}

interface Submission {
  id: string;
  formName: string;
  leadName: string;
  email: string;
  time: string;
  pageSource: string;
  funnelSource: string;
}

const mockForms: FormData[] = [
  {
    id: "fm1", name: "Free Consultation Form", status: "Active", submissions: 263,
    fields: [
      { id: "f1", label: "Name", type: "text", required: true },
      { id: "f2", label: "Email", type: "email", required: true },
      { id: "f3", label: "Phone", type: "tel", required: true },
      { id: "f4", label: "Company", type: "text", required: false },
      { id: "f5", label: "Message", type: "textarea", required: false },
    ],
  },
  {
    id: "fm2", name: "SEO Audit Request", status: "Active", submissions: 145,
    fields: [
      { id: "f6", label: "Name", type: "text", required: true },
      { id: "f7", label: "Email", type: "email", required: true },
      { id: "f8", label: "Website URL", type: "text", required: true },
    ],
  },
  {
    id: "fm3", name: "Contact Page Form", status: "Active", submissions: 331,
    fields: [
      { id: "f9", label: "Full Name", type: "text", required: true },
      { id: "f10", label: "Email", type: "email", required: true },
      { id: "f11", label: "Phone", type: "tel", required: false },
      { id: "f12", label: "Subject", type: "text", required: true },
      { id: "f13", label: "Message", type: "textarea", required: true },
    ],
  },
];

const mockSubmissions: Submission[] = [
  { id: "sub1", formName: "Free Consultation Form", leadName: "Rachel Green", email: "rachel@fitlife.com", time: "2 hours ago", pageSource: "Free Consultation Page", funnelSource: "Consultation Funnel" },
  { id: "sub2", formName: "SEO Audit Request", leadName: "Tom Harris", email: "tom@localeats.com", time: "4 hours ago", pageSource: "SEO Landing Page", funnelSource: "SEO Audit Funnel" },
  { id: "sub3", formName: "Contact Page Form", leadName: "Anna Lee", email: "anna@freshbakes.com", time: "Yesterday", pageSource: "Contact Us", funnelSource: "—" },
  { id: "sub4", formName: "Free Consultation Form", leadName: "James Brooks", email: "james@brookscpa.com", time: "Yesterday", pageSource: "Free Consultation Page", funnelSource: "Consultation Funnel" },
  { id: "sub5", formName: "Contact Page Form", leadName: "Maria Santos", email: "maria@cleanpro.co", time: "2 days ago", pageSource: "Contact Us", funnelSource: "—" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: FileText },
  { value: "email", label: "Email", icon: Mail },
  { value: "tel", label: "Phone", icon: Phone },
  { value: "textarea", label: "Message", icon: MessageSquare },
  { value: "select", label: "Dropdown", icon: Settings2 },
];

export default function FormBuilder() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormData | null>(null);
  const [editFields, setEditFields] = useState<FormField[]>([]);

  const openEditor = (form: FormData) => {
    setSelectedForm(form);
    setEditFields([...form.fields]);
    setEditorOpen(true);
  };

  const addField = () => {
    setEditFields((prev) => [
      ...prev,
      { id: `nf-${Date.now()}`, label: "New Field", type: "text", required: false },
    ]);
  };

  const removeField = (id: string) => {
    setEditFields((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div>
      <PageHeader title="Forms & Leads" description="Build forms, capture leads, and track submissions">
        <Button className="gap-1.5" onClick={() => { setSelectedForm(null); setEditFields([{ id: "nf-1", label: "Name", type: "text", required: true }, { id: "nf-2", label: "Email", type: "email", required: true }]); setEditorOpen(true); }}>
          <Plus className="h-4 w-4" /> New Form
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Forms" value="3" change="3 active" changeType="positive" icon={ClipboardList} />
        <MetricCard label="Total Submissions" value="739" change="+31 this week" changeType="positive" icon={FileText} />
        <MetricCard label="Leads Captured" value="682" change="Auto-added to CRM" changeType="positive" icon={Users} />
        <MetricCard label="Avg. Conversion" value="8.4%" change="+1.2% vs last month" changeType="positive" icon={Eye} />
      </WidgetGrid>

      <div className="mt-8">
        <Tabs defaultValue="forms">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="forms" className="rounded-md text-sm">Forms</TabsTrigger>
            <TabsTrigger value="submissions" className="rounded-md text-sm">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="forms" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mockForms.map((form) => (
                <motion.div
                  key={form.id}
                  className="card-widget card-widget-clickable p-5 rounded-2xl cursor-pointer"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => openEditor(form)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold">{form.name}</h3>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">{form.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{form.fields.length} fields</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Submissions</span>
                    <span className="text-sm font-semibold tabular-nums">{form.submissions}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4">
            <DataCard title="Recent Submissions">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Lead</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Email</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Form</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Page</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Funnel</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockSubmissions.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="text-sm font-medium py-3 pr-4">{s.leadName}</td>
                        <td className="text-sm text-muted-foreground py-3 pr-4">{s.email}</td>
                        <td className="text-sm py-3 pr-4">{s.formName}</td>
                        <td className="text-xs text-muted-foreground py-3 pr-4">{s.pageSource}</td>
                        <td className="text-xs text-muted-foreground py-3 pr-4">{s.funnelSource}</td>
                        <td className="text-xs text-muted-foreground text-right py-3">{s.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Editor Sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedForm ? selectedForm.name : "New Form"}</SheetTitle>
            <SheetDescription>Add, remove, or reorder fields</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {editFields.map((field) => (
              <div key={field.id} className="flex items-center gap-3 bg-secondary rounded-xl p-3 group">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={field.label}
                    onChange={(e) => setEditFields((prev) => prev.map((f) => f.id === field.id ? { ...f, label: e.target.value } : f))}
                    className="h-8 text-sm"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v) => setEditFields((prev) => prev.map((f) => f.id === field.id ? { ...f, type: v as FormField["type"] } : f))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeField(field.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4 gap-1.5" onClick={addField}>
            <Plus className="h-4 w-4" /> Add Field
          </Button>

          <div className="mt-8 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => setEditorOpen(false)}>Save Form</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
