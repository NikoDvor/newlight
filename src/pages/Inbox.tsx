import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { mockConversations, type Conversation } from "@/lib/salesData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Globe, Phone, FileText, Send, CheckCircle, UserPlus, Plus, StickyNote } from "lucide-react";

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  web_lead: Globe,
  call: Phone,
  internal: FileText,
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  web_lead: "Web Lead",
  call: "Call Note",
  internal: "Internal",
};

export default function Inbox() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selected, setSelected] = useState<Conversation>(conversations[0]);
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const filtered = channelFilter === "all" ? conversations : conversations.filter((c) => c.channel === channelFilter);

  return (
    <div className="h-[calc(100vh-7.5rem)]">
      <PageHeader title="Inbox" description="Unified conversations across all channels" />

      <div className="flex gap-0 h-[calc(100%-5rem)] rounded-2xl overflow-hidden border border-border bg-card">
        {/* LEFT — conversation list */}
        <div className="w-[280px] shrink-0 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <Button size="sm" className="w-full gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Conversation
            </Button>
          </div>
          <div className="px-3 py-2 border-b border-border flex gap-1 flex-wrap">
            {["all", "email", "sms", "web_lead", "call", "internal"].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                  channelFilter === ch ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {ch === "all" ? "All" : CHANNEL_LABEL[ch]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const Icon = CHANNEL_ICON[c.channel];
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-3 py-3 border-b border-border transition-colors ${
                    selected?.id === c.id ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{c.contactName}</span>
                    {c.unread && <span className="ml-auto h-2 w-2 rounded-full bg-accent shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.subject}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.time}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* MIDDLE — thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{selected.subject}</h3>
                  <p className="text-xs text-muted-foreground">{selected.contactName} · {CHANNEL_LABEL[selected.channel]}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Resolve</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs"><UserPlus className="h-3 w-3" /> Assign</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs"><StickyNote className="h-3 w-3" /> Note</Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      m.direction === "outbound"
                        ? "bg-accent text-accent-foreground rounded-br-md"
                        : "bg-secondary rounded-bl-md"
                    }`}>
                      <p className="text-sm">{m.text}</p>
                      <p className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-accent-foreground/70" : "text-muted-foreground"}`}>{m.from} · {m.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <Textarea placeholder="Type your reply…" className="min-h-[44px] flex-1 resize-none" rows={1} />
                <Button size="icon" className="shrink-0 self-end"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>
          )}
        </div>

        {/* RIGHT — contact summary */}
        <div className="w-[250px] shrink-0 border-l border-border p-4 overflow-y-auto hidden lg:block">
          {selected && selected.channel !== "internal" ? (
            <div className="space-y-4">
              <div>
                <p className="metric-label">Contact</p>
                <p className="text-sm font-medium mt-1">{selected.contactName}</p>
                <p className="text-xs text-muted-foreground">{selected.company}</p>
              </div>
              <div>
                <p className="metric-label">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </div>
              </div>
              <div>
                <p className="metric-label">Next Task</p>
                <p className="text-sm text-accent mt-1">{selected.nextTask || "None"}</p>
              </div>
              <div className="card-widget p-3 rounded-xl">
                <p className="metric-label mb-2">AI Suggested Reply</p>
                <p className="text-xs text-muted-foreground italic">"Thank you for reaching out! I'd love to schedule a quick call to discuss your needs. Would tomorrow at 2 PM work?"</p>
              </div>
              <div>
                <p className="metric-label mb-1">Notes</p>
                <Textarea placeholder="Add note…" className="text-xs min-h-[60px]" />
                <Button size="sm" variant="outline" className="mt-1.5 w-full text-xs">Save Note</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No contact selected</p>
          )}
        </div>
      </div>
    </div>
  );
}
