import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export default function ProposalBooking() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", business_name: "",
    website: "", primary_location: "", business_type: "",
    reason_for_inquiry: "", timeline: "", is_decision_maker: "",
    proposal_recipient_email: "", budget_range: "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.business_name || !form.reason_for_inquiry) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("prospects").insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      business_name: form.business_name,
      website: form.website || null,
      primary_location: form.primary_location || null,
      business_type: form.business_type || null,
      reason_for_inquiry: form.reason_for_inquiry,
      timeline: form.timeline || null,
      is_decision_maker: form.is_decision_maker || null,
      proposal_recipient_email: form.proposal_recipient_email || null,
      budget_range: form.budget_range || null,
      source: "website",
      stage: "new_submission",
      status: "new_lead",
    });
    setLoading(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } else {
      setSubmitted(true);
      toast.success("Your booking has been submitted!");
    }
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title="Booking Submitted" description="We'll be in touch soon" />
        <motion.div className="card-widget p-12 rounded-2xl text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: "hsl(211 96% 56%)" }} />
          <h2 className="text-xl font-bold text-foreground mb-2">Thank You!</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your strategy call booking has been received. A member of our team will reach out within 24 hours to confirm your session.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Book a Proposal" description="Tell us about your business so we can prepare a custom marketing strategy" />

      <motion.div
        className="card-widget p-8 rounded-2xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input placeholder="Jane Smith" value={form.full_name} onChange={e => update("full_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" placeholder="jane@company.com" value={form.email} onChange={e => update("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => update("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input placeholder="Company Inc." value={form.business_name} onChange={e => update("business_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input type="url" placeholder="https://yoursite.com" value={form.website} onChange={e => update("website", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Primary City / Location</Label>
            <Input placeholder="Los Angeles, CA" value={form.primary_location} onChange={e => update("primary_location", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Business Type</Label>
            <Select value={form.business_type} onValueChange={v => update("business_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Business</SelectItem>
                <SelectItem value="ecommerce">E-Commerce</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="franchise">Franchise</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timeline</Label>
            <Select value={form.timeline} onValueChange={v => update("timeline", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asap">ASAP</SelectItem>
                <SelectItem value="1month">Within 1 Month</SelectItem>
                <SelectItem value="3months">1–3 Months</SelectItem>
                <SelectItem value="exploring">Just Exploring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Reason for Inquiry *</Label>
            <Textarea placeholder="What are you looking for help with?" className="min-h-[100px]" value={form.reason_for_inquiry} onChange={e => update("reason_for_inquiry", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Are You the Decision Maker?</Label>
            <Select value={form.is_decision_maker} onValueChange={v => update("is_decision_maker", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="shared">Shared Decision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proposal Recipient Email (if different)</Label>
            <Input type="email" placeholder="other@company.com" value={form.proposal_recipient_email} onChange={e => update("proposal_recipient_email", e.target.value)} />
          </div>

          {/* Internal-only fields */}
          <div className="sm:col-span-2 border-t border-border pt-6 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Internal Only</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Budget Range</Label>
                <Select value={form.budget_range} onValueChange={v => update("budget_range", v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500-1000">$500 – $1,000/mo</SelectItem>
                    <SelectItem value="1000-2500">$1,000 – $2,500/mo</SelectItem>
                    <SelectItem value="2500-5000">$2,500 – $5,000/mo</SelectItem>
                    <SelectItem value="5000+">$5,000+/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button size="lg" className="px-8" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Booking
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
