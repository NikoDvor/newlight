import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, Globe, Share2, Search, Megaphone,
  Star, Calendar, FileText, Brain, GraduationCap, Settings,
  CreditCard, CheckSquare, Zap, ChevronLeft
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Website", url: "/website", icon: Globe },
  { title: "Social Media", url: "/social-media", icon: Share2 },
  { title: "SEO", url: "/seo", icon: Search },
  { title: "Paid Ads", url: "/paid-ads", icon: Megaphone },
  { title: "Reviews", url: "/reviews", icon: Star },
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Intelligence", url: "/intelligence", icon: Brain },
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
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-between px-2">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-sidebar-primary" />
              <span className="font-semibold text-sm text-sidebar-foreground">NewLight</span>
            </div>
          )}
          {collapsed && <Zap className="h-5 w-5 text-sidebar-primary mx-auto" />}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                    className="h-10 px-3 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground transition-colors duration-150"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={collapsed ? item.title : undefined}
                className="h-10 px-3 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground transition-colors duration-150"
              >
                <Link to={item.url}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-10 px-3 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
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
