import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackArrowProps {
  to?: string;
  label?: string;
  dark?: boolean;
}

export function BackArrow({ to, label = "Back", dark = true }: BackArrowProps) {
  const navigate = useNavigate();
  const handleClick = () => to ? navigate(to) : navigate(-1);

  return (
    <button
      onClick={handleClick}
      className={`text-xs flex items-center gap-1.5 mb-2 transition-colors ${
        dark
          ? "text-white/40 hover:text-white/70"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
