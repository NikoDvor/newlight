import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star, MessageSquare, TrendingUp, Send, Plus, Reply, Sparkles,
  CheckCircle, Clock, Mail, Phone, ExternalLink, User
} from "lucide-react";
import { motion } from "framer-motion";

// --- Types ---
interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  platform: string;
  date: string;
  replied: boolean;
}

interface ReviewRequest {
  id: string;
  customerName: string;
  sentVia: "SMS" | "Email";
  sentDate: string;
  completed: boolean;
  platform?: string;
}

const mockReviews: Review[] = [
  { id: "r1", author: "John D.", rating: 5, text: "Incredible service! Our marketing results have never been better. The team is responsive and creative.", platform: "Google", date: "2 days ago", replied: true },
  { id: "r2", author: "Amanda R.", rating: 5, text: "Professional team that delivers results. Highly recommended for any business looking to grow.", platform: "Google", date: "5 days ago", replied: true },
  { id: "r3", author: "Mark T.", rating: 4, text: "Great communication and solid strategy. Seeing real growth in our leads and online visibility.", platform: "Yelp", date: "1 week ago", replied: false },
  { id: "r4", author: "Susan L.", rating: 5, text: "They transformed our online presence completely. Can't imagine working with anyone else.", platform: "Google", date: "2 weeks ago", replied: true },
  { id: "r5", author: "Carlos M.", rating: 3, text: "Good service overall but took a while to get started. Results are improving now though.", platform: "Facebook", date: "3 weeks ago", replied: false },
  { id: "r6", author: "Jennifer K.", rating: 5, text: "Outstanding work on our website and SEO. Traffic is up 40% in just 2 months!", platform: "Google", date: "1 month ago", replied: true },
];

const mockRequests: ReviewRequest[] = [
  { id: "rq1", customerName: "Rachel Green", sentVia: "SMS", sentDate: "Mar 11", completed: true, platform: "Google" },
  { id: "rq2", customerName: "Tom Harris", sentVia: "Email", sentDate: "Mar 10", completed: false },
  { id: "rq3", customerName: "Anna Lee", sentVia: "SMS", sentDate: "Mar 9", completed: true, platform: "Yelp" },
  { id: "rq4", customerName: "James Brooks", sentVia: "Email", sentDate: "Mar 8", completed: false },
  { id: "rq5", customerName: "Maria Santos", sentVia: "SMS", sentDate: "Mar 7", completed: true, platform: "Google" },
  { id: "rq6", customerName: "David Chen", sentVia: "SMS", sentDate: "Mar 6", completed: false },
];

const smsTemplate = `Hi {name}, thanks for choosing NewLight Marketing! We'd love to hear about your experience. Could you take 30 seconds to leave us a review? {link}`;
const emailTemplate = `Hi {name},\n\nThank you for trusting NewLight Marketing with your business! Your feedback means the world to us.\n\nWould you mind taking a moment to share your experience? It only takes 30 seconds:\n\n{link}\n\nThank you!\n— The NewLight Team`;

export default function ReviewsDashboard() {
  const [replyOpen, setReplyOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const openReply = (review: Review) => {
    setSelectedReview(review);
    setReplyOpen(true);
  };

  const avgRating = (mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length).toFixed(1);

  return (
    <div>
      <PageHeader title="Reviews" description="Monitor reputation and automate review collection">
        <Button className="gap-1.5" onClick={() => setRequestOpen(true)}>
          <Send className="h-4 w-4" /> Send Review Request
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Average Rating" value={avgRating} change="Based on 156 reviews" changeType="positive" icon={Star} />
        <MetricCard label="New Reviews" value="12" change="This month" changeType="positive" icon={MessageSquare} />
        <MetricCard label="Requests Sent" value="45" change="68% response rate" changeType="positive" icon={Send} />
        <MetricCard label="Review Growth" value="+24%" change="vs last quarter" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <div className="mt-8">
        <Tabs defaultValue="reviews">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="reviews" className="rounded-md text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-md text-sm">Request Tracking</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-md text-sm">Templates</TabsTrigger>
          </TabsList>

          {/* Reviews list */}
          <TabsContent value="reviews" className="mt-4">
            <div className="space-y-4">
              {mockReviews.map((r) => (
                <motion.div
                  key={r.id}
                  className="card-widget p-5 rounded-2xl"
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`h-3.5 w-3.5 ${j < r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{r.author}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.replied && <Badge className="bg-emerald-50 text-emerald-700 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Replied</Badge>}
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.text}</p>
                  {!r.replied && (
                    <div className="mt-3 pt-3 border-t border-border flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openReply(r)}>
                        <Reply className="h-3 w-3" /> Reply
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openReply(r)}>
                        <Sparkles className="h-3 w-3" /> AI Reply
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Request Tracking */}
          <TabsContent value="requests" className="mt-4">
            <DataCard title="Review Request Tracking">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Customer</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Sent Via</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Sent Date</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3">Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRequests.map((rq) => (
                      <tr key={rq.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="text-sm font-medium py-3 pr-4">{rq.customerName}</td>
                        <td className="py-3 pr-4">
                          <span className="text-xs flex items-center gap-1">
                            {rq.sentVia === "SMS" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                            {rq.sentVia}
                          </span>
                        </td>
                        <td className="text-xs text-muted-foreground py-3 pr-4">{rq.sentDate}</td>
                        <td className="py-3 pr-4">
                          {rq.completed ? (
                            <Badge className="bg-emerald-50 text-emerald-700 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          )}
                        </td>
                        <td className="text-xs text-muted-foreground py-3">{rq.platform || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataCard>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <DataCard title="SMS Template">
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-sm whitespace-pre-wrap">{smsTemplate}</p>
                </div>
                <Button size="sm" variant="outline" className="mt-3">Edit Template</Button>
              </DataCard>
              <DataCard title="Email Template">
                <div className="bg-secondary rounded-xl p-4">
                  <p className="text-sm whitespace-pre-wrap">{emailTemplate}</p>
                </div>
                <Button size="sm" variant="outline" className="mt-3">Edit Template</Button>
              </DataCard>
            </div>

            <DataCard title="Review Request Workflow" className="mt-6">
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {[
                  { step: "Customer completes service", color: "bg-blue-50 text-blue-700 border-blue-200" },
                  { step: "System sends review request", color: "bg-violet-50 text-violet-700 border-violet-200" },
                  { step: "Customer clicks link", color: "bg-amber-50 text-amber-700 border-amber-200" },
                  { step: "Customer leaves review", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 shrink-0">
                    <div className={`rounded-xl border px-4 py-3 min-w-[160px] ${s.color}`}>
                      <p className="text-xs font-semibold">{s.step}</p>
                    </div>
                    {i < 3 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reply Sheet */}
      <Sheet open={replyOpen} onOpenChange={setReplyOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedReview && (
            <>
              <SheetHeader>
                <SheetTitle>Reply to {selectedReview.author}</SheetTitle>
                <SheetDescription>{selectedReview.platform} · {selectedReview.rating} stars</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="bg-secondary rounded-xl p-4">
                  <div className="flex mb-2">
                    {Array.from({ length: selectedReview.rating }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm">{selectedReview.text}</p>
                </div>

                <div className="card-widget p-4 rounded-xl">
                  <p className="metric-label mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Suggested Reply</p>
                  <p className="text-sm text-muted-foreground italic">
                    "Thank you so much for your kind words, {selectedReview.author.replace(".", "")}! We're thrilled to hear about your positive experience. Your feedback motivates our team to keep delivering great results. We look forward to continuing to support your growth!"
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs">Use This Reply</Button>
                </div>

                <div className="space-y-2">
                  <Label>Your Reply</Label>
                  <Textarea placeholder="Write your response…" className="min-h-[100px]" />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setReplyOpen(false)}>Cancel</Button>
                  <Button className="flex-1 gap-1.5"><Send className="h-4 w-4" /> Send Reply</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Send Review Request Sheet */}
      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Send Review Request</SheetTitle>
            <SheetDescription>Request a review from a customer</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Send Via</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose channel…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone or Email</Label>
              <Input placeholder="(555) 000-0000 or email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Review Platform</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose platform…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5"><Send className="h-4 w-4" /> Send Request</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
