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

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className={`h-9 px-3 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
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
            <item.icon className={`h-4 w-4 shrink-0 transition-all duration-200 ${
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
      {/* Bright blue gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(170deg, hsl(211 90% 62%) 0%, hsl(215 80% 52%) 50%, hsl(218 75% 46%) 100%)"
      }} />
      {/* Light energy glow */}
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-40" style={{
        background: "radial-gradient(ellipse at 50% 0%, hsla(197,92%,78%,.5), transparent 70%)"
      }} />

      <SidebarHeader className="p-3 relative z-10">
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{
                background: "hsla(0,0%,100%,.2)",
                boxShadow: "0 0 20px -4px hsla(0,0%,100%,.35), inset 0 0 0 1px hsla(0,0%,100%,.15)"
              }}>
                <Zap className="h-4.5 w-4.5 text-white drop-shadow-[0_0_6px_hsla(0,0%,100%,.6)]" />
              </div>
              <span className="font-bold text-[15px] tracking-tight text-white drop-shadow-[0_1px_2px_hsla(0,0%,0%,.15)]">NewLight</span>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl flex items-center justify-center mx-auto" style={{
              background: "hsla(0,0%,100%,.2)",
              boxShadow: "0 0 20px -4px hsla(0,0%,100%,.35), inset 0 0 0 1px hsla(0,0%,100%,.15)"
            }}>
              <Zap className="h-4.5 w-4.5 text-white drop-shadow-[0_0_6px_hsla(0,0%,100%,.6)]" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 relative z-10">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3 relative z-10">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-9 px-3 rounded-xl text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.12] transition-all duration-200 group"
            >
              <ChevronLeft className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
