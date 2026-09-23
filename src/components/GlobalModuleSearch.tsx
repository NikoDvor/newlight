import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Users, ListChecks, Zap, Activity, Shield, Hammer,
  Calendar, FileText, Rocket, Brain,
  HeartPulse, TrendingUp, AlertTriangle, Sparkles,
  LayoutDashboard, Contact, GitBranch, MessageSquare,
  FileSignature, Star, Share2, Megaphone, Globe,
  LineChart, Briefcase, Wallet, Plug, Settings as SettingsIcon,
  Mail, BookOpen, LifeBuoy, HelpCircle, GraduationCap,
  CalendarCog, Bell, Image as ImageIcon, Package, ClipboardCheck, Home, ShieldCheck, Mic,
  Eye, Award, BarChart3, ClipboardList, Phone, UserCircle, DollarSign,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface GlobalModuleSearchProps {
  /** "admin" = dark/glass header styling, "employee" = default token styling */
  variant?: "admin" | "employee";
}

interface NavEntry {
  title: string;
  url: string;
  groupLabel: string;
  icon: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav-derived search indices. Mirror the actual sidebar definitions verbatim
// so the search stays exhaustive without editing the sidebar files themselves.
// ─────────────────────────────────────────────────────────────────────────────

// Sourced from src/components/AdminSidebar.tsx (adminGroups).
const ADMIN_NAV: NavEntry[] = [
  // Top
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, groupLabel: "General" },
  { title: "Fix Now", url: "/admin/fix-now", icon: AlertTriangle, groupLabel: "General" },
  // Sales
  { title: "Client Pipeline Overview", url: "/admin/pipeline-insights", icon: BarChart3, groupLabel: "Sales" },
  { title: "Sales Control Center", url: "/admin/sales-control-center", icon: LayoutDashboard, groupLabel: "Sales" },
  { title: "Prospects", url: "/admin/prospects", icon: Contact, groupLabel: "Sales" },
  { title: "BDR Performance", url: "/admin/bdr-performance", icon: TrendingUp, groupLabel: "Sales" },
  { title: "BDR Meeting Analytics", url: "/admin/bdr-meeting-analytics", icon: BarChart3, groupLabel: "Sales" },
  { title: "Proposal Templates", url: "/admin/proposal-templates", icon: FileSignature, groupLabel: "Sales" },
  { title: "Sales Demo Creator", url: "/admin/sales-demo-creator", icon: Hammer, groupLabel: "Sales" },
  // Clients & Success
  { title: "Client Accounts", url: "/admin/clients", icon: Users, groupLabel: "Clients & Success" },
  { title: "Acquisition Analytics", url: "/admin/clients/acquisition-analytics", icon: TrendingUp, groupLabel: "Clients & Success" },
  { title: "Onboarding Ops", url: "/admin/onboarding-command-center", icon: Rocket, groupLabel: "Clients & Success" },
  { title: "Provision Queue", url: "/admin/provision", icon: ListChecks, groupLabel: "Clients & Success" },
  { title: "Client Monitoring", url: "/admin/monitoring", icon: Activity, groupLabel: "Clients & Success" },
  { title: "Client Success", url: "/admin/client-success", icon: Shield, groupLabel: "Clients & Success" },
  { title: "Website Portfolio", url: "/admin/websites", icon: Globe, groupLabel: "Clients & Success" },
  // System
  { title: "Reports", url: "/admin/reports", icon: LineChart, groupLabel: "System" },
  { title: "Billing", url: "/admin/billing", icon: Wallet, groupLabel: "System" },
  { title: "Client Revenue", url: "/admin/client-revenue", icon: DollarSign, groupLabel: "System" },
  { title: "System Settings", url: "/admin/settings", icon: SettingsIcon, groupLabel: "System" },
];

// Sourced from src/components/EmployeeLayout.tsx (navItems + BDR Certification).
const EMPLOYEE_NAV: NavEntry[] = [
  { title: "Dashboard", url: "/employee", icon: BarChart3, groupLabel: "Employee Portal" },
  { title: "My Leads", url: "/employee/leads", icon: ClipboardList, groupLabel: "Employee Portal" },
  { title: "Dialer", url: "/employee/dialer", icon: Phone, groupLabel: "Employee Portal" },
  { title: "Training Center", url: "/employee/training", icon: GraduationCap, groupLabel: "Employee Portal" },
  { title: "My Calendar", url: "/employee/calendar", icon: Calendar, groupLabel: "Employee Portal" },
  { title: "My Profile", url: "/employee/profile", icon: UserCircle, groupLabel: "Employee Portal" },
  { title: "BDR Certification", url: "/employee/certification/bdr", icon: Award, groupLabel: "Employee Portal" },
];

// Dedupe helper (by url).
function dedupeByUrl(entries: NavEntry[]): NavEntry[] {
  const seen = new Map<string, NavEntry>();
  for (const e of entries) if (!seen.has(e.url)) seen.set(e.url, e);
  return Array.from(seen.values());
}

const ADMIN_INDEX = dedupeByUrl(ADMIN_NAV);
const EMPLOYEE_INDEX = dedupeByUrl(EMPLOYEE_NAV);

// Highlight matched substring inside `text` for `query` (case-insensitive).
function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-[hsl(var(--nl-neon,211_96%_60%))]">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

export function GlobalModuleSearch({ variant = "employee" }: GlobalModuleSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const source = variant === "admin" ? ADMIN_INDEX : EMPLOYEE_INDEX;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? source.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.groupLabel.toLowerCase().includes(q),
        )
      : source;
    const byGroup = new Map<string, NavEntry[]>();
    for (const e of filtered) {
      if (!byGroup.has(e.groupLabel)) byGroup.set(e.groupLabel, []);
      byGroup.get(e.groupLabel)!.push(e);
    }
    return Array.from(byGroup.entries()).map(([label, items]) => ({ label, items }));
  }, [query, source]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    navigate(url);
  };

  const buttonCls =
    variant === "admin"
      ? "p-2 rounded-xl transition-all duration-200 hover:bg-white/10 group"
      : "p-2 rounded-md transition-colors hover:bg-accent";
  const iconCls =
    variant === "admin"
      ? "h-4 w-4 text-white/60 group-hover:text-white transition-colors"
      : "h-4 w-4 text-muted-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonCls}
        aria-label="Search modules"
        title="Search modules (⌘K)"
      >
        <Search className={iconCls} />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search pages by name or section…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No pages found for "{query}"</CommandEmpty>
          {grouped.map(({ label, items }) => (
            <CommandGroup
              key={label}
              heading={(
                <span className="text-[10px] uppercase tracking-widest">
                  <Highlighted text={label} query={query} />
                </span>
              ) as unknown as string}
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.url}
                    value={`${item.title} ${item.groupLabel} ${item.url}`}
                    onSelect={() => handleSelect(item.url)}
                    className="flex items-center gap-3 py-2"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">
                        <Highlighted text={item.title} query={query} />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">
                      {item.url}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
