import { useEffect, useState } from "react";
import { Outlet, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Award, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Footprints, GraduationCap, Lock, LogOut, MapPin, Phone, Search, Target, UserCircle, Users, Zap } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LivingBackground } from "@/components/fx/LivingBackground";
import { GlobalAtmosphere } from "@/components/GlobalAtmosphere";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getEmployeeRoute, getRoleBadge } from "@/lib/employeeRouting";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { useClientManifest } from "@/hooks/useClientManifest";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { CheckForUpdatesButton } from "@/components/CheckForUpdatesButton";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

import { GlobalModuleSearch } from "@/components/GlobalModuleSearch";
import { supabase } from "@/integrations/supabase/client";
import { hasAdminBackup, restoreAdminSession } from "@/lib/impersonation";
import { AdminImpersonationBar } from "@/components/AdminImpersonationBar";

const navGroups: { label?: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    items: [{ title: "My Pipeline", url: "/employee", icon: BarChart3 }],
  },
  {
    label: "Work the pipeline",
    items: [
      { title: "My Leads", url: "/employee/leads", icon: ClipboardList },
      { title: "My Calendar", url: "/employee/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Get leads",
    items: [
      { title: "Dialer", url: "/employee/dialer", icon: Phone },
      { title: "Lead Sourcing", url: "/employee/lead-sourcing", icon: Search },
    ],
  },
  {
    label: "Results",
    items: [{ title: "My Stats", url: "/employee/my-stats", icon: Target }],
  },
  {
    label: "Learn",
    items: [{ title: "Training Center", url: "/employee/training", icon: GraduationCap }],
  },
  {
    items: [{ title: "My Profile", url: "/employee/profile", icon: UserCircle }],
  },
];

function EmployeeSidebar() {
  const location = useLocation();
  const { userRole, employeeProfile, user } = useWorkspace();
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
            {navGroups.map((group, gi) => (
              <SidebarMenu key={group.label || `group-${gi}`}>
                {group.label && (
                  <SidebarMenuItem className="pointer-events-none">
                    <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
                      {group.label}
                    </div>
                  </SidebarMenuItem>
                )}
                {group.items.map((item) => {
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
            ))}
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
  const impersonating = hasAdminBackup();

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full bg-background text-foreground ${impersonating ? "pt-8" : ""}`}>
        <AdminImpersonationBar />
        <EmployeeSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md flex items-center justify-center bg-primary/15 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold truncate">NewLight Employee Portal</span>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 overflow-x-auto touch-x-scroll">
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-3 shrink-0">
                <PWAInstallButton />
                <CheckForUpdatesButton />
              </div>
              <GlobalModuleSearch variant="employee" />
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-semibold text-foreground/80 max-w-40 truncate">{name}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wide">{badge}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (hasAdminBackup()) {
                    await restoreAdminSession();
                    return;
                  }
                  await signOut();
                  navigate("/auth", { replace: true });
                }}
                title={hasAdminBackup() ? "Exit impersonation" : "Sign out"}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-auto nl-dark-bg relative">
            {location.pathname.startsWith("/employee/training") ? <LivingBackground /> : <GlobalAtmosphere />}
            <div key={location.pathname} className="animate-fade-in w-full min-w-0 p-4 sm:p-6 lg:p-10 relative z-1">
                <PWAInstallBanner />

                <Outlet />
              </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
