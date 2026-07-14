import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, ArrowRight, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Placeholder / mock values — no real billing wiring yet
const MOCK_MONTHLY = 497;
const ANNUAL_DISCOUNT = 0.30;

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function AnnualSwitchCard() {
  const [step, setStep] = useState<"idle" | "confirm" | "processing" | "coming-soon">("idle");
  const [pwd, setPwd] = useState("");

  const twelveMoTotal = MOCK_MONTHLY * 12;
  const discountedAnnual = twelveMoTotal * (1 - ANNUAL_DISCOUNT);
  const saved = twelveMoTotal - discountedAnnual;

  const handleConfirm = () => {
    if (!pwd) {
      toast.error("Please enter your password to continue.");
      return;
    }
    setStep("processing");
    setTimeout(() => setStep("coming-soon"), 900);
  };

  const closeModal = () => {
    setStep("idle");
    setPwd("");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl p-6 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, hsla(211,96%,56%,0.08), hsla(197,92%,68%,0.04))",
          border: "1px solid hsla(211,96%,62%,0.22)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(211,96%,62%,0.18), transparent 70%)", filter: "blur(24px)" }} />

        <div className="relative flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ background: "hsla(211,96%,56%,0.15)" }}>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Switch to Annual & Save</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ background: "hsla(152,60%,44%,0.14)", color: "hsl(152,60%,54%)" }}>
            Save 30%
          </span>
        </div>

        <p className="relative text-xs text-muted-foreground leading-relaxed mb-5">
          Pay for your next 12 months upfront and save 30% compared to paying monthly.
        </p>

        <div className="relative grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl p-3" style={{ background: "hsla(0,0%,100%,0.03)", border: "1px solid hsla(0,0%,100%,0.06)" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current Monthly</p>
            <p className="text-lg font-bold tabular-nums">{fmt(MOCK_MONTHLY)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "hsla(0,0%,100%,0.03)", border: "1px solid hsla(0,0%,100%,0.06)" }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">12-Month Total</p>
            <p className="text-lg font-bold tabular-nums line-through text-muted-foreground">{fmt(twelveMoTotal)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "hsla(211,96%,56%,0.08)", border: "1px solid hsla(211,96%,62%,0.22)" }}>
            <p className="text-[10px] uppercase tracking-wider text-primary/80 mb-1">Annual (30% off)</p>
            <p className="text-lg font-bold tabular-nums text-primary">{fmt(discountedAnnual)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "hsla(152,60%,44%,0.08)", border: "1px solid hsla(152,60%,44%,0.22)" }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "hsl(152,60%,54%)" }}>You Save</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: "hsl(152,60%,54%)" }}>{fmt(saved)}</p>
          </div>
        </div>

        <Button className="w-full btn-gradient" onClick={() => setStep("confirm")}>
          Switch to Annual <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>

      <Dialog open={step !== "idle"} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="sm:max-w-md">
          {step === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Confirm Your Password
                </DialogTitle>
                <DialogDescription>
                  For your security, please re-enter your account password to authorize switching to annual billing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="pwd-confirm">Password</Label>
                <Input
                  id="pwd-confirm" type="password" value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button onClick={handleConfirm} className="btn-gradient">Continue</Button>
              </DialogFooter>
            </>
          )}
          {step === "processing" && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying…</p>
            </div>
          )}
          {step === "coming-soon" && (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "hsla(211,96%,56%,0.15)" }}>
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle>Coming Soon</DialogTitle>
              <DialogDescription>
                Redirecting to secure checkout… Annual billing will be available shortly.
              </DialogDescription>
              <Button variant="outline" onClick={closeModal} className="mt-2">Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ReferralCard({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    businessName: "", contactName: "", phone: "", email: "", notes: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.contactName) {
      toast.error("Business name and contact name are required.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      toast.success("Thanks! We'll reach out shortly to introduce ourselves.");
    }, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className={`relative rounded-2xl overflow-hidden ${compact ? 'p-4' : 'p-6'} ${className}`}
      style={{
        background: "linear-gradient(160deg, hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), 0.08), hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), 0.04))",
        border: "1px solid hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), 0.22)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 0 70px 18px hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), var(--ref-glow-opacity, 0))",
      }}
    >
      <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), 0.18), transparent 70%)", filter: "blur(24px)" }} />

      <div className={`relative flex items-start justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
          <div className={`${compact ? 'p-1.5' : 'p-2'} rounded-xl`} style={{ background: "hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), 0.15)" }}>
            <Gift className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} style={{ color: "hsl(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%))" }} />
          </div>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold tracking-tight`}>Refer & Earn</h3>
        </div>
        <span className="referral-badge text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{ background: "hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), 0.14)", color: "hsl(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%))" }}>
          2 Months Free
        </span>
      </div>

      <p className={`relative text-xs text-muted-foreground leading-relaxed ${compact ? 'mb-3' : 'mb-5'}`}>
        Refer a business and get your next 2 months free once they sign up.
      </p>

      {submitted ? (
        <div className={`relative ${compact ? 'py-4' : 'py-6'} flex flex-col items-center text-center gap-2`}>
          <CheckCircle2 className={`${compact ? 'h-8 w-8' : 'h-10 w-10'}`} style={{ color: "hsl(152,60%,54%)" }} />
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold`}>Referral received</p>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground max-w-xs`}>
            Our team will follow up with {form.businessName || "your referral"} shortly. You'll get 2 months free once they sign up.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => {
            setForm({ businessName: "", contactName: "", phone: "", email: "", notes: "" });
            setSubmitted(false);
          }}>
            Refer another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={`relative ${compact ? 'space-y-2' : 'space-y-3'}`}>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
              <Label htmlFor="ref-biz" className="text-xs">Business name</Label>
              <Input id="ref-biz" value={form.businessName} onChange={update("businessName")} placeholder="Acme Co." className={compact ? 'h-8 text-xs' : ''} />
            </div>
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
              <Label htmlFor="ref-name" className="text-xs">Contact name</Label>
              <Input id="ref-name" value={form.contactName} onChange={update("contactName")} placeholder="Jane Doe" className={compact ? 'h-8 text-xs' : ''} />
            </div>
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
              <Label htmlFor="ref-phone" className="text-xs">Phone</Label>
              <Input id="ref-phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="(555) 555-5555" className={compact ? 'h-8 text-xs' : ''} />
            </div>
            <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
              <Label htmlFor="ref-email" className="text-xs">Email</Label>
              <Input id="ref-email" type="email" value={form.email} onChange={update("email")} placeholder="jane@acme.com" className={compact ? 'h-8 text-xs' : ''} />
            </div>
          </div>
          <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
            <Label htmlFor="ref-notes" className="text-xs">Notes (optional)</Label>
            <Textarea id="ref-notes" value={form.notes} onChange={update("notes")}
              placeholder="Or let us know you'll be introducing us…" rows={compact ? 2 : 3} className={compact ? 'text-xs min-h-[60px]' : ''} />
          </div>
          <Button type="submit" className={`w-full btn-gradient ${compact ? 'h-9 text-xs' : ''}`} disabled={sending}>
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <>Submit Referral <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        </form>
      )}
    </motion.div>
  );
}

export function SaveAndEarn() {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, hsla(211,96%,62%,0.3), transparent)" }} />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">Save & Earn</h2>
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, hsla(211,96%,62%,0.3), transparent)" }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <AnnualSwitchCard />
        <ReferralCard />
      </div>
    </section>
  );
}

export default SaveAndEarn;
