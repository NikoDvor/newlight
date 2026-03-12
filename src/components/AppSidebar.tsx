import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, Globe, Share2, Search, Megaphone,
  Star, Calendar, FileText, Brain, GraduationCap, Settings,
  CreditCard, CheckSquare, Zap, ChevronLeft, Columns3, Mail,
  ClipboardList, UserCheck, Package, PenSquare, FileCheck2,
  Hammer, GitBranch, PanelTop, FormInput, Workflow, BarChart3,
  Bell, Building2
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agency Overview", url: "/agency", icon: Building2 },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: Columns3 },
  { title: "Inbox", url: "/inbox", icon: Mail },
  { title: "Proposal Booking", url: "/proposal-booking", icon: ClipboardList },
  { title: "Prospect Detail", url: "/prospect-detail", icon: UserCheck },
  { title: "Audit Pack", url: "/audit-pack", icon: Package },
  { title: "Meeting Outcome", url: "/meeting-outcome", icon: PenSquare },
  { title: "Proposal Draft", url: "/proposal-draft", icon: FileCheck2 },
  { title: "Website Builder", url: "/website-builder", icon: Hammer },
  { title: "Funnel Builder", url: "/funnel-builder", icon: GitBranch },
  { title: "Landing Pages", url: "/landing-pages", icon: PanelTop },
  { title: "Forms & Leads", url: "/forms", icon: FormInput },
  { title: "Automations", url: "/automations", icon: Workflow },
  { title: "Website", url: "/website", icon: Globe },
  { title: "Social Media", url: "/social-media", icon: Share2 },
  { title: "SEO", url: "/seo", icon: Search },
  { title: "Paid Ads", url: "/paid-ads", icon: Megaphone },
  { title: "Reviews", url: "/reviews", icon: Star },
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Client Performance", url: "/client-performance", icon: BarChart3 },
  { title: "Client Report", url: "/client-report", icon: FileText },
  { title: "Intelligence", url: "/intelligence", icon: Brain },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Training", url: "/training", icon: GraduationCap },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
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

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Gradient overlay on sidebar */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(180deg, hsl(220 60% 18%) 0%, hsl(215 55% 12%) 50%, hsl(220 65% 10%) 100%)"
      }} />

      <SidebarHeader className="p-3 relative z-10">
        <div className="flex items-center justify-between px-2">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{
                background: "linear-gradient(135deg, hsl(199 92% 65%), hsl(217 91% 60%))"
              }}>
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">NewLight</span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center mx-auto" style={{
              background: "linear-gradient(135deg, hsl(199 92% 65%), hsl(217 91% 60%))"
            }}>
              <Zap className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 relative z-10">
        <SidebarGroup>
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
                      className={`h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? "text-white"
                          : "text-white/55 hover:text-white/90 hover:bg-white/[0.06]"
                      }`}
                      style={active ? {
                        background: "linear-gradient(135deg, hsla(199,92%,65%,0.2), hsla(217,91%,60%,0.15))",
                        boxShadow: "0 0 12px -2px hsla(210,100%,65%,0.25), inset 0 0 0 1px hsla(199,92%,65%,0.2)"
                      } : undefined}
                    >
                      <Link to={item.url}>
                        <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-nl-sky" : ""}`} />
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

      <SidebarFooter className="px-3 pb-3 relative z-10">
        <SidebarMenu>
          {bottomItems.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={collapsed ? item.title : undefined}
                  className={`h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "text-white"
                      : "text-white/55 hover:text-white/90 hover:bg-white/[0.06]"
                  }`}
                  style={active ? {
                    background: "linear-gradient(135deg, hsla(199,92%,65%,0.2), hsla(217,91%,60%,0.15))",
                    boxShadow: "0 0 12px -2px hsla(210,100%,65%,0.25), inset 0 0 0 1px hsla(199,92%,65%,0.2)"
                  } : undefined}
                >
                  <Link to={item.url}>
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-nl-sky" : ""}`} />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-9 px-3 rounded-lg text-sm font-medium text-white/55 hover:text-white/90 hover:bg-white/[0.06] transition-all duration-200"
            >
              <ChevronLeft className={`h-4 w-4 shrink-0 transition-transform duration-250 ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
