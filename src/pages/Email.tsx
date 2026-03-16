import { useState, useEffect } from "react";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SetupBanner } from "@/components/SetupBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Mail, Send, Inbox as InboxIcon, FileText, Plus, Search, Star, StarOff,
  ArrowLeft, Reply, Trash2, UserPlus, Plug, CheckCircle, AlertCircle, RefreshCw
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { onEmailSent } from "@/lib/crmAutomations";
import { motion } from "framer-motion";

const CONNECTION_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground", icon: AlertCircle },
  access_needed: { label: "Access Needed", color: "bg-amber-50 text-amber-700", icon: AlertCircle },
  ready_to_connect: { label: "Ready to Connect", color: "bg-blue-50 text-blue-700", icon: Plug },
  connected: { label: "Connected", color: "bg-emerald-50 text-emerald-700", icon: CheckCircle },
  needs_reconnect: { label: "Needs Reconnect", color: "bg-orange-50 text-orange-700", icon: RefreshCw },
  error: { label: "Error", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

export default function EmailPage() {
  const { activeClientId } = useWorkspace();
  const [messages, setMessages] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState("inbox");
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [msgRes, connRes, cRes] = await Promise.all([
      supabase.from("email_messages").select("*").eq("client_id", activeClientId).order("sent_at", { ascending: false }).limit(100),
      supabase.from("email_connections").select("*").eq("client_id", activeClientId),
      supabase.from("crm_contacts").select("id, full_name, email").eq("client_id", activeClientId).limit(200),
    ]);
    setMessages(msgRes.data || []);
    setConnections(connRes.data || []);
    setContacts(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const activeConnection = connections.find(c => c.status === "connected");
  const primaryConnection = connections[0];

  const filteredMessages = messages.filter(m => {
    const matchFolder = m.folder === folder || (folder === "sent" && m.direction === "outbound");
    const matchSearch = !search || m.subject?.toLowerCase().includes(search.toLowerCase()) || m.from_name?.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  const markAsRead = async (msg: any) => {
    if (!msg.is_read) {
      await supabase.from("email_messages").update({ is_read: true }).eq("id", msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    setSelectedMsg(msg);
  };

  const toggleStar = async (msg: any, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("email_messages").update({ is_starred: !msg.is_starred }).eq("id", msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_starred: !m.is_starred } : m));
  };

  const sendReply = async () => {
    if (!activeClientId || !selectedMsg || !replyText.trim()) return;
    await supabase.from("email_messages").insert({
      client_id: activeClientId,
      connection_id: selectedMsg.connection_id,
      subject: `Re: ${selectedMsg.subject}`,
      from_address: activeConnection?.email_address || "you@company.com",
      from_name: activeConnection?.display_name || "You",
      to_address: selectedMsg.from_address,
      body_text: replyText,
      direction: "outbound",
      folder: "sent",
      is_read: true,
      thread_id: selectedMsg.thread_id || selectedMsg.id,
      sent_at: new Date().toISOString(),
      contact_id: selectedMsg.contact_id,
    });
    // Fire automation hook
    await onEmailSent(activeClientId, {
      id: "", to_address: selectedMsg.from_address,
      subject: `Re: ${selectedMsg.subject}`, contact_id: selectedMsg.contact_id,
    });
    toast({ title: "Reply sent" });
    setReplyText("");
    fetchData();
  };

  const sendCompose = async () => {
    if (!activeClientId || !compose.to || !compose.subject) return;
    // Try to match contact
    const matchedContact = contacts.find(c => c.email?.toLowerCase() === compose.to.toLowerCase());
    await supabase.from("email_messages").insert({
      client_id: activeClientId,
      connection_id: activeConnection?.id || null,
      subject: compose.subject,
      from_address: activeConnection?.email_address || "you@company.com",
      from_name: activeConnection?.display_name || "You",
      to_address: compose.to,
      body_text: compose.body,
      direction: "outbound",
      folder: "sent",
      is_read: true,
      sent_at: new Date().toISOString(),
      contact_id: matchedContact?.id || null,
    });
    await onEmailSent(activeClientId, {
      id: "", to_address: compose.to, subject: compose.subject,
      contact_id: matchedContact?.id || null,
    });
    toast({ title: "Email sent" });
    setCompose({ to: "", subject: "", body: "" });
    setComposeOpen(false);
    fetchData();
  };

  const linkContactToEmail = async (msgId: string, contactId: string) => {
    await supabase.from("email_messages").update({ contact_id: contactId }).eq("id", msgId);
    setSelectedMsg((prev: any) => prev ? { ...prev, contact_id: contactId } : prev);
    toast({ title: "Contact linked" });
    fetchData();
  };

  const unreadCount = messages.filter(m => !m.is_read && m.folder === "inbox").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Email" description="Unified email communication hub" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Email.</p></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7.5rem)]">
      <PageHeader title="Email" description="Manage customer communication from your connected email">
        <div className="flex gap-2">
          {!activeConnection && (
            <Button variant="outline" className="gap-1.5 text-xs" onClick={() => {
              if (!primaryConnection) {
                supabase.from("email_connections").insert({ client_id: activeClientId, provider: "gmail", status: "access_needed" }).then(() => fetchData());
              }
              toast({ title: "Email Connection", description: "Connect your Gmail or Outlook account from Settings → Integrations." });
            }}>
              <Plug className="h-3.5 w-3.5" /> Connect Email
            </Button>
          )}
          <Button className="gap-1.5" onClick={() => setComposeOpen(true)}><Plus className="h-4 w-4" /> Compose</Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Email"
        description="Read, reply to, and manage your business emails inside the app. Conversations are automatically linked to CRM contacts by email address."
        tips={["Emails are matched to CRM contacts automatically", "You can create new contacts from unknown senders", "Reply to emails without leaving the platform"]}
      />

      {/* Connection status banner */}
      {primaryConnection && primaryConnection.status !== "connected" && (
        <div className="mb-4 p-3 rounded-xl border border-border bg-secondary/50 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">Email connection: {CONNECTION_STATUS[primaryConnection.status]?.label || primaryConnection.status}</p>
            <p className="text-[10px] text-muted-foreground">{primaryConnection.provider === "gmail" ? "Google Workspace / Gmail" : "Microsoft / Outlook"} · {primaryConnection.email_address || "No email configured"}</p>
          </div>
          <Badge className={CONNECTION_STATUS[primaryConnection.status]?.color || "bg-muted text-muted-foreground"}>{CONNECTION_STATUS[primaryConnection.status]?.label || "Unknown"}</Badge>
        </div>
      )}

      {messages.length === 0 && !primaryConnection && (
        <SetupBanner icon={Mail} title="Connect Your Email"
          description="Connect your business email to manage customer communication inside NewLight. Support for Gmail and Outlook."
          actionLabel="Connect Email" onAction={() => {
            supabase.from("email_connections").insert({ client_id: activeClientId, provider: "gmail", status: "access_needed" }).then(() => fetchData());
            toast({ title: "Email connection initiated" });
          }} />
      )}

      <div className="flex gap-0 h-[calc(100%-6rem)] rounded-2xl overflow-hidden border border-border bg-card">
        {/* LEFT — folder nav + message list */}
        <div className="w-[300px] shrink-0 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex gap-1">
              {[
                { key: "inbox", label: "Inbox", count: unreadCount },
                { key: "sent", label: "Sent", count: 0 },
              ].map(f => (
                <button key={f.key} onClick={() => { setFolder(f.key); setSelectedMsg(null); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-1 ${folder === f.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
                  {f.label} {f.count > 0 && <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{f.count}</span>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..." className="pl-8 h-8 text-xs bg-background border-border" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="p-6 text-center"><p className="text-xs text-muted-foreground">No emails in {folder}</p></div>
            ) : filteredMessages.map(msg => (
              <button key={msg.id} onClick={() => markAsRead(msg)}
                className={`w-full text-left px-3 py-3 border-b border-border transition-colors ${selectedMsg?.id === msg.id ? "bg-secondary" : "hover:bg-secondary/50"} ${!msg.is_read ? "bg-primary/[0.03]" : ""}`}>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => toggleStar(msg, e)} className="shrink-0">
                    {msg.is_starred ? <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  <span className={`text-sm truncate flex-1 ${!msg.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>
                    {msg.direction === "outbound" ? `To: ${msg.to_address}` : msg.from_name || msg.from_address}
                  </span>
                </div>
                <p className={`text-xs truncate mt-0.5 ml-5 ${!msg.is_read ? "font-medium text-foreground" : "text-muted-foreground"}`}>{msg.subject || "(no subject)"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ""}</p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — message detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedMsg ? (
            <>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSelectedMsg(null)}><ArrowLeft className="h-3 w-3" /> Back</Button>
                  <div className="flex gap-1.5">
                    {selectedMsg.contact_id ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">CRM Linked</Badge>
                    ) : (
                      <Select onValueChange={v => linkContactToEmail(selectedMsg.id, v)}>
                        <SelectTrigger className="h-7 text-[10px] w-auto gap-1"><UserPlus className="h-3 w-3" /><SelectValue placeholder="Link Contact" /></SelectTrigger>
                        <SelectContent>{contacts.filter(c => c.email).map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground mt-2">{selectedMsg.subject || "(no subject)"}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedMsg.direction === "outbound" ? `To: ${selectedMsg.to_address}` : `From: ${selectedMsg.from_name || selectedMsg.from_address}`}
                  {" · "}{selectedMsg.sent_at ? new Date(selectedMsg.sent_at).toLocaleString() : ""}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-wrap text-sm">{selectedMsg.body_text || selectedMsg.body_html || "(empty message)"}</p>
                </div>
              </div>
              {selectedMsg.direction === "inbound" && (
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply…" className="min-h-[44px] flex-1 resize-none bg-background border-border" rows={2} />
                    <Button size="icon" className="shrink-0 self-end" onClick={sendReply} disabled={!replyText.trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
                <Mail className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <p className="text-sm text-muted-foreground">Select an email to read</p>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSE DIALOG */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground">New Email</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>To</Label><Input value={compose.to} onChange={e => setCompose(p => ({ ...p, to: e.target.value }))} placeholder="recipient@example.com" className="bg-background border-border" /></div>
            <div><Label>Subject</Label><Input value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject" className="bg-background border-border" /></div>
            <div><Label>Message</Label><Textarea value={compose.body} onChange={e => setCompose(p => ({ ...p, body: e.target.value }))} placeholder="Write your message..." className="bg-background border-border min-h-[120px]" /></div>
            <Button className="w-full gap-1.5" onClick={sendCompose} disabled={!compose.to || !compose.subject}>
              <Send className="h-4 w-4" /> Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
