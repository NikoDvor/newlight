import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, ExternalLink, ArrowRight, Smartphone, Share,
  Copy, Check, Download
} from "lucide-react";
import { useState } from "react";

interface WorkspaceHandoffProps {
  businessName: string;
  workspaceUrl: string;
  workspaceSlug: string;
  setupLink?: string | null;
  inviteSent?: boolean;
  alreadyExists?: boolean;
}

export function WorkspaceHandoff({
  businessName, workspaceUrl, workspaceSlug, setupLink, inviteSent, alreadyExists,
}: WorkspaceHandoffProps) {
  const [copied, setCopied] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const fullUrl = `${window.location.origin}/w/${workspaceSlug}`;
  const continueSetupUrl = `${window.location.origin}/auth?redirect=/setup-center`;

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        {/* Success header */}
        <div className="text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {alreadyExists ? "Your Workspace is Ready!" : `${businessName} is Live!`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {inviteSent
              ? "Check your email for login instructions."
              : "Your workspace has been created and is ready to use."}
          </p>
        </div>

        {/* Action buttons */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3 mb-4">
          <a href={fullUrl}>
            <Button className="w-full gap-2 h-12 text-sm" size="lg">
              <ExternalLink className="h-4 w-4" />
              Open Workspace
            </Button>
          </a>

          <a href={continueSetupUrl}>
            <Button variant="outline" className="w-full gap-2 h-12 text-sm mt-2" size="lg">
              <ArrowRight className="h-4 w-4" />
              Continue Setup
            </Button>
          </a>
        </div>

        {/* Workspace link */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm mb-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Your workspace link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-foreground bg-muted/50 rounded-lg px-3 py-2 truncate">
              {fullUrl}
            </code>
            <Button size="sm" variant="ghost" onClick={copyLink} className="shrink-0 gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Install app prompt */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <button
            onClick={() => setShowInstall(!showInstall)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Install as App</p>
                <p className="text-[11px] text-muted-foreground">Add to your home screen for the full experience</p>
              </div>
            </div>
            <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${showInstall ? "rotate-90" : ""}`} />
          </button>

          {showInstall && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-4 pt-4 border-t space-y-3"
            >
              {isIOS ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">On iPhone / iPad:</p>
                  {[
                    "Open this link in Safari",
                    "Tap the Share button (square with arrow)",
                    'Scroll down and tap "Add to Home Screen"',
                    'Tap "Add" to install',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              ) : isAndroid ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">On Android:</p>
                  {[
                    "Open this link in Chrome",
                    'Tap the menu (⋮) in the top right',
                    'Tap "Add to Home screen" or "Install app"',
                    "Confirm to install",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Install on any device:</p>
                  <p className="text-xs text-muted-foreground">
                    Open <span className="font-mono text-foreground">{fullUrl}</span> on your phone and use your browser's "Add to Home Screen" or "Install App" option.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
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
          <div className="mt-4 rounded-xl border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">Setup link (share with the client):</p>
            <code className="text-[11px] text-foreground break-all">{setupLink}</code>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Powered by <span className="font-semibold">NewLight</span>
        </p>
      </motion.div>
    </div>
  );
}
