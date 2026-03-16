import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { SetupBanner } from "@/components/SetupBanner";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Plus, Send, Users, Hash, LinkIcon, User
} from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Chat() {
  const { activeClientId, user } = useWorkspace();
  const [threads, setThreads] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadName, setNewThreadName] = useState("");
  const [newThreadType, setNewThreadType] = useState("team");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("chat_threads")
      .select("*")
      .eq("client_id", activeClientId)
      .order("updated_at", { ascending: false });
    setThreads(data || []);
    setLoading(false);
  };

  const fetchMessages = async (threadId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => { fetchThreads(); }, [activeClientId]);

  useEffect(() => {
    if (!selectedThread) return;
    fetchMessages(selectedThread.id);
    // Realtime
    const channel = supabase
      .channel(`chat-${selectedThread.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${selectedThread.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as any]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedThread?.id]);

  const createThread = async () => {
    if (!activeClientId || !newThreadName.trim()) return;
    const { data, error } = await supabase.from("chat_threads").insert({
      client_id: activeClientId,
      thread_name: newThreadName.trim(),
      thread_type: newThreadType,
      created_by: user?.id,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thread created" });
    setNewThreadOpen(false);
    setNewThreadName("");
    fetchThreads();
    if (data) { setSelectedThread(data); fetchMessages(data.id); }
  };

  const sendMessage = async () => {
    if (!activeClientId || !selectedThread || !newMessage.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({
      client_id: activeClientId,
      thread_id: selectedThread.id,
      sender_id: user?.id,
      sender_name: user?.email?.split("@")[0] || "User",
      message: newMessage.trim(),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewMessage("");
    // Update thread updated_at
    await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", selectedThread.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Chat" description="Team conversations and record discussions" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to use Chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7.5rem)]">
      <PageHeader title="Chat" description="Team conversations and record discussions">
        <Button className="gap-1.5" onClick={() => setNewThreadOpen(true)}>
          <Plus className="h-4 w-4" /> New Thread
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Chat"
        description="Chat provides internal team messaging and record-level discussion threads. Create team channels or attach conversations to CRM contacts, deals, appointments, and tasks for contextual collaboration."
        tips={[
          "Team threads are for general team communication",
          "Record threads attach conversations to CRM contacts, deals, or tasks",
          "Messages update in real time across all connected users",
        ]}
      />

      {threads.length === 0 && !loading ? (
        <SetupBanner
          icon={MessageSquare}
          title="Start a Conversation"
          description="Create your first chat thread to collaborate with your team. You can also attach discussion threads to CRM records, deals, and appointments."
          actionLabel="Create First Thread"
          onAction={() => setNewThreadOpen(true)}
        />
      ) : (
        <div className="flex gap-0 h-[calc(100%-8rem)] rounded-2xl overflow-hidden border border-border bg-card">
          {/* Thread list */}
          <div className="w-[260px] shrink-0 border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => setNewThreadOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New Thread
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedThread(t); fetchMessages(t.id); }}
                  className={`w-full text-left px-3 py-3 border-b border-border transition-colors ${
                    selectedThread?.id === t.id ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.thread_type === "team" ? (
                      <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{t.thread_name || "Untitled"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[9px] h-4">{t.thread_type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedThread ? (
              <>
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    {selectedThread.thread_type === "team" ? <Hash className="h-4 w-4 text-primary" /> : <LinkIcon className="h-4 w-4 text-primary" />}
                    <h3 className="text-sm font-semibold">{selectedThread.thread_name}</h3>
                    <Badge variant="secondary" className="text-[10px]">{selectedThread.thread_type}</Badge>
                  </div>
                  {selectedThread.linked_type && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Linked to {selectedThread.linked_type}: {selectedThread.linked_id}
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  {messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary rounded-bl-md"
                        }`}>
                          {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.sender_name}</p>}
                          <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "opacity-60" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-border flex gap-2">
                  <Textarea
                    placeholder="Type a message…"
                    className="min-h-[44px] flex-1 resize-none"
                    rows={1}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button size="icon" className="shrink-0 self-end" onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a thread or create a new one
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Thread Sheet */}
      <Sheet open={newThreadOpen} onOpenChange={setNewThreadOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Chat Thread</SheetTitle>
            <SheetDescription>Start a new team conversation or record discussion</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Thread Name *</Label>
              <Input value={newThreadName} onChange={e => setNewThreadName(e.target.value)} placeholder="e.g. General, Sales Team, Project X" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                {[
                  { value: "team", label: "Team Chat", icon: Users },
                  { value: "record", label: "Record Discussion", icon: LinkIcon },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewThreadType(opt.value)}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                      newThreadType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <opt.icon className={`h-4 w-4 ${newThreadType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setNewThreadOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={createThread} disabled={!newThreadName.trim()}>
                <Plus className="h-4 w-4" /> Create
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
