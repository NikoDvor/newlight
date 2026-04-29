import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, XCircle, Calendar, CheckCircle } from "lucide-react";
import newlightLogo from "@/assets/newlight-logo.jpg";

export default function MeetingCancel() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [wantReschedule, setWantReschedule] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    supabase
      .from("meeting_status")
      .select("*, prospects(*)")
      .eq("cancellation_token", token)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) setError("Meeting not found or link expired.");
        else if (data.status === "cancelled") setError("This meeting has already been cancelled.");
        else setMeeting(data);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-meeting-reminders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel_meeting",
            cancellation_token: token,
            reason,
            reschedule: wantReschedule,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
      toast.success(wantReschedule ? "Reschedule request submitted" : "Meeting cancelled");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    background: "hsla(218,35%,14%,.8)",
    backdropFilter: "blur(24px)",
    border: "1px solid hsla(211,96%,60%,.12)",
    boxShadow: "0 20px 60px -15px hsla(211,96%,56%,.2)",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}>
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}>
        <div className="max-w-md w-full rounded-2xl p-10 text-center" style={cardStyle}>
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Process</h2>
          <p className="text-sm text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}>
        <motion.div className="max-w-md w-full rounded-2xl p-10 text-center" style={cardStyle}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--nl-sky))]" />
          <h2 className="text-xl font-bold text-white mb-2">
            {wantReschedule ? "Reschedule Request Submitted" : "Meeting Cancelled"}
          </h2>
          <p className="text-sm text-white/50">
            {wantReschedule
              ? "We'll reach out with a new time that works for you."
              : "Your meeting has been cancelled. If you'd like to rebook, visit our website."}
          </p>
        </motion.div>
      </div>
    );
  }

  const prospect = meeting?.prospects;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
    }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{
          top: "-150px", right: "-100px",
          background: "radial-gradient(circle, hsla(211,96%,62%,.12), transparent 70%)", filter: "blur(80px)",
        }} />
      </div>

      <motion.div className="max-w-md w-full rounded-2xl p-8 relative z-10" style={cardStyle}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-6">
          <img src={newlightLogo} alt="NewLight" className="h-10 w-auto object-contain" style={{ filter: "drop-shadow(0 4px 12px hsla(211,96%,56%,.3))" }} />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Manage Your Meeting</h2>
        <p className="text-sm text-white/50 mb-6">
          {prospect?.business_name} · {meeting?.meeting_date
            ? new Date(meeting.meeting_date).toLocaleString("en-US", {
                weekday: "short", month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit", hour12: true,
              })
            : "Date TBD"}
        </p>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant={!wantReschedule ? "default" : "outline"}
              className={!wantReschedule
                ? "flex-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                : "flex-1 border-white/10 text-white/60 hover:bg-white/10"}
              onClick={() => setWantReschedule(false)}
            >
              <XCircle className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              variant={wantReschedule ? "default" : "outline"}
              className={wantReschedule
                ? "flex-1 bg-[hsla(211,96%,60%,.2)] text-[hsl(var(--nl-sky))] hover:bg-[hsla(211,96%,60%,.3)] border border-[hsla(211,96%,60%,.3)]"
                : "flex-1 border-white/10 text-white/60 hover:bg-white/10"}
              onClick={() => setWantReschedule(true)}
            >
              <Calendar className="h-4 w-4 mr-1" /> Reschedule
            </Button>
          </div>

          <div>
            <Label className="text-xs text-white/60">
              {wantReschedule ? "Any preferred times or notes?" : "Reason for cancellation (optional)"}
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={wantReschedule ? "I'd prefer a morning time next week..." : "e.g. Schedule conflict"}
              className="mt-1 bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-11 text-sm font-semibold text-white border-0"
            style={{
              background: wantReschedule
                ? "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))"
                : "linear-gradient(135deg, hsl(0 70% 50%), hsl(0 60% 45%))",
              boxShadow: wantReschedule
                ? "0 4px 20px -4px hsla(211,96%,56%,.4)"
                : "0 4px 20px -4px hsla(0,70%,50%,.4)",
            }}
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : wantReschedule ? "Request Reschedule" : "Confirm Cancellation"}
          </Button>
        </div>

      </motion.div>
    </div>
  );
}
