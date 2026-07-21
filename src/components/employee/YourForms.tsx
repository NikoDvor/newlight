import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingLinkCard } from "@/components/calendar/BookingLinkCard";
import { ensureBdrCalendar, type BdrCalendar } from "@/lib/bdrCalendar";
import { ClipboardCheck, ScrollText, Users } from "lucide-react";

export function YourForms() {
  const [cal, setCal] = useState<BdrCalendar | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://newlight-app.com";

  useEffect(() => {
    (async () => {
      const c = await ensureBdrCalendar();
      setCal(c);
    })();
  }, []);

  if (!cal) return null;
  const anyCal = cal as any;

  const forms = [
    {
      key: "form-1",
      label: "Form 1",
      icon: Users,
      name: "Discovery Form",
      badge: "Meeting 1",
      url: cal.booking_slug ? `${origin}/bdr/book/${cal.booking_slug}` : "",
      active: cal.booking_active !== false,
      hint: "Public discovery booking — share with prospects.",
    },
    {
      key: "form-2",
      label: "Form 2",
      icon: ClipboardCheck,
      name: "Close Prep",
      badge: "Meeting 2",
      url: "",
      active: true,
      hint: "Open Close Prep from any hot lead in My Leads to submit Form 2.",
    },
    {
      key: "form-3",
      label: "Form 3",
      icon: ScrollText,
      name: "Pay & Sign",
      badge: "Meeting 3",
      url: "",
      active: true,
      hint: "Auto-generated after Form 2 submits — sent to the client.",
    },
  ];

  return (
    <Card className="border border-primary/20 bg-card/60 backdrop-blur-xl shadow-[0_0_0_1px_hsla(211,96%,60%,0.05),0_8px_32px_-12px_hsla(211,96%,40%,0.25),inset_0_1px_0_hsla(200,100%,80%,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Your Forms</h2>
        <Badge variant="outline" className="text-[10px]">NewLight 5-form structure</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {forms.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="relative">
              <BookingLinkCard name={`${f.label} · ${f.name}`} badge={f.badge} url={f.url} />
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Icon className="h-3 w-3" />
                <span className="truncate">{f.hint}</span>
              </div>
              {!f.active && (
                <span className="absolute top-3 right-3 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 border border-amber-500/30">
                  Paused
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
