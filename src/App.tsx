import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Website from "./pages/Website";
import SocialMedia from "./pages/SocialMedia";
import SEO from "./pages/SEO";
import PaidAds from "./pages/PaidAds";
import Reviews from "./pages/Reviews";
import Meetings from "./pages/Meetings";
import Reports from "./pages/Reports";
import Intelligence from "./pages/Intelligence";
import Training from "./pages/Training";
import SettingsPage from "./pages/Settings";
import Billing from "./pages/Billing";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/website" element={<Website />} />
            <Route path="/social-media" element={<SocialMedia />} />
            <Route path="/seo" element={<SEO />} />
            <Route path="/paid-ads" element={<PaidAds />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/training" element={<Training />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/tasks" element={<Tasks />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
