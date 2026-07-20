import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck2, ClipboardCheck, GraduationCap, Radio, Rocket, ScrollText, Users } from "lucide-react";

type GlobalForm = {
  id: string;
  form_slug: string | null;
  form_name: string;
  description: string | null;
  external_route: string | null;
  sequence_number: number | null;
  form_type: string;
  is_active: boolean;
};

const ICONS: Record<string, any> = {
  "meeting-cancel": Radio,
  "discovery": Users,
  "get-started": ClipboardCheck,
  "pay-sign": ScrollText,
  "activation": Rocket,
};

// Launcher tiles inside Form 4 (Activation). These aren't separate forms — they
// consolidate the existing admin launchers into one entry point.
const LAUNCHERS = [
  { key: "master", label: "Master Activation Wizard", desc: "Full 16-step client activation.", route: "/admin/master-activation", icon: Rocket },
  { key: "onboarding", label: "Onboarding Command Center", desc: "Post-sale pipeline & handoff tracking.", route: "/admin/onboarding-command-center", icon: CalendarCheck2 },
  { key: "intake", label: "Client Intake (public)", desc: "Token-based intake form for clients.", route: "/intake", icon: ClipboardCheck },
  { key: "webinars", label: "Webinar Registrations", desc: "Manage webinar events & sign-ups.", route: "/admin/webinars", icon: GraduationCap },
];

export default function Activation() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<GlobalForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("forms")
        .select("id, form_slug, form_name, description, external_route, sequence_number, form_type, is_active")
        .eq("is_global", true)
        .order("sequence_number", { ascending: true, nullsFirst: true });
      setForms((data || []) as any);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Activation"
        description="Form 4 · Unified entry point for onboarding, intake, webinars, and master activation."
      />

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {LAUNCHERS.map((l) => {
          const Icon = l.icon;
          return (
            <Card key={l.key} className="p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold">{l.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{l.desc}</p>
                  <Button className="mt-3" size="sm" onClick={() => navigate(l.route)}>Open</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Registered NewLight Forms</h2>
            <p className="text-xs text-muted-foreground">The 5-form company structure (Form 0 utility + Forms 1-4).</p>
          </div>
          <Badge variant="outline">{forms.length} registered</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y divide-border">
            {forms.map((f) => {
              const Icon = (f.form_slug && ICONS[f.form_slug]) || ScrollText;
              return (
                <li key={f.id} className="py-3 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {f.sequence_number != null && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Form {f.sequence_number}
                        </span>
                      )}
                      <span className="text-sm font-medium truncate">{f.form_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                    {f.external_route && (
                      <code className="text-[10px] text-muted-foreground/80 mt-1 block truncate">{f.external_route}</code>
                    )}
                  </div>
                  <Badge variant={f.is_active ? "default" : "secondary"} className="text-[10px]">
                    {f.is_active ? "Active" : "Inactive"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
