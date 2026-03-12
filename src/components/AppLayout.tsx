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
          <header className="h-14 flex items-center justify-between border-b border-border/60 px-6 shrink-0 bg-card/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>NewLight</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors duration-150 relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{
                background: "linear-gradient(135deg, hsl(199 92% 65%), hsl(217 91% 60%))"
              }}>
                <span className="text-xs font-semibold text-white">NL</span>
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
