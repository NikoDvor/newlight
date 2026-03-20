import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Package, DollarSign, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface RequestImplementationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendationName?: string;
  recommendationKey?: string;
  recommendationId?: string;
  packageId?: string;
  packageName?: string;
  projectedMonthly?: number;
  projectedAnnual?: number;
  defaultSetupFee?: number;
  defaultMonthlyFee?: number;
  deliverables?: string[];
  requestType?: string;
}

export function RequestImplementationModal({
  open, onOpenChange,
  recommendationName, recommendationKey, recommendationId,
  packageId, packageName,
  projectedMonthly = 0, projectedAnnual = 0,
  defaultSetupFee = 0, defaultMonthlyFee = 0,
  deliverables = [],
  requestType = "Recommended Service",
}: RequestImplementationModalProps) {
  const { activeClientId, user } = useWorkspace();
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!activeClientId) return;
    setSubmitting(true);

    const { data, error } = await supabase.from("implementation_requests").insert({
      client_id: activeClientId,
      requested_by_user_id: user?.id || null,
      recommendation_id: recommendationId || null,
      package_id: packageId || null,
      request_type: requestType,
      request_status: "New",
      urgency_level: urgency,
      request_message: message || null,
      recommendation_name: recommendationName || null,
      recommendation_key: recommendationKey || null,
      package_name: packageName || null,
      projected_monthly: projectedMonthly,
      projected_annual: projectedAnnual,
      default_setup_fee: defaultSetupFee,
      default_monthly_fee: defaultMonthlyFee,
    } as any).select().single();

    if (error) {
      toast.error("Could not submit request. Please try again.");
      setSubmitting(false);
      return;
    }

    // Create event
    await supabase.from("implementation_request_events").insert({
      client_id: activeClientId,
      request_id: data.id,
      event_type: "Request Created",
      event_summary: `${requestType}: ${recommendationName || packageName || "Service request"}`,
      created_by: user?.id || null,
    } as any);

    // Activity log
    await supabase.from("crm_activities").insert({
      client_id: activeClientId,
      activity_type: "implementation_requested",
      activity_note: `Implementation request: ${recommendationName || packageName || requestType}`,
    } as any);

    // Audit log
    await supabase.from("audit_logs").insert({
      client_id: activeClientId,
      action: "implementation_request_created",
      module: "monetization",
      user_id: user?.id || null,
      metadata: { request_id: data.id, service: recommendationName, package: packageName },
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => { setSubmitted(false); setMessage(""); setUrgency("Medium"); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Request Received!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our team will review your request and prepare a proposal. You'll see status updates right here in your dashboard.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-left">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">What happens next</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> We review your request</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> A customized proposal is prepared</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> You review and approve to get started</li>
              </ul>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Implementation</DialogTitle>
              <DialogDescription>
                {recommendationName || packageName
                  ? `Request setup for: ${recommendationName || packageName}`
                  : "Tell us what you'd like set up"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Service/package summary */}
              {(recommendationName || packageName) && (
                <div className="p-3 rounded-lg bg-primary/[0.04] border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    {packageName ? <Package className="h-4 w-4 text-primary" /> : <DollarSign className="h-4 w-4 text-primary" />}
                    <p className="text-sm font-semibold text-foreground">{recommendationName || packageName}</p>
                  </div>
                  {defaultMonthlyFee > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${defaultMonthlyFee.toLocaleString()}/mo
                      {defaultSetupFee > 0 && ` · $${defaultSetupFee.toLocaleString()} setup`}
                    </p>
                  )}
                  {deliverables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {deliverables.slice(0, 5).map((d, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px]">{d}</Badge>
                      ))}
                      {deliverables.length > 5 && (
                        <Badge variant="secondary" className="text-[9px]">+{deliverables.length - 5} more</Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Urgency */}
              <div>
                <Label className="text-xs">How urgent is this?</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low — No rush</SelectItem>
                    <SelectItem value="Medium">Medium — Within a week or two</SelectItem>
                    <SelectItem value="High">High — As soon as possible</SelectItem>
                    <SelectItem value="Critical">Critical — Urgent need</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <Label className="text-xs">Anything else we should know? (optional)</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="Tell us about your goals, timeline, or specific needs…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Request
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
