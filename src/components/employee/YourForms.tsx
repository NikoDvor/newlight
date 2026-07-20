import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, CalendarClock, ClipboardCheck, Radio, Rocket, ScrollText, Users } from "lucide-react";
import { Link } from "react-router-dom";

type GlobalForm = {
  id: string;
  form_slug: string | null;
  form_name: string;
  external_route: string | null;
  sequence_number: number | null;
  is_active: boolean;
  description: string | null;
};

const ICONS: Record<string, any> = {
  "meeting-cancel": Radio,
  "discovery": Users,
  "get-started": ClipboardCheck,
  "pay-sign": ScrollText,
  "activation": Rocket,
};

// Only these forms are relevant to a BDR (Form 1 & Form 2 in their day-to-day).
// The others are surfaced as read-only reference entries so the rep understands the pipeline.
const HIGHLIGHT_SLUGS = new Set(["discovery", "get-started"]);

function inferInternalRoute(slug: string | null): string | null {
  if (!slug) return null;
  switch (slug) {
    case "get-started":
      // Rep has no single leadId here; deep-link into MyLeads instead.
      return "/employee/leads";
    case "discovery":
      // Discovery is public — link to the employee dashboard calendar overview
      return "/employee/calendars";
    case "activation":
      return "/admin/master-activation";
    default:
      return null;
  }
}

export function YourForms() {
  const [forms, setForms] = useState<GlobalForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("forms")
        .select("id, form_slug, form_name, external_route, sequence_number, is_active, description")
        .eq("is_global", true)
        .order("sequence_number", { ascending: true, nullsFirst: true });
      setForms((data || []) as any);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Your Forms
        </h2>
        <Badge variant="outline" className="text-[10px]">NewLight 5-form structure</Badge>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {forms.map((f) => {
            const Icon = (f.form_slug && ICONS[f.form_slug]) || ScrollText;
            const highlighted = f.form_slug && HIGHLIGHT_SLUGS.has(f.form_slug);
            const internal = inferInternalRoute(f.form_slug);
            return (
              <li
                key={f.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  highlighted ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20"
                }`}
              >
                <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                  highlighted ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {f.sequence_number != null && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        highlighted ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}>Form {f.sequence_number}</span>
                    )}
                    <span className="text-xs font-medium truncate">{f.form_name}</span>
                  </div>
                  {f.external_route && (
                    <code className="text-[10px] text-muted-foreground/70 truncate block">{f.external_route}</code>
                  )}
                </div>
                {internal && (
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                    <Link to={internal}><ArrowUpRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
