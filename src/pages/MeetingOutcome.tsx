import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";

export default function MeetingOutcome() {
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Meeting Outcome" description="Record the results from the sales meeting" />

      <motion.div
        className="card-widget p-8 rounded-2xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Recommended Package *</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Main Offer *</Label>
            <Input placeholder="e.g., Website + SEO Bundle" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Primary Problem *</Label>
            <Textarea placeholder="What is the main problem the prospect is facing?" className="min-h-[80px]" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Best Route of Action *</Label>
            <Textarea placeholder="Recommended strategy and approach…" className="min-h-[80px]" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Priority Channels</Label>
            <div className="flex flex-wrap gap-3">
              {["SEO", "PPC", "Social Media", "Website", "Reviews", "Email Marketing", "Content"].map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Additional meeting notes…" className="min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label>Follow-up Date (optional)</Label>
            <Input type="date" />
          </div>
          <div className="space-y-2">
            <Label>Timeline Notes (optional)</Label>
            <Input placeholder="e.g., wants to start before Q2" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Objections (optional)</Label>
            <Textarea placeholder="Any concerns or objections raised…" className="min-h-[60px]" />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <Checkbox id="proposal-ready" />
            <Label htmlFor="proposal-ready" className="cursor-pointer">Proposal Ready to Send</Label>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline">Save Draft</Button>
          <Button>Submit Outcome</Button>
        </div>
      </motion.div>
    </div>
  );
}
