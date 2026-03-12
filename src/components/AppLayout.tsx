import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { Outlet, useLocation } from "react-router-dom";
import { Bell, Zap, Building2, LogOut } from "lucide-react";
import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";

function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 3,
    duration: 18 + Math.random() * 22,
    delay: Math.random() * 20,
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <div className="nl-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="nl-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = `${e.clientX}px`;
        ref.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return <div ref={ref} className="nl-cursor-glow" />;
}

export function AppLayout() {
  const location = useLocation();
  const { activeClientName, isAdmin, branding, activeClientId, signOut, user } = useWorkspace();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={brandStyle}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b relative z-10" style={{
            background: "hsla(210,50%,99%,.6)",
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            borderColor: hasCustomBranding
              ? `${branding.primary_color}18`
              : "hsla(211,96%,60%,.06)"
          }}>
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
              {/* Show client branding logo or NewLight default */}
              {branding.logo_url && activeClientId ? (
                <div className="hidden sm:flex items-center gap-2">
                  <img
                    src={branding.logo_url}
                    alt={displayName || "Logo"}
                    className="h-7 w-7 rounded-lg object-contain"
                  />
                  {displayName && (
                    <span className="text-xs font-bold tracking-tight text-foreground/70">{displayName}</span>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold tracking-tight text-foreground/70">
                    {displayName || "NewLight"}
                  </span>
                </div>
              )}
              {activeClientName && !branding.company_name && (
                <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-lg bg-primary/5">
                  <Building2 className="h-3 w-3 text-primary/60" />
                  <span className="text-[11px] font-medium text-primary/70">{activeClientName}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <WorkspaceSwitcher />}
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-primary/5 hover:shadow-[0_0_14px_-3px_hsla(211,96%,60%,.22)] relative group">
                <Bell className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{
                  background: hasCustomBranding
                    ? `linear-gradient(135deg, ${branding.secondary_color}, ${branding.primary_color})`
                    : "linear-gradient(135deg, hsl(197 92% 68%), hsl(211 96% 56%))",
                  boxShadow: "0 0 8px hsla(211,96%,60%,.5)"
                }} />
              </button>
              {user && (
                <button
                  onClick={signOut}
                  className="p-2 rounded-xl transition-all duration-200 hover:bg-destructive/10 group"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                </button>
              )}
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{
                background: hasCustomBranding
                  ? `linear-gradient(135deg, ${branding.secondary_color}, ${branding.primary_color})`
                  : "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
                boxShadow: hasCustomBranding
                  ? `0 2px 14px -3px ${branding.primary_color}60`
                  : "0 2px 14px -3px hsla(211,96%,56%,.35)"
              }}>
                <span className="text-xs font-bold text-white">
                  {(displayName || "NL").substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto nl-animated-bg">
            <div className="nl-grid-overlay" />
            <Particles />
            <CursorGlow />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="p-6 lg:p-10 relative z-1"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            {/* Powered by footer */}
            <div className="text-center py-4 text-[10px] text-muted-foreground/40 tracking-wide">
              Powered by <span className="font-semibold">NewLight</span>
            </div>
          </main>
        </div>
        <AIAssistant />
      </div>
    </SidebarProvider>
  );
}
