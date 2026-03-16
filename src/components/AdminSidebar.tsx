import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, ListChecks, AlertTriangle,
  ScrollText, FileCode, Package, Settings, ChevronLeft, Zap, Activity, Shield, LogOut, BarChart3, Brain, ClipboardCheck, Hammer, Smartphone, HelpCircle
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Client Monitoring", url: "/admin/monitoring", icon: Activity },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Team & Users", url: "/admin/team", icon: Shield },
  { title: "Prospects", url: "/admin/prospects", icon: UserPlus },
  { title: "Client Activation", url: "/admin/activation", icon: ClipboardCheck },
  { title: "Demo Builds", url: "/admin/demo-builds", icon: Hammer },
  { title: "Provision Queue", url: "/admin/provision", icon: ListChecks },
  { title: "Fix Now", url: "/admin/fix-now", icon: AlertTriangle },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
  { title: "Templates", url: "/admin/templates", icon: FileCode },
  { title: "Package Access", url: "/admin/packages", icon: Package },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Growth Advisor", url: "/admin/growth-advisor", icon: Brain },
  { title: "App Experience", url: "/admin/app-settings", icon: Smartphone },
  { title: "How It Works", url: "/admin/how-it-works", icon: HelpCircle },
  { title: "System Settings", url: "/admin/settings", icon: Settings },
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
        <SidebarGroup className="py-0.5">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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
        </SidebarGroup>
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
