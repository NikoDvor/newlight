import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star, MessageSquare, TrendingUp, Send, Plus, Reply,
  CheckCircle, Clock, Mail, Phone, AlertTriangle, ShieldAlert
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700",
  opened: "bg-cyan-50 text-cyan-700",
  feedback_submitted: "bg-emerald-50 text-emerald-700",
  recovery_needed: "bg-red-50 text-red-600",
  recovery_in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  public_review_left: "bg-violet-50 text-violet-700",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Sent", opened: "Opened", feedback_submitted: "Feedback",
  recovery_needed: "Recovery Needed", recovery_in_progress: "Recovery In Progress",
  resolved: "Resolved", public_review_left: "Public Review",
};

export default function ReviewsDashboard() {
  const { activeClientId } = useWorkspace();
  const [requests, setRequests] = useState<any[]>([]);
  const [recoveryTasks, setRecoveryTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [newReq, setNewReq] = useState({ customer_name: "", customer_email: "", customer_phone: "", channel: "sms", platform: "google" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [rRes, rcRes, tRes] = await Promise.all([
      supabase.from("review_requests").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("review_recovery_tasks").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("review_templates").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setRequests(rRes.data || []);
    setRecoveryTasks(rcRes.data || []);
    setTemplates(tRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const sendRequest = async () => {
    if (!activeClientId || !newReq.customer_name) return;
    const { error } = await supabase.from("review_requests").insert({
      client_id: activeClientId,
      customer_name: newReq.customer_name,
      customer_email: newReq.customer_email || null,
      customer_phone: newReq.customer_phone || null,
      channel: newReq.channel,
      platform: newReq.platform,
      status: "sent",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review Request Sent" });
    setNewReq({ customer_name: "", customer_email: "", customer_phone: "", channel: "sms", platform: "google" });
    setRequestOpen(false);
    fetchData();
  };

  const totalRequests = requests.length;
  const feedbackCount = requests.filter(r => r.feedback_text).length;
  const recoveryCount = requests.filter(r => r.recovery_needed).length;
  const publicCount = requests.filter(r => r.public_review_left).length;
  const avgRating = requests.filter(r => r.rating).length > 0
    ? (requests.filter(r => r.rating).reduce((s, r) => s + r.rating, 0) / requests.filter(r => r.rating).length).toFixed(1)
    : "—";

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Reviews" description="Monitor reputation and automate review collection" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Reviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Reviews" description="Monitor reputation and automate review collection">
        <Button className="gap-1.5" onClick={() => setRequestOpen(true)}>
          <Send className="h-4 w-4" /> Send Review Request
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Avg Rating" value={avgRating} change={`${feedbackCount} with feedback`} changeType="neutral" icon={Star} />
        <MetricCard label="Requests Sent" value={String(totalRequests)} change="Total sent" changeType="neutral" icon={Send} />
        <MetricCard label="Feedback Received" value={String(feedbackCount)} change={`${totalRequests > 0 ? Math.round(feedbackCount / totalRequests * 100) : 0}% response rate`} changeType="positive" icon={MessageSquare} />
        <MetricCard label="Recovery Needed" value={String(recoveryCount)} change={`${publicCount} public reviews`} changeType={recoveryCount > 0 ? "negative" : "neutral"} icon={ShieldAlert} />
      </WidgetGrid>

      <div className="mt-8">
        <Tabs defaultValue="requests">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="requests" className="rounded-md text-sm">Requests</TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-md text-sm">Feedback</TabsTrigger>
            <TabsTrigger value="recovery" className="rounded-md text-sm">Recovery</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <DataCard title="Review Request Tracking">
              {requests.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No review requests yet.</p>
                  <Button size="sm" onClick={() => setRequestOpen(true)}>
                    <Send className="h-4 w-4 mr-1" /> Send First Request
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Customer</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Channel</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Platform</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                          <td className="text-sm font-medium py-3 pr-4">{r.customer_name}</td>
                          <td className="py-3 pr-4">
                            <span className="text-xs flex items-center gap-1">
                              {r.channel === "sms" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                              {r.channel.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-xs text-muted-foreground py-3 pr-4 capitalize">{r.platform}</td>
                          <td className="py-3 pr-4">
                            <Badge className={`text-[10px] ${STATUS_STYLE[r.status] || "bg-secondary text-muted-foreground"}`}>
                              {STATUS_LABEL[r.status] || r.status}
                            </Badge>
                          </td>
                          <td className="text-xs text-muted-foreground py-3">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <DataCard title="Customer Feedback">
              {requests.filter(r => r.feedback_text).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No feedback submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {requests.filter(r => r.feedback_text).map((r) => (
                    <motion.div key={r.id} className="card-widget p-5 rounded-2xl" initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {r.rating && (
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star key={j} className={`h-3.5 w-3.5 ${j < r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                              ))}
                            </div>
                          )}
                          <span className="text-sm font-medium">{r.customer_name}</span>
                        </div>
                        {r.recovery_needed && (
                          <Badge className="bg-red-50 text-red-600 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Recovery</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.feedback_text}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="recovery" className="mt-4">
            <DataCard title="Service Recovery">
              {recoveryTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No recovery tasks. Great job!</p>
              ) : (
                <div className="space-y-3">
                  {recoveryTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">Recovery Task</p>
                        <p className="text-xs text-muted-foreground">{t.notes || "No notes"}</p>
                      </div>
                      <Badge className={`text-[10px] ${t.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Review Request Sheet */}
      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Send Review Request</SheetTitle>
            <SheetDescription>Request feedback from a customer</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={newReq.customer_name} onChange={e => setNewReq(p => ({ ...p, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={newReq.channel} onValueChange={v => setNewReq(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{newReq.channel === "sms" ? "Phone" : "Email"}</Label>
              <Input value={newReq.channel === "sms" ? newReq.customer_phone : newReq.customer_email}
                onChange={e => setNewReq(p => newReq.channel === "sms" ? { ...p, customer_phone: e.target.value } : { ...p, customer_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={newReq.platform} onValueChange={v => setNewReq(p => ({ ...p, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={sendRequest}><Send className="h-4 w-4" /> Send</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
