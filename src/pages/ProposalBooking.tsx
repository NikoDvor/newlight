import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export default function ProposalBooking() {
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
            <Input placeholder="Jane Smith" />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" placeholder="jane@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input type="tel" placeholder="(555) 000-0000" />
          </div>
          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input placeholder="Company Inc." />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input type="url" placeholder="https://yoursite.com" />
          </div>
          <div className="space-y-2">
            <Label>Primary City / Location</Label>
            <Input placeholder="Los Angeles, CA" />
          </div>
          <div className="space-y-2">
            <Label>Business Type</Label>
            <Select>
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
            <Select>
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
            <Textarea placeholder="What are you looking for help with?" className="min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label>Are You the Decision Maker?</Label>
            <Select>
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
            <Input type="email" placeholder="other@company.com" />
          </div>

          {/* Internal-only fields */}
          <div className="sm:col-span-2 border-t border-border pt-6 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Internal Only</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Budget Range</Label>
                <Select>
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
          <Button size="lg" className="px-8">Submit Booking</Button>
        </div>
      </motion.div>
    </div>
  );
}
