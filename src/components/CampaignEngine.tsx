import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Mail, MessageSquare, Repeat, Send, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  followup: Repeat,
  promotion: Megaphone,
  reactivation: Repeat,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  scheduled: "bg-blue-50 text-blue-700",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-violet-50 text-violet-700",
  paused: "bg-amber-50 text-amber-700",
};

export function CampaignEngine() {
  const { activeClientId } = useWorkspace();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", campaign_type: "email", target_audience: "", message_template: "", subject_line: "" });

  const fetchCampaigns = async () => {
    if (!activeClientId) return;
    const { data } = await supabase
      .from("marketing_campaigns" as any)
      .select("*")
      .eq("client_id", activeClientId)
      .order("created_at", { ascending: false });
    setCampaigns((data as any) || []);
  };

  useEffect(() => { fetchCampaigns(); }, [activeClientId]);

  const createCampaign = async () => {
    if (!activeClientId || !form.name) return;
    await supabase.from("marketing_campaigns" as any).insert({
      client_id: activeClientId,
      name: form.name,
      campaign_type: form.campaign_type,
      target_audience: form.target_audience || null,
      message_template: form.message_template || null,
      subject_line: form.subject_line || null,
    });
    toast({ title: "Campaign Created" });
    setForm({ name: "", campaign_type: "email", target_audience: "", message_template: "", subject_line: "" });
    setCreateOpen(false);
    fetchCampaigns();
  };

  const totalSent = campaigns.reduce((s, c) => s + c.sent_count, 0);
  const totalOpens = campaigns.reduce((s, c) => s + c.open_count, 0);

  return (
    <>
      <Card className="card-widget border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
                <Megaphone className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Marketing Campaigns</CardTitle>
                <p className="text-[10px] text-muted-foreground">{campaigns.length} campaigns · {totalSent} sent</p>
              </div>
            </div>
            <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground mb-3">Create your first marketing campaign.</p>
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Campaign
              </Button>
            </div>
          ) : campaigns.slice(0, 6).map((c, i) => {
            const Icon = TYPE_ICONS[c.campaign_type] || Megaphone;
            return (
              <motion.div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-[9px] ${STATUS_COLORS[c.status] || "bg-secondary"}`}>{c.status}</Badge>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{c.sent_count} sent</span>
                      {c.open_count > 0 && (
                        <span className="text-[10px] tabular-nums" style={{ color: "hsl(211 96% 56%)" }}>
                          {Math.round((c.open_count / c.sent_count) * 100 || 0)}% open
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New Campaign</SheetTitle>
            <SheetDescription>Create an SMS, email, or reactivation campaign</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Campaign Name</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Spring Promo" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Type</label>
              <Select value={form.campaign_type} onValueChange={v => setForm(p => ({ ...p, campaign_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="followup">Follow-Up</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="reactivation">Reactivation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Target Audience</label>
              <Input value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))} placeholder="All contacts, Inactive 90+ days..." className="mt-1" />
            </div>
            {form.campaign_type === "email" && (
              <div>
                <label className="text-xs font-medium text-foreground">Subject Line</label>
                <Input value={form.subject_line} onChange={e => setForm(p => ({ ...p, subject_line: e.target.value }))} className="mt-1" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground">Message</label>
              <Textarea value={form.message_template} onChange={e => setForm(p => ({ ...p, message_template: e.target.value }))} rows={4} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={createCampaign}>Create Campaign</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
