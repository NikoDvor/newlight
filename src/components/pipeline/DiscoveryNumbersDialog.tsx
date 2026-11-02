import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * "Numbers" buttons (My Leads, Calendar, customer profile, admin results) now open the
 * Calculator for that lead — one script + calculator, numbers saved per client.
 * Same props as the old dialog so every caller keeps working.
 */
export default function DiscoveryNumbersDialog({
  lead, onClose,
}: { lead: { id: string; business_name?: string | null } | null; eventId?: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!lead) return;
    const base = loc.pathname.startsWith("/admin") ? "/admin/calculator" : "/employee/calculator";
    onClose();
    navigate(`${base}/${lead.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);
  return null;
}
