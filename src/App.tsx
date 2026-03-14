import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
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
import BusinessHealth from "./pages/BusinessHealth";
import RevenueOpportunities from "./pages/RevenueOpportunities";
import PriorityActions from "./pages/PriorityActions";
import LiveActivity from "./pages/LiveActivity";
import MarketResearch from "./pages/MarketResearch";
import CompetitorTracking from "./pages/CompetitorTracking";
import MeetingIntelligence from "./pages/MeetingIntelligence";
import Integrations from "./pages/Integrations";
import GrowthAdvisor from "./pages/GrowthAdvisor";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminProspects from "./pages/admin/AdminProspects";
import AdminProvision from "./pages/admin/AdminProvision";
import AdminFixNow from "./pages/admin/AdminFixNow";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminMonitoring from "./pages/admin/AdminMonitoring";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminReports from "./pages/admin/AdminReports";
import AdminGrowthAdvisor from "./pages/admin/AdminGrowthAdvisor";
import Onboarding from "./pages/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WorkspaceProvider>
          <Routes>
            {/* Auth */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Portal */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="prospects" element={<AdminProspects />} />
              <Route path="provision" element={<AdminProvision />} />
              <Route path="fix-now" element={<AdminFixNow />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="templates" element={<AdminTemplates />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="growth-advisor" element={<AdminGrowthAdvisor />} />
            </Route>

            {/* Client Workspace */}
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
              <Route path="/ai-insights" element={<AIInsights />} />
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
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/business-health" element={<BusinessHealth />} />
              <Route path="/revenue-opportunities" element={<RevenueOpportunities />} />
              <Route path="/priority-actions" element={<PriorityActions />} />
              <Route path="/live-activity" element={<LiveActivity />} />
              <Route path="/market-research" element={<MarketResearch />} />
              <Route path="/competitor-tracking" element={<CompetitorTracking />} />
              <Route path="/meeting-intelligence" element={<MeetingIntelligence />} />
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WorkspaceProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
