import { useLocation } from "react-router-dom";

/** Training lives at /employee/training for salesmen and /admin/training-center for admins (preview + team view). */
export function useAcademyBase() {
  const { pathname } = useLocation();
  return pathname.startsWith("/admin") ? "/admin/training-center" : "/employee/training";
}
