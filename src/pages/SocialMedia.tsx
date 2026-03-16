import { useState, useEffect } from "react";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SetupBanner, DemoDataLabel } from "@/components/SetupBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Heart, Eye, Send, Plus, CheckCircle, XCircle, AlertCircle, Wifi,
  MessageSquare, Share, Calendar, ThumbsUp
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const PLATFORM_ICONS: Record<string, any> = {
  Instagram: Heart, Facebook: ThumbsUp, LinkedIn: Users, "X (Twitter)": MessageSquare, TikTok: Eye, YouTube: Eye,
};

const STATUS_STYLE: Record<string, string> = {
  connected: "bg-emerald-50 text-emerald-700",
  disconnected: "bg-secondary text-muted-foreground",
  needs_auth: "bg-amber-50 text-amber-700",
};

const POST_STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  scheduled: "bg-blue-50 text-blue-700",
  posted: "bg-emerald-50 text-emerald-700",
  pending_approval: "bg-violet-50 text-violet-700",
};

const DEMO_PLATFORMS = [
  { platform: "Instagram", handle: "@yourbrand", followers: 12400, status: "disconnected" },
  { platform: "Facebook", handle: "Your Brand", followers: 8200, status: "disconnected" },
  { platform: "LinkedIn", handle: "Your Brand Inc", followers: 3100, status: "disconnected" },
  { platform: "TikTok", handle: "@yourbrand", followers: 0, status: "disconnected" },
];

export default function SocialDashboard() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: "Instagram", handle: "", status: "disconnected", followers: "" });
  const [newPost, setNewPost] = useState({ caption: "", platforms: "Instagram", status: "draft" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [aRes, pRes] = await Promise.all([
      supabase.from("social_accounts").select("*").eq("client_id", activeClientId).order("platform"),
      supabase.from("social_posts").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setAccounts(aRes.data || []);
    setPosts(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const addAccount = async () => {
    if (!activeClientId || !newAccount.platform) return;
    const { error } = await supabase.from("social_accounts").insert({
      client_id: activeClientId, platform: newAccount.platform,
      handle: newAccount.handle || null, status: newAccount.status,
      followers: parseInt(newAccount.followers) || 0,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Account Added" });
    setNewAccount({ platform: "Instagram", handle: "", status: "disconnected", followers: "" });
    setAccountOpen(false);
    fetchData();
  };

  const createPost = async () => {
    if (!activeClientId || !newPost.caption) return;
    const platforms = newPost.platforms.split(",").map(p => p.trim());
    const { error } = await supabase.from("social_posts").insert({
      client_id: activeClientId, caption: newPost.caption,
      platforms, status: newPost.status,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Post Created" });
    setNewPost({ caption: "", platforms: "Instagram", status: "draft" });
    setComposerOpen(false);
    fetchData();
  };

  const hasRealData = accounts.length > 0 || posts.length > 0;
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers || 0), 0);
  const connectedCount = accounts.filter(a => a.status === "connected").length;
  const totalPosts = posts.length;
  const scheduledPosts = posts.filter(p => p.status === "scheduled").length;
  const pendingApproval = posts.filter(p => p.status === "pending_approval").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Social Media" description="Manage content, track engagement, and grow your audience" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Social Media.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Social Media" description="Manage content, track engagement, and grow your audience">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setAccountOpen(true)}>
            <Wifi className="h-4 w-4" /> Add Account
          </Button>
          <Button className="gap-1.5" onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" /> New Post
          </Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel moduleName="Social Media" description="Manage social accounts, create and schedule posts, track engagement metrics, and manage content approvals. Connect your accounts or manage content manually." tips={["Add social accounts to track followers and engagement", "Create posts with draft, schedule, and approval workflows", "Demo platform data shows until accounts are connected"]} />

      {!hasRealData && (
        <SetupBanner
          icon={Share}
          title="Connect Your Social Accounts"
          description="Link your Instagram, Facebook, LinkedIn, and TikTok accounts to manage content, track engagement, and schedule posts from one dashboard."
          actionLabel="Add Accounts"
          onAction={() => setAccountOpen(true)}
          secondaryLabel="Create First Post"
          onSecondary={() => setComposerOpen(true)}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Followers" value={hasRealData ? totalFollowers.toLocaleString() : "—"} change={hasRealData ? `${connectedCount} connected` : "Add accounts"} changeType="neutral" icon={Users} />
        <MetricCard label="Connected Accounts" value={hasRealData ? String(connectedCount) : "—"} change={hasRealData ? `${accounts.length} total` : "Connect to track"} changeType={connectedCount > 0 ? "positive" : "neutral"} icon={Wifi} />
        <MetricCard label="Total Posts" value={hasRealData ? String(totalPosts) : "—"} change={hasRealData ? `${scheduledPosts} scheduled` : "Create first post"} changeType="neutral" icon={Send} />
        <MetricCard label="Pending Approval" value={hasRealData ? String(pendingApproval) : "—"} change={hasRealData ? "Awaiting review" : "Set up approval flow"} changeType={pendingApproval > 0 ? "negative" : "neutral"} icon={Calendar} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="accounts">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="accounts" className="rounded-md text-sm">Accounts</TabsTrigger>
            <TabsTrigger value="posts" className="rounded-md text-sm">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-4">
            {accounts.length === 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <DemoDataLabel />
                  <span className="text-[10px] text-muted-foreground">Add your social accounts to start managing them</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {DEMO_PLATFORMS.map((acc, i) => {
                    const Icon = PLATFORM_ICONS[acc.platform] || Eye;
                    return (
                      <motion.div key={i} className="card-widget p-5 rounded-2xl opacity-60" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 0.6, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
                              <Icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{acc.platform}</p>
                              <p className="text-xs text-muted-foreground">{acc.handle}</p>
                            </div>
                          </div>
                          <Badge className="text-[10px] bg-secondary text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" /> Not Connected
                          </Badge>
                        </div>
                        <div className="text-center pt-3 border-t border-border">
                          <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={() => setAccountOpen(true)}>Connect</Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((acc) => {
                  const Icon = PLATFORM_ICONS[acc.platform] || Eye;
                  const SIcon = acc.status === "connected" ? CheckCircle : acc.status === "needs_auth" ? AlertCircle : XCircle;
                  return (
                    <motion.div key={acc.id} className="card-widget p-5 rounded-2xl" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
                            <Icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{acc.platform}</p>
                            <p className="text-xs text-muted-foreground">{acc.handle || "—"}</p>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${STATUS_STYLE[acc.status] || "bg-secondary text-muted-foreground"}`}>
                          <SIcon className="h-3 w-3 mr-1" />
                          {acc.status === "needs_auth" ? "Needs Auth" : acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">Followers</span>
                        <span className="text-sm font-semibold tabular-nums">{(acc.followers || 0).toLocaleString()}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            {posts.length === 0 ? (
              <DataCard title="Content Calendar">
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Send className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No posts yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Create your first post to start building your content calendar.</p>
                  <Button size="sm" onClick={() => setComposerOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Post</Button>
                </div>
              </DataCard>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <motion.div key={post.id} className="card-widget p-5 rounded-2xl" initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-1.5">
                        {(post.platforms || []).map((pl: string) => (
                          <span key={pl} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{pl}</span>
                        ))}
                      </div>
                      <Badge className={POST_STATUS_STYLE[post.status] || "bg-secondary text-muted-foreground"}>{post.status}</Badge>
                    </div>
                    <p className="text-sm">{post.caption}</p>
                    {(post.likes > 0 || post.comments > 0 || post.shares > 0) && (
                      <div className="flex gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.comments}</span>
                        <span className="flex items-center gap-1"><Share className="h-3 w-3" /> {post.shares}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {(post.reach || 0).toLocaleString()}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Social Account</SheetTitle><SheetDescription>Track a social media account</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={newAccount.platform} onValueChange={v => setNewAccount(p => ({ ...p, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Instagram", "Facebook", "LinkedIn", "X (Twitter)", "TikTok", "YouTube"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Handle</Label><Input placeholder="@yourbrand" value={newAccount.handle} onChange={e => setNewAccount(p => ({ ...p, handle: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newAccount.status} onValueChange={v => setNewAccount(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="disconnected">Disconnected</SelectItem>
                  <SelectItem value="needs_auth">Needs Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Followers</Label><Input type="number" value={newAccount.followers} onChange={e => setNewAccount(p => ({ ...p, followers: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAccountOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addAccount}>Add Account</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Create Post</SheetTitle><SheetDescription>Compose and schedule across platforms</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Caption *</Label><Textarea placeholder="Write your post…" value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} className="min-h-[100px]" /></div>
            <div className="space-y-2"><Label>Platforms (comma-separated)</Label><Input placeholder="Instagram, Facebook" value={newPost.platforms} onChange={e => setNewPost(p => ({ ...p, platforms: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newPost.status} onValueChange={v => setNewPost(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setComposerOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={createPost}>Create Post</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
