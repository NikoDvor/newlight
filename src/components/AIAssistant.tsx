import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Bot, User } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const suggestedQuestions = [
  "What is still missing in my setup?",
  "What are my biggest growth opportunities?",
  "What tasks are overdue?",
  "Summarize my workspace this week",
  "Which channels are performing best?",
  "What reviews need recovery?",
];

export function AIAssistant() {
  const { activeClientId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            client_id: activeClientId,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service unavailable" }));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Something went wrong. Please try again."}` }]);
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your request right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))", boxShadow: "0 4px 24px -4px hsla(211,96%,56%,.5)" }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
            style={{ height: "min(600px, calc(100vh - 6rem))", background: "hsla(210,50%,99%,.95)", backdropFilter: "blur(24px)", boxShadow: "0 24px 80px -12px hsla(211,96%,40%,.25), 0 0 0 1px hsla(211,96%,56%,.12)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }}>
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-white" />
                <span className="text-sm font-bold text-white tracking-tight">Ask AI</span>
                <span className="text-[9px] font-medium bg-white/20 text-white px-1.5 py-0.5 rounded-full">Live</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(211 96% 56%)" }} />
                    <p className="text-sm font-semibold text-foreground">Ask AI — Your Workspace Intelligence</p>
                    <p className="text-xs text-muted-foreground mt-1">I have context on your CRM, calendar, reviews, setup status, and more.</p>
                  </div>
                  <div className="space-y-2">
                    {suggestedQuestions.map(q => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded-xl transition-all hover:shadow-md"
                        style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,56%,.1)" }}>
                        <span style={{ color: "hsl(211 96% 46%)" }}>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }}>
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "text-white" : "text-foreground prose prose-xs prose-blue"}`}
                    style={msg.role === "user"
                      ? { background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }
                      : { background: "hsla(210,40%,94%,.7)", border: "1px solid hsla(211,96%,56%,.08)" }}>
                    {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-secondary">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && !messages.find((m, i) => i === messages.length - 1 && m.role === "assistant") && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }}>
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex gap-1 px-3 py-2.5 rounded-xl" style={{ background: "hsla(210,40%,94%,.7)" }}>
                    {[0, 1, 2].map(d => (
                      <motion.div key={d} className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(211 96% 56%)" }}
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t" style={{ borderColor: "hsla(211,96%,56%,.08)" }}>
              <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about your business..."
                  className="flex-1 text-xs px-3 py-2.5 rounded-xl bg-secondary/60 border-0 outline-none focus:ring-1 transition-all" disabled={loading} />
                <button type="submit" disabled={!input.trim() || loading}
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }}>
                  <Send className="h-3.5 w-3.5 text-white" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
