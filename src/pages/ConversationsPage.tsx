import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Plus, Send, Search, Mail, Phone, Globe, FileText,
  Clock, CheckCircle2, AlertTriangle, User, ArrowRight, StickyNote,
  Users, Briefcase, Headphones, CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";

const STATUS_STYLE: Record<string, string> = {
  Open: "bg-blue-50 text-blue-700",
  Waiting: "bg-amber-50 text-amber-600",
  "Pending Follow-Up": "bg-indigo-50 text-indigo-700",
  Closed: "bg-secondary text-muted-foreground",
  Archived: "bg-secondary text-muted-foreground",
};

const TYPE_ICON: Record<string, any> = {
  Sales: Briefcase, "Client Support": Headphones, Appointment: Clock,
  General: MessageSquare, Internal: StickyNote, Billing: CreditCard,
  "Review Recovery": AlertTriangle,
};

const CHANNEL_ICON: Record<string, any> = {
  Email: Mail, SMS: Phone, InApp: MessageSquare, Note: FileText,
};

interface ConversationsPageProps {
  scopeType?: "admin_global" | "admin_sales" | "client_workspace";
  title?: string;
}

export default function ConversationsPage({ scopeType, title = "Conversations" }: ConversationsPageProps) {
  const { activeClientId, user, isAdmin } = useWorkspace();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [newMsg, setNewMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: "", type: "General", channel: "InApp" });

  const effectiveScope = scopeType || (isAdmin ? "admin_global" : "client_workspace");

  const [contacts, setContacts] = useState<any[]>([]);

  const load = async () => {
    let q = supabase.from("conversations" as any).select("*").order("last_message_at", { ascending: false }).limit(100);
    if (effectiveScope === "client_workspace" && activeClientId) {
      q = q.eq("client_id", activeClientId).eq("workspace_scope_type", "client_workspace");
    } else if (effectiveScope === "admin_sales") {
      q = q.eq("workspace_scope_type", "admin_sales");
    }
    const [convRes, cRes] = await Promise.all([
      q,
      activeClientId ? supabase.from("crm_contacts").select("id, full_name").eq("client_id", activeClientId).limit(500) : Promise.resolve({ data: [] }),
    ]);
    setConversations(convRes.data ?? []);
    setContacts(cRes.data || []);
  };

  const getContactName = (id: string) => contacts.find(c => c.id === id)?.full_name || null;

  useEffect(() => { load(); }, [activeClientId, effectiveScope]);

  const openConvo = async (c: any) => {
    setSelected(c);
    const { data } = await supabase.from("conversation_messages" as any)
      .select("*").eq("conversation_id", c.id).order("sent_at", { ascending: true });
    setMessages(data ?? []);
  };

  const sendMessage = async () => {
    if (!selected || !newMsg.trim()) return;
    await supabase.from("conversation_messages" as any).insert({
      conversation_id: selected.id,
      client_id: selected.client_id,
      sender_user_id: user?.id,
      sender_type: "Internal User",
      direction: "Outgoing",
      message_channel: "InApp",
      message_body: newMsg,
      delivery_status: "Sent",
    } as any);
    await supabase.from("conversations" as any).update({ last_message_at: new Date().toISOString() } as any).eq("id", selected.id);
    setNewMsg("");
    openConvo(selected);
  };

  const createConvo = async () => {
    if (!form.subject) return;
    const payload: any = {
      subject: form.subject,
      conversation_type: form.type,
      workspace_scope_type: effectiveScope,
      status: "Open",
    };
    if (activeClientId && effectiveScope === "client_workspace") payload.client_id = activeClientId;
    await supabase.from("conversations" as any).insert(payload);
    toast({ title: "Conversation created" });
    setShowCreate(false);
    setForm({ subject: "", type: "General", channel: "InApp" });
    load();
  };

  const filtered = conversations.filter(c => {
    if (tab !== "all" && c.status !== tab) return false;
    if (search && !c.subject?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">Manage conversations and follow-ups</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />New</Button>
      </div>

      <div className="flex-1 flex overflow-hidden mx-4 md:mx-6 mb-4 rounded-xl border border-border bg-card">
        {/* LEFT LIST */}
        <div className="w-full md:w-[320px] shrink-0 border-r border-border flex flex-col">
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", "Open", "Waiting", "Pending Follow-Up", "Closed"].map(s => (
                <Button key={s} size="sm" variant={tab === s ? "default" : "ghost"} className="h-6 text-[11px] px-2"
                  onClick={() => setTab(s)}>{s === "all" ? "All" : s}</Button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : filtered.map(c => {
              const TIcon = TYPE_ICON[c.conversation_type] || MessageSquare;
              return (
                <div key={c.id}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-accent/30 transition-colors ${selected?.id === c.id ? "bg-accent/50" : ""}`}
                  onClick={() => openConvo(c)}>
                  <div className="flex items-start gap-2">
                    <TIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.subject || "No subject"}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4">{c.conversation_type}</Badge>
                        <Badge className={`text-[10px] h-4 ${STATUS_STYLE[c.status] || "bg-secondary"}`}>{c.status}</Badge>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT DETAIL */}
        <div className="hidden md:flex flex-1 flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-foreground">{selected.subject}</h2>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline">{selected.conversation_type}</Badge>
                      <Badge className={STATUS_STYLE[selected.status] || "bg-secondary"}>{selected.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from("conversations" as any).update({ status: "Closed" } as any).eq("id", selected.id);
                      setSelected({ ...selected, status: "Closed" }); load();
                    }}>Close</Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation below.</p>
                ) : messages.map(m => {
                  const isOutgoing = m.direction === "Outgoing";
                  const ChIcon = CHANNEL_ICON[m.message_channel] || MessageSquare;
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${isOutgoing ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <ChIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{m.sender_type} · {m.message_channel}</span>
                        </div>
                        <p className="text-sm">{m.message_body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.sent_at).toLocaleString()}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Compose */}
              <div className="p-3 border-t border-border flex gap-2">
                <Textarea placeholder="Type a message…" rows={1} value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  className="flex-1 min-h-[40px] resize-none" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader><SheetTitle>New Conversation</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Sales", "Client Support", "Appointment", "General", "Internal", "Billing", "Review Recovery"].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={createConvo} disabled={!form.subject}>Create</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
