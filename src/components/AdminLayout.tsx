import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Bell, Zap, ChevronDown } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { motion, AnimatePresence } from "framer-motion";

export function AdminLayout() {
  const location = useLocation();
  const { viewMode, user, isAdmin } = useWorkspace();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b relative z-10" style={{
            background: "hsla(218,40%,12%,.95)",
            backdropFilter: "blur(24px) saturate(1.6)",
            borderColor: "hsla(211,96%,60%,.12)"
          }}>
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/60 hover:text-white transition-colors" />
              <div className="hidden sm:flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
                <span className="text-xs font-bold tracking-tight text-white/70">NewLight Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher />
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-white/10 relative group">
                <Bell className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{
                  background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(211 96% 56%))",
                  boxShadow: "0 0 8px hsla(211,96%,60%,.5)"
                }} />
              </button>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{
                background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
                boxShadow: "0 2px 14px -3px hsla(211,96%,56%,.35)"
              }}>
                <span className="text-xs font-bold text-white">NL</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto" style={{
            background: "linear-gradient(180deg, hsl(218 35% 10%) 0%, hsl(220 30% 14%) 100%)"
          }}>
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
