import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Users, Heart, Eye, TrendingUp, Instagram, Facebook, Linkedin,
  Twitter, Plus, Image, Video, Send, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Clock, MessageSquare, Share, BarChart3,
  CheckCircle, AlertCircle, XCircle, Wifi
} from "lucide-react";
import { motion } from "framer-motion";

// --- Types ---
interface SocialAccount {
  platform: string;
  handle: string;
  status: "Connected" | "Disconnected" | "Needs Auth";
  followers: string;
  icon: typeof Instagram;
}

interface ScheduledPost {
  id: string;
  platforms: string[];
  caption: string;
  date: string;
  time: string;
  status: "Draft" | "Scheduled" | "Posted";
  engagement?: { likes: number; comments: number; shares: number; reach: number };
  imageUrl?: string;
}

const accounts: SocialAccount[] = [
  { platform: "Instagram", handle: "@newlightmktg", status: "Connected", followers: "12,400", icon: Instagram },
  { platform: "Facebook", handle: "NewLight Marketing", status: "Connected", followers: "8,200", icon: Facebook },
  { platform: "LinkedIn", handle: "NewLight Marketing", status: "Connected", followers: "5,600", icon: Linkedin },
  { platform: "TikTok", handle: "@newlightmktg", status: "Needs Auth", followers: "2,250", icon: Eye },
  { platform: "X (Twitter)", handle: "@newlightmktg", status: "Disconnected", followers: "—", icon: Twitter },
];

const STATUS_STYLE: Record<string, string> = {
  Connected: "bg-emerald-50 text-emerald-700",
  Disconnected: "bg-secondary text-muted-foreground",
  "Needs Auth": "bg-amber-50 text-amber-700",
};

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  Connected: CheckCircle,
  Disconnected: XCircle,
  "Needs Auth": AlertCircle,
};

const POST_STATUS_STYLE: Record<string, string> = {
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Posted: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const mockPosts: ScheduledPost[] = [
  { id: "p1", platforms: ["Instagram", "Facebook"], caption: "Spring campaign launch — carousel post showcasing our latest success stories 🚀", date: "Mar 13", time: "10:00 AM", status: "Scheduled" },
  { id: "p2", platforms: ["LinkedIn"], caption: "Case study: How we grew leads by 200% for TechCorp with SEO + PPC", date: "Mar 13", time: "2:00 PM", status: "Scheduled" },
  { id: "p3", platforms: ["Facebook"], caption: "Client testimonial video from Bloom Agency", date: "Mar 14", time: "11:00 AM", status: "Draft" },
  { id: "p4", platforms: ["X (Twitter)"], caption: "5 marketing trends you need to know in 2026 🧵", date: "Mar 14", time: "3:00 PM", status: "Scheduled" },
  { id: "p5", platforms: ["Instagram"], caption: "Behind the scenes: Our creative process", date: "Mar 10", time: "9:00 AM", status: "Posted", engagement: { likes: 842, comments: 56, shares: 123, reach: 4200 } },
  { id: "p6", platforms: ["LinkedIn", "Facebook"], caption: "Announcing our new partnership with GrowthLab 🤝", date: "Mar 8", time: "1:00 PM", status: "Posted", engagement: { likes: 312, comments: 28, shares: 87, reach: 2800 } },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Simple calendar data for month view
const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const postsOnDay: Record<number, { platform: string; caption: string; status: string }[]> = {
  8: [{ platform: "LinkedIn", caption: "Partnership", status: "Posted" }],
  10: [{ platform: "Instagram", caption: "BTS", status: "Posted" }],
  13: [{ platform: "Instagram", caption: "Spring campaign", status: "Scheduled" }, { platform: "LinkedIn", caption: "Case study", status: "Scheduled" }],
  14: [{ platform: "Facebook", caption: "Testimonial", status: "Draft" }, { platform: "X", caption: "Trends", status: "Scheduled" }],
  17: [{ platform: "Instagram", caption: "Product feature", status: "Draft" }],
  20: [{ platform: "LinkedIn", caption: "Team highlight", status: "Draft" }],
  25: [{ platform: "Facebook", caption: "Monthly recap", status: "Draft" }],
};

export default function SocialDashboard() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filteredPosts = platformFilter === "all"
    ? mockPosts
    : mockPosts.filter((p) => p.platforms.some((pl) => pl.toLowerCase().includes(platformFilter)));

  return (
    <div>
      <PageHeader title="Social Media" description="Manage content, track engagement, and grow your audience">
        <Button className="gap-1.5" onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </PageHeader>

      {/* Metrics */}
      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Followers" value="28,450" change="+1,240 this month" changeType="positive" icon={Users} />
        <MetricCard label="Engagement Rate" value="5.8%" change="+0.4% vs last month" changeType="positive" icon={Heart} />
        <MetricCard label="Total Reach" value="142K" change="+23% vs last month" changeType="positive" icon={Eye} />
        <MetricCard label="Posts Published" value="24" change="This month" changeType="positive" icon={Send} />
      </WidgetGrid>

      <div className="mt-8">
        <Tabs defaultValue="accounts">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="accounts" className="rounded-md text-sm">Accounts</TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-md text-sm">Calendar</TabsTrigger>
            <TabsTrigger value="posts" className="rounded-md text-sm">Posts</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-md text-sm">Analytics</TabsTrigger>
          </TabsList>

          {/* Connected Accounts */}
          <TabsContent value="accounts" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => {
                const SIcon = STATUS_ICON[acc.status];
                return (
                  <motion.div
                    key={acc.platform}
                    className="card-widget p-5 rounded-2xl"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <acc.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">{acc.platform}</p>
                          <p className="text-xs text-muted-foreground">{acc.handle}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${STATUS_STYLE[acc.status]}`}>
                        <SIcon className="h-3 w-3 mr-1" />
                        {acc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">Followers</span>
                      <span className="text-sm font-semibold tabular-nums">{acc.followers}</span>
                    </div>
                    {acc.status !== "Connected" && (
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs gap-1">
                        <Wifi className="h-3 w-3" /> {acc.status === "Needs Auth" ? "Re-authenticate" : "Connect"}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Content Calendar */}
          <TabsContent value="calendar" className="mt-4">
            <DataCard title="Content Calendar">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1.5">
                  <Button size="sm" variant={calendarView === "month" ? "default" : "outline"} onClick={() => setCalendarView("month")}>Month</Button>
                  <Button size="sm" variant={calendarView === "week" ? "default" : "outline"} onClick={() => setCalendarView("week")}>Week</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium">March 2026</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              {calendarView === "month" ? (
                <>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map((d) => (
                      <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2">{d}</div>
                    ))}
                    {/* offset for March 2026 starting on Sunday — pad 6 */}
                    {Array.from({ length: 6 }, (_, i) => (
                      <div key={`pad-${i}`} className="h-20" />
                    ))}
                    {calendarDays.map((day) => {
                      const dayPosts = postsOnDay[day];
                      return (
                        <div
                          key={day}
                          className="h-20 rounded-xl border border-border p-1.5 hover:bg-secondary/50 transition-colors cursor-default overflow-hidden"
                        >
                          <span className="text-xs font-medium">{day}</span>
                          {dayPosts?.map((dp, i) => (
                            <div key={i} className={`text-[9px] mt-0.5 px-1 py-0.5 rounded truncate ${
                              dp.status === "Posted" ? "bg-emerald-50 text-emerald-700" :
                              dp.status === "Scheduled" ? "bg-blue-50 text-blue-700" :
                              "bg-amber-50 text-amber-700"
                            }`}>
                              {dp.platform}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((d, i) => (
                    <div key={d} className="space-y-2">
                      <div className="text-center">
                        <p className="text-[11px] font-medium text-muted-foreground">{d}</p>
                        <p className="text-lg font-semibold">{10 + i}</p>
                      </div>
                      {(postsOnDay[10 + i] || []).map((dp, j) => (
                        <div key={j} className={`text-[10px] p-2 rounded-lg ${
                          dp.status === "Posted" ? "bg-emerald-50 text-emerald-700" :
                          dp.status === "Scheduled" ? "bg-blue-50 text-blue-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          <p className="font-medium">{dp.platform}</p>
                          <p className="truncate mt-0.5">{dp.caption}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* Posts list */}
          <TabsContent value="posts" className="mt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">Filter:</span>
              {["all", "instagram", "facebook", "linkedin", "twitter"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                    platformFilter === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  className="card-widget p-5 rounded-2xl"
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-1.5">
                      {post.platforms.map((pl) => (
                        <span key={pl} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{pl}</span>
                      ))}
                    </div>
                    <Badge className={POST_STATUS_STYLE[post.status]}>{post.status}</Badge>
                  </div>
                  <p className="text-sm">{post.caption}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {post.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.time}</span>
                  </div>
                  {post.engagement && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.engagement.likes.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.engagement.comments}</span>
                      <span className="flex items-center gap-1"><Share className="h-3 w-3" /> {post.engagement.shares}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.engagement.reach.toLocaleString()}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="mt-4">
            <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
              <MetricCard label="Total Posts" value="48" change="Last 30 days" changeType="neutral" icon={Send} />
              <MetricCard label="Avg. Engagement" value="5.8%" change="+0.4% vs prior" changeType="positive" icon={Heart} />
              <MetricCard label="Total Likes" value="12.4K" change="+18% vs prior" changeType="positive" icon={Heart} />
              <MetricCard label="Total Comments" value="892" change="+12% vs prior" changeType="positive" icon={MessageSquare} />
              <MetricCard label="Total Shares" value="1,240" change="+24% vs prior" changeType="positive" icon={Share} />
              <MetricCard label="Total Reach" value="142K" change="+23% vs prior" changeType="positive" icon={Eye} />
            </WidgetGrid>

            <DataCard title="Platform Breakdown" className="mt-6">
              <div className="space-y-4">
                {[
                  { platform: "Instagram", posts: 18, engagement: "7.2%", reach: "52K", pct: 70 },
                  { platform: "Facebook", posts: 14, engagement: "4.1%", reach: "38K", pct: 50 },
                  { platform: "LinkedIn", posts: 10, engagement: "6.5%", reach: "32K", pct: 60 },
                  { platform: "X (Twitter)", posts: 6, engagement: "3.8%", reach: "20K", pct: 35 },
                ].map((p) => (
                  <div key={p.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{p.platform}</span>
                      <span className="text-muted-foreground text-xs">{p.posts} posts · {p.engagement} eng. · {p.reach} reach</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Composer Sheet */}
      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Post</SheetTitle>
            <SheetDescription>Compose and schedule across platforms</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {["Instagram", "Facebook", "LinkedIn", "X (Twitter)", "TikTok"].map((pl) => (
                  <button
                    key={pl}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {pl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea placeholder="Write your caption…" className="min-h-[120px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="gap-1.5"><Image className="h-4 w-4" /> Upload Image</Button>
              <Button variant="outline" className="gap-1.5"><Video className="h-4 w-4" /> Upload Video</Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" />
              </div>
            </div>

            {/* Preview cards */}
            <div className="space-y-3">
              <p className="metric-label">Preview</p>
              {["Instagram", "Facebook", "LinkedIn"].map((pl) => (
                <div key={pl} className="bg-secondary rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{pl} Preview</p>
                  <div className="bg-card rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-accent">NL</span>
                      </div>
                      <span className="text-xs font-medium">NewLight Marketing</span>
                    </div>
                    <div className="h-32 bg-secondary rounded-lg flex items-center justify-center mb-2">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground italic">Your caption will appear here…</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1">Save Draft</Button>
              <Button className="flex-1 gap-1.5"><Send className="h-4 w-4" /> Schedule</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
