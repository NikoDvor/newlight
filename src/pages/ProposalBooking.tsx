import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Zap, Calendar, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LogoUploader } from "@/components/LogoUploader";

export default function ProposalBooking() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", business_name: "",
    website: "", primary_location: "", business_type: "",
    main_service: "", primary_goal: "",
    reason_for_inquiry: "", is_decision_maker: "",
    booking_link: "", instagram_url: "", facebook_url: "", other_social: "",
    logo_url: "", primary_color: "", secondary_color: "",
    proposal_recipient_email: "", notes: "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.phone || !form.business_name || !form.reason_for_inquiry) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(form.business_name);
      const socialLinks: Record<string, string> = {};
      if (form.instagram_url) socialLinks.instagram = form.instagram_url;
      if (form.facebook_url) socialLinks.facebook = form.facebook_url;
      if (form.other_social) socialLinks.other = form.other_social;

      // 1. Create prospect record
      const { data: prospect, error: pErr } = await supabase.from("prospects").insert({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        business_name: form.business_name,
        website: form.website || null,
        primary_location: form.primary_location || null,
        business_type: form.business_type || null,
        reason_for_inquiry: form.reason_for_inquiry,
        is_decision_maker: form.is_decision_maker || null,
        proposal_recipient_email: form.proposal_recipient_email || null,
        notes: form.notes || null,
        source: "website",
        stage: "new_submission",
        status: "new_lead",
      }).select().single();

      if (pErr) throw pErr;

      // 2. Auto-create demo build
      await supabase.from("demo_builds").insert({
        business_name: form.business_name,
        workspace_slug: slug,
        website: form.website || null,
        primary_location: form.primary_location || null,
        business_type: form.business_type || null,
        main_service: form.main_service || null,
        primary_goal: form.primary_goal || null,
        booking_link: form.booking_link || null,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || "#3B82F6",
        secondary_color: form.secondary_color || "#06B6D4",
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : {},
        notes: form.notes || null,
        prospect_id: prospect.id,
        status: "build_in_progress",
      });

      // 3. Create audit log
      await supabase.from("audit_logs").insert({
        action: "enterprise_demo_request_submitted",
        module: "sales",
        metadata: { prospect_id: prospect.id, business_name: form.business_name },
      });

      setSubmitted(true);
      toast.success("Your demo request has been submitted!");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
        <motion.div className="max-w-md w-full relative z-10 rounded-2xl p-10 text-center" style={{
          background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)",
          border: "1px solid hsla(211,96%,60%,.12)", boxShadow: "0 20px 60px -15px hsla(211,96%,56%,.2)",
        }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--nl-sky))]" />
          <h2 className="text-xl font-bold text-white mb-2">Your Custom Demo Is Being Built!</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto mb-6">
            We're creating a tailored demo workspace, website preview, and growth analysis for your business.
            A member of our team will reach out within 24 hours.
          </p>
          <Link to="/enterprise">
            <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              <ArrowRight className="h-4 w-4 mr-2" /> Back to NewLight
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-10" style={{
      background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
    }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{
          top: "-150px", right: "-100px",
          background: "radial-gradient(circle, hsla(211,96%,62%,.12), transparent 70%)", filter: "blur(80px)",
        }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{
          bottom: "-100px", left: "-80px",
          background: "radial-gradient(circle, hsla(197,92%,68%,.09), transparent 70%)", filter: "blur(80px)",
        }} />
      </div>

      <motion.div className="max-w-2xl mx-auto relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
              boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
            }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">NewLight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Enterprise Demo Request</h1>
          <p className="text-sm text-white/40">Get your custom-built growth demo, website preview, and business analysis</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6 sm:p-8 space-y-6" style={{
          background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)",
          border: "1px solid hsla(211,96%,60%,.12)", boxShadow: "0 20px 60px -15px hsla(211,96%,56%,.2)",
        }}>
          {/* Contact */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Contact Information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label className="text-xs text-white/60">Full Name *</Label><Input placeholder="Jane Smith" value={form.full_name} onChange={e => update("full_name", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Email *</Label><Input type="email" placeholder="jane@company.com" value={form.email} onChange={e => update("email", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Phone *</Label><Input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => update("phone", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Business Name *</Label><Input placeholder="Company Inc." value={form.business_name} onChange={e => update("business_name", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-1 pt-2 border-t border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Business Details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label className="text-xs text-white/60">Website</Label><Input type="url" placeholder="https://yoursite.com" value={form.website} onChange={e => update("website", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Primary City / Location</Label><Input placeholder="Los Angeles, CA" value={form.primary_location} onChange={e => update("primary_location", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div>
                <Label className="text-xs text-white/60">Business Type / Industry</Label>
                <Select value={form.business_type} onValueChange={v => update("business_type", v)}>
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(218,35%,14%)] border-white/10 text-white">
                    <SelectItem value="medspa">Med Spa / Aesthetics</SelectItem>
                    <SelectItem value="dental">Dental</SelectItem>
                    <SelectItem value="auto">Automotive</SelectItem>
                    <SelectItem value="restaurant">Restaurant / Food</SelectItem>
                    <SelectItem value="home_services">Home Services</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="franchise">Franchise</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-white/60">Main Service or Offer</Label><Input placeholder="What you sell or offer" value={form.main_service} onChange={e => update("main_service", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Primary Goal</Label><Input placeholder="e.g. More leads, better reviews" value={form.primary_goal} onChange={e => update("primary_goal", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div>
                <Label className="text-xs text-white/60">Are You the Decision Maker?</Label>
                <Select value={form.is_decision_maker} onValueChange={v => update("is_decision_maker", v)}>
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="bg-[hsl(218,35%,14%)] border-white/10 text-white">
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="shared">Shared Decision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/60">Biggest Growth Challenge / Reason for Inquiry *</Label>
                <Textarea placeholder="What are you looking for help with?" className="min-h-[80px] bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" value={form.reason_for_inquiry} onChange={e => update("reason_for_inquiry", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Optional: Social & Branding */}
          <div className="space-y-1 pt-2 border-t border-white/[0.06]">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Optional — Social & Branding</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label className="text-xs text-white/60">Booking Link</Label><Input placeholder="https://calendly.com/..." value={form.booking_link} onChange={e => update("booking_link", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Instagram URL</Label><Input placeholder="https://instagram.com/..." value={form.instagram_url} onChange={e => update("instagram_url", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Facebook URL</Label><Input placeholder="https://facebook.com/..." value={form.facebook_url} onChange={e => update("facebook_url", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Other Social Links</Label><Input placeholder="LinkedIn, TikTok, etc." value={form.other_social} onChange={e => update("other_social", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Logo URL</Label><Input placeholder="https://your-logo.com/logo.png" value={form.logo_url} onChange={e => update("logo_url", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div><Label className="text-xs text-white/60">Proposal Recipient Email (if different)</Label><Input type="email" placeholder="other@company.com" value={form.proposal_recipient_email} onChange={e => update("proposal_recipient_email", e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" /></div>
              <div>
                <Label className="text-xs text-white/60">Primary Brand Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color || "#3B82F6"} onChange={e => update("primary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <Input value={form.primary_color} onChange={e => update("primary_color", e.target.value)} placeholder="#3B82F6" className="bg-white/[0.06] border-white/10 text-white flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-white/60">Secondary Brand Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.secondary_color || "#06B6D4"} onChange={e => update("secondary_color", e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <Input value={form.secondary_color} onChange={e => update("secondary_color", e.target.value)} placeholder="#06B6D4" className="bg-white/[0.06] border-white/10 text-white flex-1" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-white/60">Notes / Anything Important We Should Know</Label>
                <Textarea placeholder="Anything else..." className="min-h-[60px] bg-white/[0.06] border-white/10 text-white placeholder:text-white/25" value={form.notes} onChange={e => update("notes", e.target.value)} />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 text-sm font-semibold text-white border-0"
            style={{
              background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
              boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
            }}
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building Your Demo...</> : <><Rocket className="h-4 w-4 mr-2" /> Get My Custom Growth Demo</>}
          </Button>

          <p className="text-[10px] text-white/20 text-center">
            Powered by <span className="font-semibold">NewLight</span> · Enterprise Growth System
          </p>
        </div>
      </motion.div>
    </div>
  );
}
