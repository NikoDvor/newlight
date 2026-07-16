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
  Eye, Award, BarChart3, ClipboardList, Phone, UserCircle,
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

// Sourced from src/components/AdminSidebar.tsx (adminGroups + opsGroups).
const ADMIN_NAV: NavEntry[] = [
  // Top
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, groupLabel: "General" },
  { title: "Fix Now", url: "/admin/fix-now", icon: AlertTriangle, groupLabel: "General" },
  // Sales
  { title: "Sales Pipeline", url: "/admin/sales-pipeline", icon: GitBranch, groupLabel: "Sales" },
  { title: "Sales Control Center", url: "/admin/sales-control-center", icon: LayoutDashboard, groupLabel: "Sales" },
  { title: "Prospects", url: "/admin/prospects", icon: Contact, groupLabel: "Sales" },
  { title: "BDR Performance", url: "/admin/bdr-performance", icon: TrendingUp, groupLabel: "Sales" },
  { title: "Proposal Templates", url: "/admin/proposal-templates", icon: FileSignature, groupLabel: "Sales" },
  { title: "Sales Demo Creator", url: "/admin/sales-demo-creator", icon: Hammer, groupLabel: "Sales" },
  // Clients & Success
  { title: "Client Accounts", url: "/admin/clients", icon: Users, groupLabel: "Clients & Success" },
  { title: "Acquisition Analytics", url: "/admin/clients/acquisition-analytics", icon: TrendingUp, groupLabel: "Clients & Success" },
  { title: "Onboarding Ops", url: "/admin/onboarding-command-center", icon: Rocket, groupLabel: "Clients & Success" },
  { title: "Client Activation", url: "/admin/activation", icon: Zap, groupLabel: "Clients & Success" },
  { title: "Provision Queue", url: "/admin/provision", icon: ListChecks, groupLabel: "Clients & Success" },
  { title: "Client Monitoring", url: "/admin/monitoring", icon: Activity, groupLabel: "Clients & Success" },
  { title: "Client Success", url: "/admin/client-success", icon: Shield, groupLabel: "Clients & Success" },
  { title: "Retention", url: "/admin/client-intelligence/retention", icon: HeartPulse, groupLabel: "Clients & Success" },
  { title: "Signed Documents", url: "/admin/client-intelligence/signed-documents", icon: FileSignature, groupLabel: "Clients & Success" },
  { title: "Website Portfolio", url: "/admin/websites", icon: Globe, groupLabel: "Clients & Success" },
  // System
  { title: "Reports", url: "/admin/reports", icon: LineChart, groupLabel: "System" },
  { title: "Billing", url: "/admin/billing", icon: Wallet, groupLabel: "System" },
  { title: "System Settings", url: "/admin/settings", icon: SettingsIcon, groupLabel: "System" },
  // Ops Top
  { title: "AI Insights", url: "/admin/ops/ai-insights", icon: Sparkles, groupLabel: "Ops — General" },
  { title: "Growth Advisor", url: "/admin/ops/growth-advisor", icon: Brain, groupLabel: "Ops — General" },
  // Client Overview
  { title: "Business Health", url: "/admin/ops/business-health", icon: HeartPulse, groupLabel: "Client Overview" },
  { title: "Revenue Opportunities", url: "/admin/ops/revenue-opportunities", icon: TrendingUp, groupLabel: "Client Overview" },
  { title: "Priority Actions", url: "/admin/ops/priority-actions", icon: AlertTriangle, groupLabel: "Client Overview" },
  { title: "Live Activity Feed", url: "/admin/ops/live-activity", icon: Activity, groupLabel: "Client Overview" },
  // Growth Systems
  { title: "Website", url: "/admin/ops/website", icon: Globe, groupLabel: "Growth Systems" },
  { title: "SEO", url: "/admin/ops/seo", icon: Search, groupLabel: "Growth Systems" },
  { title: "Ads", url: "/admin/ops/ads", icon: Megaphone, groupLabel: "Growth Systems" },
  { title: "Social Media", url: "/admin/ops/social", icon: Share2, groupLabel: "Growth Systems" },
  { title: "CRM", url: "/admin/ops/crm", icon: Contact, groupLabel: "Growth Systems" },
  { title: "AI Visibility", url: "/admin/ops/ai-visibility", icon: Eye, groupLabel: "Growth Systems" },
  // Enterprise Services
  { title: "Reviews", url: "/admin/ops/reviews", icon: Star, groupLabel: "Enterprise Services" },
  { title: "Proposals", url: "/admin/ops/proposals", icon: FileSignature, groupLabel: "Enterprise Services" },
  { title: "Marketing Review", url: "/admin/marketing-review", icon: Megaphone, groupLabel: "Enterprise Services" },
  { title: "Content Templates", url: "/admin/marketing-templates", icon: FileText, groupLabel: "Enterprise Services" },
  { title: "Risk Profiles", url: "/admin/risk-profiles", icon: ShieldCheck, groupLabel: "Enterprise Services" },
  { title: "Promoters", url: "/admin/promoters", icon: Users, groupLabel: "Enterprise Services" },
  { title: "Households", url: "/admin/households", icon: Home, groupLabel: "Enterprise Services" },
  { title: "Webinars", url: "/admin/webinars", icon: Calendar, groupLabel: "Enterprise Services" },
  { title: "Workforce", url: "/admin/ops/workforce", icon: Briefcase, groupLabel: "Enterprise Services" },
  { title: "Team & Users", url: "/admin/team", icon: Users, groupLabel: "Enterprise Services" },
  { title: "Calendar", url: "/admin/ops/calendar", icon: Calendar, groupLabel: "Enterprise Services" },
  { title: "Manage Calendars", url: "/admin/ops/calendar-management", icon: CalendarCog, groupLabel: "Enterprise Services" },
  { title: "Forms", url: "/admin/ops/forms", icon: FileSignature, groupLabel: "Enterprise Services" },
  { title: "Calendar Sync", url: "/admin/ops/calendar-integrations", icon: CalendarCog, groupLabel: "Enterprise Services" },
  { title: "Email", url: "/admin/ops/email", icon: Mail, groupLabel: "Enterprise Services" },
  { title: "Notifications", url: "/admin/ops/notifications", icon: Bell, groupLabel: "Enterprise Services" },
  // Business Intelligence
  { title: "Market Research", url: "/admin/ops/market-research", icon: Search, groupLabel: "Business Intelligence" },
  { title: "Competitor Tracking", url: "/admin/ops/competitor-tracking", icon: TrendingUp, groupLabel: "Business Intelligence" },
  { title: "Meeting Intelligence", url: "/admin/ops/meeting-intelligence", icon: MessageSquare, groupLabel: "Business Intelligence" },
  { title: "Automation Workflows", url: "/admin/automations", icon: Zap, groupLabel: "Business Intelligence" },
  // Setup & Integrations
  { title: "Setup Center", url: "/admin/ops/setup-center", icon: ClipboardCheck, groupLabel: "Setup & Integrations" },
  { title: "Services & Products", url: "/admin/ops/services", icon: Package, groupLabel: "Setup & Integrations" },
  { title: "Brand Assets", url: "/admin/ops/brand-assets", icon: ImageIcon, groupLabel: "Setup & Integrations" },
  { title: "Integrations", url: "/admin/ops/integrations", icon: Plug, groupLabel: "Setup & Integrations" },
  { title: "Notetaker Webhooks", url: "/admin/notetaker-integrations", icon: Mic, groupLabel: "Setup & Integrations" },
  { title: "Onboarding", url: "/admin/ops/onboarding", icon: Rocket, groupLabel: "Setup & Integrations" },
  // Training & Support
  { title: "Support Tickets", url: "/admin/ops/support-tickets", icon: LifeBuoy, groupLabel: "Training & Support" },
  { title: "Knowledge Base", url: "/admin/ops/knowledge-base", icon: BookOpen, groupLabel: "Training & Support" },
  { title: "Help Desk", url: "/admin/ops/help-desk", icon: HeartPulse, groupLabel: "Training & Support" },
  { title: "Courses", url: "/admin/ops/training", icon: GraduationCap, groupLabel: "Training & Support" },
  { title: "How It Works", url: "/admin/how-it-works", icon: HelpCircle, groupLabel: "Training & Support" },
  // Ops Bottom
  { title: "Ops Reports", url: "/admin/ops/reports", icon: LineChart, groupLabel: "Ops — General" },
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
              heading={
                <span className="text-[10px] uppercase tracking-widest">
                  <Highlighted text={label} query={query} />
                </span>
              as any}
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
