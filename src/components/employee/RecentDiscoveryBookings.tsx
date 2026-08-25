import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/* Matches the glass panel class used in GenericPipelineDashboard.tsx */
const GLASS =
  "border border-primary/20 bg-card/60 backdrop-blur-xl shadow-[0_0_0_1px_hsla(211,96%,60%,0.05),0_8px_32px_-12px_hsla(211,96%,40%,0.25),inset_0_1px_0_hsla(200,100%,80%,0.06)]";

type DiscoveryBooking = {
  eventId: string;
  leadId: string;
  businessName: string;
  ownerName: string | null;
  startsAt: string;
};

export function RecentDiscoveryBookings() {
  const { user } = useWorkspace();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<DiscoveryBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: events } = await (supabase as any)
        .from("bdr_calendar_events")
        .select("id, lead_id, starts_at")
        .eq("user_id", user.id)
        .eq("metadata->>meeting_kind", "discovery")
        .order("starts_at", { ascending: false })
        .limit(8);

      if (cancelled) return;

      const leadIds = (events || [])
        .map((e: any) => e.lead_id)
        .filter(Boolean);

      if (leadIds.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data: leads } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id, business_name, owner_name, crm_deal_id")
        .in("id", leadIds);

      if (cancelled) return;

      const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));

      const merged: DiscoveryBooking[] = (events || [])
        .map((e: any) => {
          const lead = leadMap.get(e.lead_id);
          if (!lead || lead.crm_deal_id) return null;
          return {
            eventId: e.id,
            leadId: e.lead_id,
            businessName: lead.business_name || "Unnamed lead",
            ownerName: lead.owner_name || null,
            startsAt: e.starts_at,
          };
        })
        .filter(Boolean);

      setBookings(merged);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || bookings.length === 0) return null;

  return (
    <Card className={`${GLASS} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          Just Booked — Ready for Close Prep
        </h2>
        <Badge variant="outline" className="text-[10px]">{bookings.length} pending</Badge>
      </div>
      <div className="space-y-2">
        {bookings.map((b) => (
          <div
            key={b.eventId}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{b.businessName}</p>
              {b.ownerName && (
                <p className="text-xs text-muted-foreground truncate">{b.ownerName}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(b.startsAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/employee/close-prep/${b.leadId}`)}
              className="shrink-0 text-xs h-8 bg-primary/90 hover:bg-primary"
            >
              Start Close Prep
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
