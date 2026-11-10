import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Small "← Back" for form pages. Goes to the previous screen when there is one in this tab,
 * otherwise to `fallback` (e.g. the page was opened from a link).
 */
export function BackLink({ fallback, label = "Back", to, className = "" }: {
  fallback: string; label?: string; to?: string; className?: string;
}) {
  const navigate = useNavigate();
  const go = () => {
    if (to) return navigate(to);
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1); else navigate(fallback);
  };
  return (
    <button type="button" onClick={go}
      className={`inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors ${className}`}>
      <ArrowLeft className="h-4 w-4" />{label}
    </button>
  );
}
