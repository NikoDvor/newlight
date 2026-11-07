import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

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
        boxShadow: "0 0 var(--ref-glow-blur, 70px) var(--ref-glow-spread, 18px) hsla(var(--ref-h, 250deg), var(--ref-s, 80%), var(--ref-l, 68%), var(--ref-glow-opacity, 0))",
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
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <ReferralCard />
      </div>
    </section>
  );
}

export default SaveAndEarn;
