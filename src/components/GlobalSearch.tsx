import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search, Users, Building2, Briefcase, CheckSquare, Calendar,
  Mail, MessageSquare, FileText, Star, Headphones, BookOpen,
  HardHat, Sparkles, DollarSign
} from "lucide-react";

interface SearchResult {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
  url: string;
  icon: typeof Users;
}

const TYPE_META: Record<string, { icon: typeof Users; label: string }> = {
  contact: { icon: Users, label: "Contact" },
  company: { icon: Building2, label: "Company" },
  deal: { icon: DollarSign, label: "Deal" },
  task: { icon: CheckSquare, label: "Task" },
  appointment: { icon: Calendar, label: "Appointment" },
  worker: { icon: HardHat, label: "Worker" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !activeClientId) { setResults([]); return; }
    setLoading(true);
    const term = `%${q.trim()}%`;
    const all: SearchResult[] = [];

    const [contacts, companies, deals, tasks, events, workers] = await Promise.all([
      supabase.from("crm_contacts").select("id, full_name, email, phone").eq("client_id", activeClientId).or(`full_name.ilike.${term},email.ilike.${term}`).limit(6),
      supabase.from("crm_companies").select("id, company_name, industry").eq("client_id", activeClientId).ilike("company_name", term).limit(5),
      supabase.from("crm_deals").select("id, deal_name, deal_value").eq("client_id", activeClientId).ilike("deal_name", term).limit(5),
      supabase.from("crm_tasks").select("id, title, status").eq("client_id", activeClientId).ilike("title", term).limit(5),
      supabase.from("calendar_events").select("id, title, start_time").eq("client_id", activeClientId).ilike("title", term).limit(5),
      supabase.from("workers").select("id, full_name, role_title").eq("client_id", activeClientId).ilike("full_name", term).limit(5),
    ]);

    contacts.data?.forEach(c => all.push({ id: c.id, type: "contact", label: c.full_name, sublabel: c.email || c.phone || undefined, url: `/crm/contact/${c.id}`, icon: Users }));
    companies.data?.forEach(c => all.push({ id: c.id, type: "company", label: c.company_name, sublabel: c.industry || undefined, url: `/crm/company/${c.id}`, icon: Building2 }));
    deals.data?.forEach(d => all.push({ id: d.id, type: "deal", label: d.deal_name, sublabel: d.deal_value ? `$${Number(d.deal_value).toLocaleString()}` : undefined, url: `/crm`, icon: DollarSign }));
    tasks.data?.forEach(t => all.push({ id: t.id, type: "task", label: t.title, sublabel: t.status, url: `/tasks`, icon: CheckSquare }));
    events.data?.forEach(e => all.push({ id: e.id, type: "appointment", label: e.title, sublabel: e.start_time ? new Date(e.start_time).toLocaleDateString() : undefined, url: `/calendar`, icon: Calendar }));
    workers.data?.forEach(w => all.push({ id: w.id, type: "worker", label: w.full_name, sublabel: w.role_title || undefined, url: `/workforce`, icon: HardHat }));

    setResults(all);
    setSelectedIdx(0);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const go = (r: SearchResult) => {
    setOpen(false);
    navigate(r.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[selectedIdx]) { go(results[selectedIdx]); }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
        style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,56%,.08)" }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border font-mono">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 bg-card border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              placeholder="Search contacts, deals, tasks, appointments, workers..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 shadow-none focus-visible:ring-0 h-12 text-sm bg-transparent"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!query.trim() && (
              <div className="py-10 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Search across your entire workspace</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Contacts · Companies · Deals · Tasks · Appointments · Workers</p>
              </div>
            )}

            {query.trim() && results.length === 0 && !loading && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No results for "{query}"</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-1">
                {results.map((r, i) => {
                  const meta = TYPE_META[r.type];
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => go(r)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === selectedIdx ? "bg-primary/5" : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                        <r.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                        {r.sublabel && <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide shrink-0">
                        {meta?.label || r.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {loading && (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground animate-pulse">Searching...</p>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground/50">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
