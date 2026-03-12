import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell, Zap } from "lucide-react";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b" style={{
            background: "hsla(210, 50%, 99%, 0.65)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            borderColor: "hsla(213, 94%, 60%, 0.07)"
          }}>
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
              <div className="hidden sm:flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold tracking-tight text-foreground/70">NewLight</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl transition-all duration-200 hover:bg-primary/5 hover:shadow-[0_0_12px_-3px_hsla(213,94%,60%,.2)] relative group">
                <Bell className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full shadow-[0_0_6px_hsla(213,94%,60%,.5)]" style={{
                  background: "linear-gradient(135deg, hsl(199 92% 65%), hsl(213 94% 55%))"
                }} />
              </button>
              <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-md" style={{
                background: "linear-gradient(135deg, hsl(199 92% 65%), hsl(217 91% 58%))",
                boxShadow: "0 2px 12px -3px hsla(213,94%,55%,.3)"
              }}>
                <span className="text-xs font-bold text-white">NL</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 lg:p-10 nl-animated-bg">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
