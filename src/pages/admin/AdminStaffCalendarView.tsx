import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import BDRCalendar from "@/pages/employee/BDRCalendar";

export default function AdminStaffCalendarView() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const { isAdmin, rolesLoaded, isSessionLoading } = useWorkspace();
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin/staff-calendars" : "/staff-calendars";
  const [ownerName, setOwnerName] = useState<string>("");

  useEffect(() => {
    if (!isAdmin || !calendarId) return;
    (async () => {
      const { data: cal } = await (supabase as any)
        .from("bdr_calendars").select("user_id, name").eq("id", calendarId).maybeSingle();
      if (!cal) return;
      const { data: ep } = await (supabase as any)
        .from("employee_profiles").select("full_name").eq("user_id", cal.user_id).limit(1).maybeSingle();
      setOwnerName(ep?.full_name || cal.name || "");
    })();
  }, [isAdmin, calendarId]);

  if (isSessionLoading || !rolesLoaded) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-white/60">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/staff-calendars" replace />;
  if (!calendarId) return <Navigate to={base} replace />;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Link to={base} className="text-xs text-white/60 hover:text-white">← Staff Calendars</Link>
      <div className="rounded-lg border border-[hsl(211,96%,60%)]/30 bg-[hsl(211,96%,56%)]/10 px-3 py-2 text-sm text-[hsl(211,96%,80%)]">
        You are managing {ownerName || "this"}'s calendar
      </div>
      <BDRCalendar key={calendarId} calendarId={calendarId} />
    </div>
  );
}
