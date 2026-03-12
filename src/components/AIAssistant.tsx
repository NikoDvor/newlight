import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestedQuestions = [
  "How can I get more customers this month?",
  "What is wrong with my website?",
  "How can I improve my social media?",
  "Why are my leads not converting?",
];

const aiResponses: Record<string, string> = {
  "How can I get more customers this month?":
    "Based on your current data, I recommend:\n\n1. **Increase Google Ads budget by 20%** — your CPC dropped 12% this week, so you can capture more leads at lower cost.\n2. **Launch a retargeting campaign** on Facebook targeting visitors who didn't convert.\n3. **Activate your email nurture sequence** — 42% of leads go cold after 7 days.\n4. **Post 3x more on LinkedIn** — your engagement is up 35%.\n\nEstimated impact: **+25-35 new leads this month**.",
  "What is wrong with my website?":
    "I've analyzed your website performance:\n\n⚠️ **Page load speed is 4.2s** (should be under 2.5s)\n⚠️ **Mobile bounce rate is 68%** (industry avg: 45%)\n⚠️ **CTA conversion rate is 2.1%** (below 6.1% average)\n\n**Recommended actions:**\n1. Compress images and enable lazy loading\n2. Change CTA from 'Contact Us' to 'Get Free Quote' (+23% conversion)\n3. Add social proof near the CTA button",
  "How can I improve my social media?":
    "Your social media analysis shows:\n\n📊 **Instagram**: Posting 4x/week. Recommend 7x/week.\n📊 **LinkedIn**: Engagement up 35% — double down on thought leadership.\n📊 **Facebook**: Engagement declining. Try video content.\n\n**Quick wins:**\n1. Post during peak hours (Tues-Thurs, 10am-2pm)\n2. Use carousel posts — they get 3x more engagement\n3. Respond to all comments within 1 hour\n\nEstimated reach increase: **+35%**",
  "Why are my leads not converting?":
    "I found several conversion bottlenecks:\n\n🔴 **3 leads stuck in 'Contacted' stage for 7+ days** — create follow-up tasks immediately\n🔴 **Landing page CVR is 4.2%** vs industry 6.1%\n🟡 **Email open rate dropped 8%** — test new subject lines\n🟡 **No automated follow-up** after first contact\n\n**Priority actions:**\n1. Set up automated text reminders for stale leads\n2. A/B test landing page headlines\n3. Create a 5-email nurture sequence\n\nEstimated conversion improvement: **+18-25%**",
};

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const response =
        aiResponses[text.trim()] ||
        "Based on your platform data, I recommend focusing on your highest-impact channels. Your Google Ads are performing well with declining CPC — consider increasing budget there. Also, your review growth has slowed — activate the automated review request campaign to boost social proof. Would you like me to dive deeper into any specific area?";
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setTyping(false);
    }, 1200);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))",
              boxShadow: "0 4px 24px -4px hsla(211,96%,56%,.5), 0 0 48px -8px hsla(211,96%,56%,.3)",
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
            style={{
              height: "min(560px, calc(100vh - 6rem))",
              background: "hsla(210,50%,99%,.92)",
              backdropFilter: "blur(24px) saturate(1.5)",
              WebkitBackdropFilter: "blur(24px) saturate(1.5)",
              boxShadow: "0 24px 80px -12px hsla(211,96%,40%,.25), 0 0 0 1px hsla(211,96%,56%,.12)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))",
              }}
            >
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-white" />
                <span className="text-sm font-bold text-white tracking-tight">NewLight AI</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(211 96% 56%)" }} />
                    <p className="text-sm font-semibold text-foreground">How can I help you grow?</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask me anything about your business</p>
                  </div>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded-xl transition-all duration-200 hover:shadow-md"
                        style={{
                          background: "hsla(211,96%,56%,.06)",
                          border: "1px solid hsla(211,96%,56%,.1)",
                        }}
                      >
                        <span style={{ color: "hsl(211 96% 46%)" }}>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }}
                    >
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "text-white"
                        : "text-foreground"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }
                        : { background: "hsla(210,40%,94%,.7)", border: "1px solid hsla(211,96%,56%,.08)" }
                    }
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-secondary">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              {typing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))" }}
                  >
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex gap-1 px-3 py-2.5 rounded-xl" style={{ background: "hsla(210,40%,94%,.7)" }}>
                    {[0, 1, 2].map((d) => (
                      <motion.div
                        key={d}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "hsl(211 96% 56%)" }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t" style={{ borderColor: "hsla(211,96%,56%,.08)" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask NewLight AI..."
                  className="flex-1 text-xs px-3 py-2.5 rounded-xl bg-secondary/60 border-0 outline-none focus:ring-1 transition-all"
                  style={{ focusRing: "hsl(211 96% 56%)" } as any}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 50%))",
                  }}
                >
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
