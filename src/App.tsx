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
import AIInsights from "./pages/AIInsights";
import Training from "./pages/Training";
import SettingsPage from "./pages/Settings";
import Billing from "./pages/Billing";
import Tasks from "./pages/Tasks";
import Pipeline from "./pages/Pipeline";
import Inbox from "./pages/Inbox";
import ProposalBooking from "./pages/ProposalBooking";
import ProspectDetail from "./pages/ProspectDetail";
import AuditPack from "./pages/AuditPack";
import MeetingOutcome from "./pages/MeetingOutcome";
import ProposalDraft from "./pages/ProposalDraft";
import WebsiteBuilder from "./pages/WebsiteBuilder";
import FunnelBuilder from "./pages/FunnelBuilder";
import LandingPageEditor from "./pages/LandingPageEditor";
import FormBuilder from "./pages/FormBuilder";
import Automations from "./pages/Automations";
import ClientPerformance from "./pages/ClientPerformance";
import ClientReport from "./pages/ClientReport";
import Notifications from "./pages/Notifications";
import AgencyDashboard from "./pages/AgencyDashboard";
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
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/proposal-booking" element={<ProposalBooking />} />
            <Route path="/prospect-detail" element={<ProspectDetail />} />
            <Route path="/audit-pack" element={<AuditPack />} />
            <Route path="/meeting-outcome" element={<MeetingOutcome />} />
            <Route path="/proposal-draft" element={<ProposalDraft />} />
            <Route path="/website-builder" element={<WebsiteBuilder />} />
            <Route path="/funnel-builder" element={<FunnelBuilder />} />
            <Route path="/landing-pages" element={<LandingPageEditor />} />
            <Route path="/forms" element={<FormBuilder />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/client-performance" element={<ClientPerformance />} />
            <Route path="/client-report" element={<ClientReport />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/agency" element={<AgencyDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
