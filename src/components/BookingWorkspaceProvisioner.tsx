import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Smartphone, Download, CheckCircle2, Loader2, Copy, ExternalLink,
  Sparkles, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface BookingWorkspaceProvisionerProps {
  appointmentId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  industry?: string;
  location?: string;
  clientId: string;
}

type ProvisionState = "idle" | "provisioning" | "done" | "error";

export function BookingWorkspaceProvisioner({
  appointmentId,
  contactName,
  contactEmail,
  contactPhone,
  companyName,
  logoUrl,
  primaryColor,
  secondaryColor,
  industry,
  location,
  clientId,
}: BookingWorkspaceProvisionerProps) {
  const [state, setState] = useState<ProvisionState>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const provision = async () => {
    setState("provisioning");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "provision-from-booking",
        {
          body: {
            business_name: companyName || contactName,
            contact_name: contactName,
            contact_email: contactEmail,
            contact_phone: contactPhone || null,
            company_name: companyName || null,
            logo_url: logoUrl || null,
            primary_color: primaryColor || "#3B82F6",
            secondary_color: secondaryColor || "#06B6D4",
            industry: industry || null,
            location: location || null,
            appointment_id: appointmentId,
            calendar_client_id: clientId,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setState("done");
    } catch (err: any) {
      setError(err.message);
      setState("error");
    }
  };

  const copyLink = () => {
    if (result?.workspace_url) {
      navigator.clipboard.writeText(result.workspace_url);
      toast.success("Workspace link copied!");
    }
  };

  if (state === "idle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 p-4 rounded-xl border"
        style={{
          background: `${primaryColor || "hsl(211,96%,56%)"}08`,
          borderColor: `${primaryColor || "hsl(211,96%,56%)"}15`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ background: `${primaryColor || "hsl(211,96%,56%)"}15` }}
          >
            <Sparkles className="h-4.5 w-4.5" style={{ color: primaryColor || "hsl(211,96%,56%)" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Create Your Workspace</p>
            <p className="text-[11px] text-muted-foreground">
              Get instant access to your personalized business dashboard
            </p>
          </div>
        </div>
        <Button
          onClick={provision}
          className="w-full gap-2 text-white"
          style={{
            background: `linear-gradient(135deg, ${primaryColor || "#3B82F6"}, ${secondaryColor || "#06B6D4"})`,
          }}
        >
          <Smartphone className="h-4 w-4" />
          Set Up My Workspace
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    );
  }

  if (state === "provisioning") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-4 p-5 rounded-xl border text-center"
        style={{
          background: `${primaryColor || "hsl(211,96%,56%)"}06`,
          borderColor: `${primaryColor || "hsl(211,96%,56%)"}12`,
        }}
      >
        <Loader2
          className="h-8 w-8 mx-auto animate-spin mb-3"
          style={{ color: primaryColor || "hsl(211,96%,56%)" }}
        />
        <p className="text-sm font-semibold text-foreground">Setting up your workspace…</p>
        <p className="text-xs text-muted-foreground mt-1">
          Creating your personalized business dashboard
        </p>
      </motion.div>
    );
  }

  if (state === "error") {
    return (
      <div className="mt-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
        <p className="text-sm text-destructive font-medium">
          Setup encountered an issue. Please contact us for assistance.
        </p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  // Done state
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 p-5 rounded-xl border space-y-4"
      style={{
        background: `${primaryColor || "hsl(211,96%,56%)"}06`,
        borderColor: `${primaryColor || "hsl(211,96%,56%)"}15`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: `${primaryColor || "#3B82F6"}15` }}
        >
          <CheckCircle2
            className="h-5 w-5"
            style={{ color: primaryColor || "#3B82F6" }}
          />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {result?.already_exists ? "Workspace Ready!" : "Workspace Created!"}
          </p>
          <p className="text-xs text-muted-foreground">
            {result?.invite_sent
              ? "Check your email for login instructions"
              : "Your personalized dashboard is ready"}
          </p>
        </div>
      </div>

      {result?.workspace_url && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border">
            <span className="text-xs font-mono text-foreground truncate flex-1">
              {result.workspace_url}
            </span>
            <button
              onClick={copyLink}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={result.workspace_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs h-9"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Workspace
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs h-9"
              onClick={copyLink}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </Button>
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-2.5 p-3 rounded-lg"
        style={{
          background: `${primaryColor || "#3B82F6"}08`,
          border: `1px solid ${primaryColor || "#3B82F6"}12`,
        }}
      >
        <Download
          className="h-4 w-4 shrink-0"
          style={{ color: primaryColor || "#3B82F6" }}
        />
        <p className="text-[11px] text-muted-foreground">
          <strong className="text-foreground">Install as App:</strong> Open the link on
          your phone and tap "Add to Home Screen" for the full app experience.
        </p>
      </div>
    </motion.div>
  );
}
