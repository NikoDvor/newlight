import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ActivateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    business_name: string;
    owner_email: string | null;
    owner_name: string | null;
    industry: string | null;
    onboarding_stage: string;
  } | null;
  onComplete: () => void;
}

/**
 * ActivateClientDialog – thin redirect wrapper.
 * When opened, navigates to the Master Activation Form for the given client.
 * This keeps the "Activate" button working everywhere while consolidating
 * all Stage 2 logic into the single master form.
 */
export function ActivateClientDialog({ open, client, onOpenChange }: ActivateClientDialogProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (open && client?.id) {
      onOpenChange(false);
      navigate(`/admin/clients/${client.id}/activate`);
    }
  }, [open, client?.id, navigate, onOpenChange]);

  return null;
}
