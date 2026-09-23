import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import { Bell, Building2, LogOut, ArrowLeft, Settings, User } from "lucide-react";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { useEffect, useRef, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClientManifest } from "@/hooks/useClientManifest";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { CheckForUpdatesButton } from "@/components/CheckForUpdatesButton";
import { getEmployeeRoute } from "@/lib/employeeRouting";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GlobalAtmosphere } from "@/components/GlobalAtmosphere";



function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current) {
        // transform (compositor-only) instead of left/top (forces layout).
        ref.current.style.left = "0px";
        ref.current.style.top = "0px";
        ref.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return <div ref={ref} className="nl-cursor-glow" />;
}

export function AppLayout() {
  const location = useLocation();
  const { activeClientName, isAdmin, branding, activeClientId, signOut, user, userRole, employeeProfile, setViewMode, setActiveClientId, isSessionLoading, sessionExpired } = useWorkspace();
  const navigate = useNavigate();
  useClientManifest();

  // Apply dynamic branding CSS variables when a client workspace is active
  const brandStyle = useMemo(() => {
    if (!activeClientId || !branding.primary_color) return {};
    return {
      "--brand-primary": branding.primary_color,
      "--brand-secondary": branding.secondary_color || branding.primary_color,
    } as React.CSSProperties;
  }, [activeClientId, branding]);

  const displayName = branding.company_name || activeClientName;
  const hasCustomBranding = activeClientId && branding.primary_color && branding.primary_color !== "#3B82F6";

  // Wait for session restoration before deciding auth state — prevents
  // a false redirect to /auth on refresh while getSession() is still pending (sync-forced).
  if (isSessionLoading) return null;

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Block unverified email users
  if (!user.email_confirmed_at) {
    return <Navigate to="/auth" replace />;
  }

  // Stale/expired token: the role query failed with an auth error even after
  // one refresh attempt. Distinct from "no workspace assigned".
  if (sessionExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}>
        <div className="text-center max-w-md">
          <img src={newlightLogo} alt="NewLight" className="h-14 w-auto mx-auto mb-4 object-contain" />
          <h1 className="text-xl font-bold text-white mb-2">Your session expired</h1>
          <p className="text-white/50 text-sm mb-6">Please sign in again to continue.</p>
          <button
            onClick={async () => { await signOut(); navigate("/auth", { replace: true }); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "hsl(211 96% 55%)" }}
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  // Employees (marketing_staff / support_staff) live under /employee/*.
  // If one lands on an AppLayout-wrapped route (e.g. via a stale bookmark
  // or cached ?redirect=), send them to their real dashboard instead of
  // showing the "No Workspace Assigned" blocker.
  const EMPLOYEE_ROLES = ["marketing_staff", "support_staff"];
  if (!isAdmin && userRole && EMPLOYEE_ROLES.includes(userRole)) {
    const dest = getEmployeeRoute(userRole, employeeProfile?.job_title) || "/employee/generic";
    return <Navigate to={dest} replace />;
  }

  // Block client users without an assigned workspace
  if (!isAdmin && !activeClientId && userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}>
        <div className="text-center max-w-md">
          <img src={newlightLogo} alt="NewLight" className="h-14 w-auto mx-auto mb-4 object-contain" />
          <h1 className="text-xl font-bold text-white mb-2">No Workspace Assigned</h1>
          <p className="text-white/50 text-sm mb-6">Your account has not been assigned to a client workspace yet. Please contact an administrator to get access.</p>
          <button onClick={signOut} className="text-xs text-white/40 hover:text-white/70 transition-colors inline-flex items-center gap-1">
            <LogOut className="h-3 w-3" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={brandStyle}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b relative z-10" style={{
            background: "hsla(218,42%,8%,.97)",
            backdropFilter: "blur(28px) saturate(1.6)",
            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            borderColor: hasCustomBranding
              ? `${branding.primary_color}18`
              : "hsla(211,96%,60%,.12)",
            boxShadow: "0 1px 0 0 hsla(211,96%,60%,.06), 0 4px 20px -4px hsla(0,0%,0%,.3)"
          }}>
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/60 hover:text-white transition-colors" />
              {/* Show client branding logo or NewLight default */}
              {branding.logo_url && activeClientId ? (
                <div className="hidden sm:flex items-center gap-2">
                  <img
                    src={branding.logo_url}
                    alt={displayName || "Logo"}
                    className="h-7 w-7 rounded-lg object-contain"
                  />
                  {displayName && (
                    <span className="text-xs font-bold tracking-tight text-white/70">{displayName}</span>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <img src={newlightLogo} alt="NewLight" className="h-6 w-auto object-contain" />
                </div>
              )}
              {activeClientName && !branding.company_name && (
                <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-lg bg-white/5">
                  <Building2 className="h-3 w-3 text-[hsl(var(--nl-sky))]/60" />
                  <span className="text-[11px] font-medium text-white/50">{activeClientName}</span>
                </div>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto touch-x-scroll scrollbar-hide">
              {isAdmin && activeClientId && (
                <button
                  onClick={() => {
                    setViewMode("admin");
                    setActiveClientId(null);
                    navigate("/admin");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:bg-white/10 border border-white/10"
                  title="Back to Admin Portal"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-white/60" />
                  <span className="hidden sm:inline text-white/60">Admin</span>
                </button>
              )}
              <GlobalSearch />
              {isAdmin && <WorkspaceSwitcher />}
              <PWAInstallButton />
              <CheckForUpdatesButton />
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-white/10 relative group">
                <Bell className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{
                  background: hasCustomBranding
                    ? `linear-gradient(135deg, ${branding.secondary_color}, ${branding.primary_color})`
                    : "linear-gradient(135deg, hsl(197 92% 68%), hsl(211 96% 56%))",
                  boxShadow: "0 0 8px hsla(211,96%,60%,.5)"
                }} />
              </button>
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Open account menu">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25">
                        {(displayName || user.email || "NL").substring(0, 2).toUpperCase()}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{displayName || "My Account"}</span>
                          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                        </span>
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-auto nl-dark-bg flex flex-col">
            <GlobalAtmosphere />
            <CursorGlow />
            <div key={location.pathname} className="animate-fade-in w-full min-w-0 p-4 sm:p-6 lg:p-10 relative z-1 flex-1">
                <PWAInstallBanner />

                <Outlet />
              </div>
          </main>
        </div>
        <AIAssistant />
      </div>
    </SidebarProvider>
  );
}
