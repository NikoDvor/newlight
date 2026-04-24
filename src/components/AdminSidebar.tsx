import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, ListChecks, AlertTriangle,
  ScrollText, FileCode, Package, Settings, ChevronLeft, Zap, Activity, Shield, LogOut, BarChart3, Brain, ClipboardCheck, Hammer, Smartphone, HelpCircle,
  Briefcase, Calendar, FileText, PenTool, DollarSign, ChevronDown, Rocket, Map, Sparkles, GraduationCap
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";
import { useState } from "react";

interface NavGroup {
  label: string;
  items: { title: string; url: string; icon: any }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Executive Dashboard", url: "/admin/executive", icon: BarChart3 },
      { title: "Client Monitoring", url: "/admin/monitoring", icon: Activity },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Sales Pipeline", url: "/admin/sales-pipeline", icon: Briefcase },
      { title: "Sales Control Center", url: "/admin/sales-control-center", icon: DollarSign },
      { title: "Sales Demo Creator", url: "/admin/sales-demo-creator", icon: Zap },
      { title: "Onboarding Form", url: "/get-started", icon: Rocket },
      { title: "Prospects", url: "/admin/prospects", icon: UserPlus },
      { title: "Proposal Templates", url: "/admin/proposal-templates", icon: PenTool },
    ],
  },
  {
    label: "Clients & Success",
    items: [
      { title: "Clients", url: "/admin/clients", icon: Users },
      { title: "Client Success", url: "/admin/client-success", icon: Shield },
      { title: "Team & Users", url: "/admin/team", icon: Shield },
      { title: "Training Center", url: "/admin/training-center", icon: GraduationCap },
      { title: "Onboarding Ops", url: "/admin/onboarding-command-center", icon: Rocket },
      { title: "Client Activation", url: "/admin/activation", icon: ClipboardCheck },
      { title: "Master Activation", url: "/admin/master-activation", icon: Zap },
      { title: "Demo Builds", url: "/admin/demo-builds", icon: Hammer },
      { title: "Provision Queue", url: "/admin/provision", icon: ListChecks },
    ],
  },
  {
    label: "Communications",
    items: [
      { title: "Conversations", url: "/admin/conversations", icon: Calendar },
      { title: "Follow-Up Queue", url: "/admin/follow-ups", icon: ListChecks },
      { title: "Message Templates", url: "/admin/message-templates", icon: FileText },
    ],
  },
  {
    label: "Revenue & Ops",
    items: [
      { title: "Revenue & Billing", url: "/admin/billing", icon: DollarSign },
      { title: "Revenue Expansion", url: "/admin/revenue-expansion", icon: Sparkles },
      { title: "Implementation Queue", url: "/admin/implementation-queue", icon: ListChecks },
      { title: "Implementation Requests", url: "/admin/implementation-requests", icon: ClipboardCheck },
      { title: "Automations", url: "/admin/automations", icon: Zap },
      { title: "Reports", url: "/admin/reports", icon: BarChart3 },
      { title: "Fix Now", url: "/admin/fix-now", icon: AlertTriangle },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Architecture", url: "/admin/architecture", icon: Map },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
      { title: "Templates", url: "/admin/templates", icon: FileCode },
      { title: "Package Access", url: "/admin/packages", icon: Package },
      { title: "Launch Readiness", url: "/admin/launch-checklist", icon: Rocket },
      { title: "Growth Advisor", url: "/admin/growth-advisor", icon: Brain },
      { title: "App Experience", url: "/admin/app-settings", icon: Smartphone },
      { title: "How It Works", url: "/admin/how-it-works", icon: HelpCircle },
      { title: "System Settings", url: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { signOut } = useWorkspace();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      init[g.label] = g.items.some((i) => isActive(i.url));
    });
    // Always open Overview
    init["Overview"] = true;
    return init;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(170deg, hsl(218 30% 14%) 0%, hsl(220 35% 10%) 50%, hsl(222 40% 8%) 100%)"
      }} />
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-30" style={{
        background: "radial-gradient(ellipse at 50% 0%, hsla(211,96%,60%,.4), transparent 70%)"
      }} />

      <SidebarHeader className="p-3 relative z-10">
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{
                background: "hsla(211,96%,60%,.2)",
                boxShadow: "0 0 20px -4px hsla(211,96%,60%,.35), inset 0 0 0 1px hsla(211,96%,60%,.15)"
              }}>
                <Zap className="h-4 w-4 text-[hsl(var(--nl-neon))] drop-shadow-[0_0_6px_hsla(211,96%,60%,.6)]" />
              </div>
              <div>
                <span className="font-bold text-[13px] tracking-tight text-white drop-shadow-[0_1px_2px_hsla(0,0%,0%,.15)]">NewLight</span>
                <span className="block text-[10px] text-white/40 font-medium">Admin Portal</span>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-xl flex items-center justify-center mx-auto" style={{
              background: "hsla(211,96%,60%,.2)",
              boxShadow: "0 0 20px -4px hsla(211,96%,60%,.35), inset 0 0 0 1px hsla(211,96%,60%,.15)"
            }}>
              <Zap className="h-4 w-4 text-[hsl(var(--nl-neon))] drop-shadow-[0_0_6px_hsla(211,96%,60%,.6)]" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 relative z-10">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          return (
            <SidebarGroup key={group.label} className="py-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
              )}
              {(collapsed || isOpen) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={collapsed ? item.title : undefined}
                            className={`h-8 px-3 rounded-xl text-[12px] font-medium transition-all duration-200 group ${
                              active
                                ? "text-white font-semibold"
                                : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                            }`}
                            style={active ? {
                              background: "hsla(211,96%,60%,.18)",
                              boxShadow: "0 0 18px -4px hsla(211,96%,60%,.25), inset 0 0 0 1px hsla(211,96%,60%,.15)",
                            } : undefined}
                          >
                            <Link to={item.url}>
                              <item.icon className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
                                active
                                  ? "drop-shadow-[0_0_6px_hsla(211,96%,60%,.7)]"
                                  : "group-hover:drop-shadow-[0_0_5px_hsla(211,96%,60%,.4)] group-hover:scale-110"
                              }`} />
                              {!collapsed && <span>{item.title}</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3 relative z-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200 group"
            >
              <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip={collapsed ? "Sign Out" : undefined}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
