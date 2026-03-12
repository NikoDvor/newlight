import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-6 bg-card shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors duration-150">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">NL</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-8 lg:p-12">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
