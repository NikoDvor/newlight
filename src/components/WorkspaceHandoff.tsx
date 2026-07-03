import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, ExternalLink, ArrowRight, Smartphone, Share,
  Copy, Check, Download, AlertTriangle, Mail, RefreshCw, MessageSquare
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkspaceHandoffProps {
  businessName: string;
  workspaceUrl: string;
  workspaceSlug: string;
  setupLink?: string | null;
  inviteSent?: boolean;
  alreadyExists?: boolean;
  inviteWarning?: string | null;
  ownerEmail?: string;
  ownerPhone?: string | null;
  clientId?: string;
  inviteStatus?: string | null;
  emailDeliveryStatus?: string | null;
  smsDeliveryStatus?: string | null;
  preferredContactMethod?: string | null;
  smsConsent?: boolean;
}

export function WorkspaceHandoff({
  businessName, workspaceUrl, workspaceSlug, setupLink, inviteSent, alreadyExists,
  inviteWarning, ownerEmail, ownerPhone, clientId, inviteStatus, emailDeliveryStatus,
  smsDeliveryStatus, preferredContactMethod, smsConsent,
}: WorkspaceHandoffProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSetup, setCopiedSetup] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendingSms, setResendingSms] = useState(false);

  const fullUrl = `${window.location.origin}/w/${workspaceSlug}`;
  const continueSetupUrl = `${window.location.origin}/auth?redirect=/setup-center`;

  const copyLink = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleResendInvite = async () => {
    if (!ownerEmail || !clientId) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: ownerEmail, role: "client_owner", client_id: clientId },
      });
      if (error) {
        toast.error("Invite resend failed. Use the workspace link instead.");
      } else if (data?.invite_email_sent) {
        toast.success("Invite email resent!");
      } else if (data?.setup_link) {
        navigator.clipboard.writeText(data.setup_link);
        toast.success("Setup link copied to clipboard!");
      } else if (data?.already_existed) {
        toast.success("User already has access. They can sign in directly.");
      }
    } catch {
      toast.error("Resend failed. Share the workspace link manually.");
    }
    setResending(false);
  };

  const handleResendSms = async () => {
    if (!clientId || !workspaceSlug) return;
    setResendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-handoff-message", {
        body: {
          client_id: clientId,
          business_name: businessName,
          owner_email: ownerEmail || "",
          owner_phone: ownerPhone || null,
          preferred_contact_method: "sms",
          sms_consent: true,
          workspace_slug: workspaceSlug,
          base_url: window.location.origin,
        },
      });
      if (error) {
        toast.error("SMS resend failed.");
      } else if (data?.sms_status === "sent") {
        toast.success("SMS resent!");
      } else if (data?.sms_status === "not_configured") {
        toast.error("SMS provider not configured.");
      } else {
        toast.error(data?.sms_error || "SMS could not be sent.");
      }
    } catch {
      toast.error("SMS resend failed.");
    }
    setResendingSms(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const hasInviteIssue = !!inviteWarning && !inviteSent && !alreadyExists;
  const canResendSms = !!(ownerPhone && clientId && smsConsent && (preferredContactMethod === "sms" || preferredContactMethod === "both"));

  return (
    <div className="min-h-screen bg-[hsl(215,35%,8%)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        {/* Success header */}
        <div className="text-center mb-6">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            hasInviteIssue ? "bg-[hsl(0,62%,55%)]/20" : "bg-[hsl(142,72%,42%)]/20"
          }`}>
            {hasInviteIssue ? (
              <AlertTriangle className="h-8 w-8 text-[hsl(0,62%,55%)]" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-[hsl(142,72%,42%)]" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {alreadyExists ? "Your Workspace is Ready!" : `${businessName} is Live!`}
          </h1>
          <p className="text-sm text-white/60">
            {hasInviteIssue
              ? "Your workspace was created successfully. The invite email could not be sent automatically — use the links below to access your workspace."
              : inviteSent
              ? "We've sent login instructions to your email. Check your inbox (and spam folder)."
              : alreadyExists
              ? "Your account has been linked to this workspace. Sign in to access it."
              : "Your workspace has been created and is ready to use."}
          </p>
          {/* Delivery status badges */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {inviteStatus && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.05] text-white/55 border border-white/10">
                {inviteStatus === "invite_sent" && <Mail className="h-3 w-3" />}
                {inviteStatus === "invite_failed" && <AlertTriangle className="h-3 w-3" />}
                {inviteStatus === "access_link_generated" && <CheckCircle2 className="h-3 w-3" />}
                Invite: {inviteStatus.replace(/_/g, " ")}
              </span>
            )}
            {emailDeliveryStatus && emailDeliveryStatus !== "not_attempted" && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                emailDeliveryStatus === "sent" ? "bg-[hsl(142,72%,42%)]/20 text-[hsl(142,72%,42%)] border border-[hsl(142,72%,42%)]/20" :
                emailDeliveryStatus === "failed" ? "bg-[hsl(0,62%,55%)]/20 text-[hsl(0,62%,55%)] border border-[hsl(0,62%,55%)]/20" :
                "bg-white/[0.05] text-white/55 border border-white/10"
              }`}>
                <Mail className="h-3 w-3" />
                Email: {emailDeliveryStatus === "not_configured" ? "not configured" : emailDeliveryStatus}
              </span>
            )}
            {smsDeliveryStatus && smsDeliveryStatus !== "not_attempted" && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                smsDeliveryStatus === "sent" ? "bg-[hsl(142,72%,42%)]/20 text-[hsl(142,72%,42%)] border border-[hsl(142,72%,42%)]/20" :
                smsDeliveryStatus === "failed" ? "bg-[hsl(0,62%,55%)]/20 text-[hsl(0,62%,55%)] border border-[hsl(0,62%,55%)]/20" :
                "bg-white/[0.05] text-white/55 border border-white/10"
              }`}>
                <MessageSquare className="h-3 w-3" />
                SMS: {smsDeliveryStatus === "not_configured" ? "not configured" : smsDeliveryStatus}
              </span>
            )}
          </div>
        </div>

        {/* Invite issue banner */}
        {hasInviteIssue && (
          <div className="rounded-xl border border-[hsl(0,62%,55%)]/20 bg-[hsl(0,62%,55%)]/10 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-[hsl(0,62%,55%)] mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-white mb-1">Invite email was not sent</p>
                <p className="text-[11px] text-white/55 mb-3">
                  You can still access your workspace using the links below, or we can try sending the invite again.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ownerEmail && clientId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResendInvite}
                      disabled={resending}
                      className="gap-1.5 text-xs h-8 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/20"
                    >
                      {resending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                      {resending ? "Sending…" : "Resend Invite"}
                    </Button>
                  )}
                  {canResendSms && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResendSms}
                      disabled={resendingSms}
                      className="gap-1.5 text-xs h-8 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/20"
                    >
                      {resendingSms ? <RefreshCw className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                      {resendingSms ? "Sending…" : "Resend SMS"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resend actions when no invite issue but SMS available */}
        {!hasInviteIssue && canResendSms && smsDeliveryStatus !== "sent" && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/55">SMS not delivered?</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResendSms}
                disabled={resendingSms}
                className="gap-1.5 text-xs h-7 text-white/75 hover:bg-white/10 hover:text-white"
              >
                {resendingSms ? <RefreshCw className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                {resendingSms ? "Sending…" : "Resend SMS"}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3 mb-4">
          <a href={fullUrl}>
            <Button className="w-full gap-2 h-12 text-sm bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]" size="lg">
              <ExternalLink className="h-4 w-4" />
              Open Workspace
            </Button>
          </a>

          <a href={continueSetupUrl}>
            <Button variant="outline" className="w-full gap-2 h-12 text-sm mt-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/20" size="lg">
              <ArrowRight className="h-4 w-4" />
              Continue Setup
            </Button>
          </a>
        </div>

        {/* Workspace link */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
          <p className="text-xs text-white/55 mb-2 font-medium">Your workspace link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-white bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 truncate">
              {fullUrl}
            </code>
            <Button size="sm" variant="ghost" onClick={() => copyLink(fullUrl, setCopied)} className="shrink-0 gap-1.5 text-white/75 hover:bg-white/10 hover:text-white">
              {copied ? <Check className="h-3.5 w-3.5 text-[hsl(142,72%,42%)]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {/* Continue Setup link */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-white/55 mb-2 font-medium">Continue Setup link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-white bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 truncate">
                {continueSetupUrl}
              </code>
              <Button size="sm" variant="ghost" onClick={() => copyLink(continueSetupUrl, setCopiedSetup)} className="shrink-0 gap-1.5 text-white/75 hover:bg-white/10 hover:text-white">
                {copiedSetup ? <Check className="h-3.5 w-3.5 text-[hsl(142,72%,42%)]" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSetup ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        {/* Install app prompt */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <button
            onClick={() => setShowInstall(!showInstall)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[hsl(211,96%,56%)]/20 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-[hsl(211,96%,68%)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Install as App</p>
                <p className="text-[11px] text-white/55">Add to your home screen for the full experience</p>
              </div>
            </div>
            <ArrowRight className={`h-4 w-4 text-white/45 transition-transform ${showInstall ? "rotate-90" : ""}`} />
          </button>

          {showInstall && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-4 pt-4 border-t border-white/10 space-y-3"
            >
              {isIOS ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white">On iPhone / iPad:</p>
                  {[
                    "Open this link in Safari",
                    "Tap the Share button (square with arrow)",
                    'Scroll down and tap "Add to Home Screen"',
                    'Tap "Add" to install',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-[hsl(211,96%,56%)]/20 flex items-center justify-center text-[10px] font-bold text-[hsl(211,96%,68%)] shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-xs text-white/55">{step}</span>
                    </div>
                  ))}
                </div>
              ) : isAndroid ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white">On Android:</p>
                  {[
                    "Open this link in Chrome",
                    'Tap the menu (⋮) in the top right',
                    'Tap "Add to Home screen" or "Install app"',
                    "Confirm to install",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-[hsl(211,96%,56%)]/20 flex items-center justify-center text-[10px] font-bold text-[hsl(211,96%,68%)] shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-xs text-white/55">{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white">Install on any device:</p>
                  <p className="text-xs text-white/55">
                    Open <span className="font-mono text-white">{fullUrl}</span> on your phone and use your browser's "Add to Home Screen" or "Install App" option.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/55 mt-1">
                    <Download className="h-3.5 w-3.5" />
                    <span>On desktop Chrome, look for the install icon in the address bar.</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Setup link for manual invite flow */}
        {setupLink && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/55 mb-1">Setup link (share with the client):</p>
            <code className="text-[11px] text-white break-all">{setupLink}</code>
          </div>
        )}

      </motion.div>
    </div>
  );
}
