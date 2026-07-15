import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, HeartCrack, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";

type Step = "menu" | "reason" | "offer" | "confirm" | "done";

const REASONS = [
  { value: "cost", label: "Cost is too high" },
  { value: "not_results", label: "Not seeing results" },
  { value: "switching", label: "Switching providers" },
  { value: "closed", label: "Business closed" },
  { value: "other", label: "Other" },
];

export function ManageSubscriptionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const reset = () => {
    setStep("menu");
    setReason("");
    setNotes("");
  };

  const close = (v: boolean) => {
    if (!v) setTimeout(reset, 250);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        {step === "menu" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Manage Subscription
              </DialogTitle>
              <DialogDescription>Update your plan or request a cancellation.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <Button variant="outline" onClick={() => toast("Plan change requests coming soon.")}>
                Change Plan
              </Button>
              <Button variant="outline" onClick={() => toast("Update your payment method in settings.")}>
                Update Payment Method
              </Button>
              <Button variant="outline" onClick={() => toast("Invoice preferences saved.")}>
                Billing Preferences
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setStep("reason")}
              >
                Request Cancellation
              </Button>
            </div>
          </>
        )}

        {step === "reason" && (
          <>
            <DialogHeader>
              <DialogTitle>Tell us why you're leaving</DialogTitle>
              <DialogDescription>
                Your feedback helps us improve — and may unlock a win-back offer.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Reason for cancelling</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Additional notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything else we should know?"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("menu")}>
                Back
              </Button>
              <Button disabled={!reason} onClick={() => setStep("offer")}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "offer" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Sorry to see you go
              </DialogTitle>
              <DialogDescription>Before you cancel — here's a thank-you offer.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 my-2 space-y-2">
              <p className="text-sm font-semibold">Stay with us — get 20% off your next 2 months.</p>
              <p className="text-xs text-muted-foreground">
                Applied automatically to your upcoming invoices. Cancel anytime.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("confirm")}>
                No thanks, cancel
              </Button>
              <Button
                onClick={() => {
                  toast.success("Offer applied — welcome back!");
                  close(false);
                }}
              >
                Accept offer & stay
              </Button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HeartCrack className="h-5 w-5 text-destructive" /> Confirm cancellation
              </DialogTitle>
              <DialogDescription>
                Your account will remain active until the end of your current billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("offer")}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setStep("done");
                }}
              >
                Confirm cancellation
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Request received
              </DialogTitle>
              <DialogDescription>
                Your cancellation request has been submitted. Our team will reach out shortly.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-2">
              <Button onClick={() => close(false)}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
