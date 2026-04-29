import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Bell, Zap } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalAtmosphere } from "@/components/GlobalAtmosphere";
import { useClientManifest } from "@/hooks/useClientManifest";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";

export function AdminLayout() {
  const location = useLocation();
  const { viewMode, user, isAdmin } = useWorkspace();
  useClientManifest();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.email_confirmed_at) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b relative z-10" style={{
            background: "hsla(218,42%,8%,.97)",
            backdropFilter: "blur(28px) saturate(1.6)",
            borderColor: "hsla(211,96%,60%,.12)",
            boxShadow: "0 1px 0 0 hsla(211,96%,60%,.06), 0 4px 20px -4px hsla(0,0%,0%,.3)"
          }}>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 overflow-x-auto touch-x-scroll">
              <SidebarTrigger className="text-white/60 hover:text-white transition-colors" />
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))",
                  boxShadow: "0 0 14px -2px hsla(211,96%,60%,.4)"
                }}>
                  <Zap className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-bold tracking-tight text-white/80">NewLight Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher />
              <PWAInstallButton />
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-white/10 relative group">
                <Bell className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{
                  background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(211 96% 56%))",
                  boxShadow: "0 0 10px hsla(211,96%,60%,.6)"
                }} />
              </button>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{
                background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
                boxShadow: "0 2px 16px -3px hsla(211,96%,56%,.4)"
              }}>
                <span className="text-xs font-bold text-white">NL</span>
              </div>
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-auto nl-dark-bg relative flex flex-col">
            <GlobalAtmosphere />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full min-w-0 p-4 sm:p-6 lg:p-10 relative z-1 flex-1"
              >
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
