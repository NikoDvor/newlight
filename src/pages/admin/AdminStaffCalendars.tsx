import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminStaffCalendars() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/admin/team", { replace: true, state: { tab: "calendars" } });
  }, [navigate]);
  return null;
}
