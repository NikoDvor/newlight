import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, ClipboardList, Headphones, DollarSign, Loader2 } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  contact: FileText,
  booking: Calendar,
  intake: ClipboardList,
  estimate: DollarSign,
  support: Headphones,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: any) => void;
}

export function FormTemplateDialog({ open, onOpenChange, onSelect }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("form_templates").select("*").eq("is_active", true).then(({ data }) => {
      setTemplates(data || []);
      setLoading(false);
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>Start with a pre-built form and customize it to your needs.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-3 mt-4">
            {templates.map((t) => {
              const Icon = TYPE_ICONS[t.form_type] || FileText;
              const config = typeof t.template_config === "string" ? JSON.parse(t.template_config) : t.template_config;
              const fieldCount = config?.fields?.length || 0;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold">{t.template_name}</h4>
                    <p className="text-xs text-muted-foreground">{fieldCount} fields · {t.form_type}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{t.form_type}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
