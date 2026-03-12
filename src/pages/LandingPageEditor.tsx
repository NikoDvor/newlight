import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Monitor, Smartphone, Eye, Upload, GripVertical, Pencil,
  Trash2, Plus, Type, Image, Star, CheckCircle, DollarSign,
  HelpCircle, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

interface Section {
  id: string;
  type: string;
  content: string;
}

const SECTION_PALETTE = [
  { name: "Hero Section", icon: Sparkles },
  { name: "Features", icon: CheckCircle },
  { name: "Benefits", icon: Star },
  { name: "Testimonials", icon: Star },
  { name: "Pricing Table", icon: DollarSign },
  { name: "FAQ", icon: HelpCircle },
  { name: "Text Block", icon: Type },
  { name: "Image Block", icon: Image },
];

export default function LandingPageEditor() {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [sections, setSections] = useState<Section[]>([
    { id: "hero", type: "Hero Section", content: "Grow Your Business with Expert Marketing" },
    { id: "sub", type: "Text Block", content: "We help local businesses dominate their market with data-driven strategies." },
    { id: "feat", type: "Features", content: "SEO · PPC · Social Media · Web Design · CRM" },
    { id: "test", type: "Testimonials", content: "\"NewLight doubled our leads in 60 days.\" — Sarah J., TechCorp" },
    { id: "bene", type: "Benefits", content: "More Leads · Higher Conversions · Better ROI · Full Transparency" },
    { id: "price", type: "Pricing Table", content: "Starter $997/mo · Growth $1,997/mo · Scale $3,497/mo" },
    { id: "faq", type: "FAQ", content: "How long until I see results? What's included? Can I cancel anytime?" },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const addSection = (type: string) => {
    setSections((prev) => [...prev, { id: `s-${Date.now()}`, type, content: `New ${type}` }]);
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateContent = (id: string, content: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)));
  };

  return (
    <div>
      <PageHeader title="Landing Page Editor" description="Design high-converting landing pages">
        <div className="flex gap-1.5">
          <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")} className="gap-1">
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </Button>
          <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")} className="gap-1">
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </Button>
          <Button size="sm" variant="outline" className="gap-1"><Eye className="h-3.5 w-3.5" /> Preview</Button>
          <Button size="sm" className="gap-1"><Upload className="h-3.5 w-3.5" /> Publish</Button>
        </div>
      </PageHeader>

      <div className="flex gap-6">
        {/* Canvas */}
        <div className={`flex-1 ${previewMode === "mobile" ? "max-w-[414px] mx-auto" : ""}`}>
          <div className="space-y-3">
            {sections.map((section) => (
              <motion.div
                key={section.id}
                layout
                className="bg-card rounded-2xl border border-border p-5 group relative"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{section.type}</p>
                    {editingId === section.id ? (
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateContent(section.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="text-sm min-h-[60px]"
                      />
                    ) : (
                      <p
                        className={`text-sm cursor-pointer hover:bg-secondary rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors ${
                          section.type === "Hero Section" ? "text-lg font-bold" : ""
                        }`}
                        onClick={() => setEditingId(section.id)}
                      >
                        {section.content}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(section.id)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeSection(section.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add section area */}
          <div className="mt-6 border-2 border-dashed border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">Add Content Block</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SECTION_PALETTE.map((s) => (
                <button
                  key={s.name}
                  onClick={() => addSection(s.name)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary transition-colors"
                >
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
