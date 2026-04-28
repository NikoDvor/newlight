import { Outlet, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, GraduationCap, LogOut, Target, UserCircle, Users, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { GlobalAtmosphere } from "@/components/GlobalAtmosphere";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getEmployeeRoute, getRoleBadge } from "@/lib/employeeRouting";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { useClientManifest } from "@/hooks/useClientManifest";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";

const navItems = [
  { title: "Dashboard", url: "/employee", icon: BarChart3 },
  { title: "Training Center", url: "/employee/training", icon: GraduationCap },
  { title: "My Leads/Pipeline", url: "/employee/pipeline", icon: Target },
  { title: "My Calendar", url: "/employee/calendar", icon: CalendarDays },
  { title: "My Profile", url: "/employee/profile", icon: UserCircle },
];

function EmployeeSidebar() {
  const location = useLocation();
  const { userRole, employeeProfile } = useWorkspace();
  const dashboardRoute = getEmployeeRoute(userRole, employeeProfile?.job_title) || "/employee/generic";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="bg-background/95">
        <SidebarGroup>
          <div className="px-3 py-4 flex items-center gap-2">
            <img src={newlightLogo} alt="NewLight" className="h-7 w-auto object-contain" />
            <span className="text-xs font-bold text-foreground/80 group-data-[collapsible=icon]:hidden">Employee Portal</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const url = item.url === "/employee" ? dashboardRoute : item.url;
                const active = location.pathname === url || (item.url === "/employee" && location.pathname === dashboardRoute);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink to={url} className="text-muted-foreground hover:text-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function EmployeeLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, employeeProfile, isAdmin, isSessionLoading, signOut } = useWorkspace();
  useClientManifest();

  if (isSessionLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.email_confirmed_at) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const employeeRoute = getEmployeeRoute(userRole, employeeProfile?.job_title);
  if (!employeeRoute) return <Navigate to="/dashboard" replace />;
  if (location.pathname === "/employee") return <Navigate to={employeeRoute} replace />;

  const name = employeeProfile?.full_name || user.user_metadata?.full_name || user.email || "NewLight";
  const badge = userRole === "support_staff" ? "Support" : getRoleBadge(employeeProfile?.job_title);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <EmployeeSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md flex items-center justify-center bg-primary/15 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold truncate">NewLight Employee Portal</span>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 overflow-x-auto touch-x-scroll">
              <PWAInstallButton />
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-semibold text-foreground/80 max-w-40 truncate">{name}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wide">{badge}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => signOut().then(() => navigate("/auth", { replace: true }))} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-auto nl-dark-bg relative">
            <GlobalAtmosphere />
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="w-full min-w-0 p-4 sm:p-6 lg:p-10 relative z-1">
                <PWAUpdateBanner />
                <PWAInstallBanner />
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
