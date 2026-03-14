import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Zap, Heart, DollarSign, ListChecks, Activity, Brain,
  Globe, Search, Megaphone, Share2, Users, Star,
  TrendingUp, Eye, Calendar, Workflow, Plug, Image,
  GraduationCap, FileText, Settings, CreditCard,
  ChevronLeft, ChevronDown, Wallet
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";
import { useState } from "react";

interface NavGroup {
  label: string;
  items: { title: string; url: string; icon: any }[];
}

const navStructure: ({ type: "item"; title: string; url: string; icon: any } | { type: "group"; label: string; items: { title: string; url: string; icon: any }[] })[] = [
  { type: "item", title: "Dashboard", url: "/", icon: LayoutDashboard },
  { type: "item", title: "AI Insights", url: "/ai-insights", icon: Zap },
  { type: "item", title: "Growth Advisor", url: "/growth-advisor", icon: Brain },
  {
    type: "group", label: "Client Overview",
    items: [
      { title: "Business Health", url: "/business-health", icon: Heart },
      { title: "Revenue Opportunities", url: "/revenue-opportunities", icon: DollarSign },
      { title: "Priority Actions", url: "/priority-actions", icon: ListChecks },
      { title: "Live Activity Feed", url: "/live-activity", icon: Activity },
    ],
  },
  {
    type: "group", label: "Growth Systems",
    items: [
      { title: "Website", url: "/website", icon: Globe },
      { title: "SEO", url: "/seo", icon: Search },
      { title: "Ads", url: "/paid-ads", icon: Megaphone },
      { title: "Social Media", url: "/social-media", icon: Share2 },
      { title: "CRM", url: "/crm", icon: Users },
      { title: "Reviews", url: "/reviews", icon: Star },
    ],
  },
  {
    type: "group", label: "Enterprise Services",
    items: [
      { title: "Finance", url: "/finance", icon: Wallet },
      { title: "Calendar", url: "/calendar", icon: Calendar },
    ],
  },
  {
    type: "group", label: "Business Intelligence",
    items: [
      { title: "Market Research", url: "/market-research", icon: TrendingUp },
      { title: "Competitor Tracking", url: "/competitor-tracking", icon: Eye },
      { title: "Meeting Intelligence", url: "/meeting-intelligence", icon: Calendar },
      { title: "Automation Workflows", url: "/automations", icon: Workflow },
    ],
  },
  {
    type: "group", label: "Setup & Integrations",
    items: [
      { title: "Complete Setup", url: "/client-setup", icon: Plug },
      { title: "Brand Assets", url: "/brand-assets", icon: Image },
      { title: "Integrations", url: "/integrations", icon: Plug },
      { title: "Onboarding", url: "/onboarding", icon: Workflow },
    ],
  },
  {
    type: "group", label: "Training",
    items: [
      { title: "Courses", url: "/training", icon: GraduationCap },
    ],
  },
  { type: "item", title: "Reports", url: "/reports", icon: FileText },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navStructure.forEach((entry) => {
      if (entry.type === "group") {
        init[entry.label] = entry.items.some((i) => isActive(i.url));
      }
    });
    return init;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItem = ({ item }: { item: { title: string; url: string; icon: any } }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className={`h-8 px-3 rounded-xl text-[12px] font-medium transition-all duration-200 group ${
            active
              ? "text-white font-semibold"
              : "text-white/70 hover:text-white hover:bg-white/[0.12]"
          }`}
          style={active ? {
            background: "hsla(0,0%,100%,.18)",
            boxShadow: "0 0 18px -4px hsla(0,0%,100%,.25), inset 0 0 0 1px hsla(0,0%,100%,.15)",
          } : undefined}
        >
          <Link to={item.url}>
            <item.icon className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
              active
                ? "drop-shadow-[0_0_6px_hsla(0,0%,100%,.7)]"
                : "group-hover:drop-shadow-[0_0_5px_hsla(0,0%,100%,.4)] group-hover:scale-110"
            }`} />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(170deg, hsl(211 90% 62%) 0%, hsl(215 80% 52%) 50%, hsl(218 75% 46%) 100%)"
      }} />
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-40" style={{
        background: "radial-gradient(ellipse at 50% 0%, hsla(197,92%,78%,.5), transparent 70%)"
      }} />

      <SidebarHeader className="p-3 relative z-10">
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{
                background: "hsla(0,0%,100%,.2)",
                boxShadow: "0 0 20px -4px hsla(0,0%,100%,.35), inset 0 0 0 1px hsla(0,0%,100%,.15)"
              }}>
                <Zap className="h-4 w-4 text-white drop-shadow-[0_0_6px_hsla(0,0%,100%,.6)]" />
              </div>
              <span className="font-bold text-[14px] tracking-tight text-white drop-shadow-[0_1px_2px_hsla(0,0%,0%,.15)]">NewLight</span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-xl flex items-center justify-center mx-auto" style={{
              background: "hsla(0,0%,100%,.2)",
              boxShadow: "0 0 20px -4px hsla(0,0%,100%,.35), inset 0 0 0 1px hsla(0,0%,100%,.15)"
            }}>
              <Zap className="h-4 w-4 text-white drop-shadow-[0_0_6px_hsla(0,0%,100%,.6)]" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 relative z-10">
        {navStructure.map((entry, idx) => {
          if (entry.type === "item") {
            return (
              <SidebarGroup key={idx} className="py-0.5">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavItem item={entry as any} />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const group = entry as { type: "group"; label: string; items: any[] };
          const isOpen = openGroups[group.label] ?? false;

          return (
            <SidebarGroup key={idx} className="py-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50 hover:text-white/70 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
              )}
              {(collapsed || isOpen) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item: any) => (
                      <NavItem key={item.title} item={item} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3 relative z-10">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.12] transition-all duration-200 group"
            >
              <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
