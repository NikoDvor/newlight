import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { NewLightIntro, shouldPlayIntro, resetIntroState } from "@/components/NewLightIntro";

// Pages
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import ContactDetail from "./pages/ContactDetail";
import CompanyDetail from "./pages/CompanyDetail";
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
import AdminTrainingCenter from "./pages/admin/AdminTrainingCenter";
import AdminTrainingTrack from "./pages/admin/AdminTrainingTrack";
import AdminBDRCertification from "./pages/admin/AdminBDRCertification";
import AdminReports from "./pages/admin/AdminReports";
import AdminGrowthAdvisor from "./pages/admin/AdminGrowthAdvisor";
import AdminActivation from "./pages/admin/AdminActivation";
import AdminDemoBuilds from "./pages/admin/AdminDemoBuilds";
import AdminCloseConfirm from "./pages/admin/AdminCloseConfirm";
import AdminClientSetup from "./pages/admin/AdminClientSetup";
import AdminProspectDetail from "./pages/admin/AdminProspectDetail";
import AdminWelcome from "./pages/admin/AdminWelcome";
import AdminAppSettings from "./pages/admin/AdminAppSettings";
import AdminMasterActivation from "./pages/admin/AdminMasterActivation";
import AdminSalesPipeline from "./pages/admin/AdminSalesPipeline";
import AdminDealDetail from "./pages/admin/AdminDealDetail";
import AdminMeetingDetail from "./pages/admin/AdminMeetingDetail";
import AdminProposalDetail from "./pages/admin/AdminProposalDetail";
import AdminProposalTemplates from "./pages/admin/AdminProposalTemplates";
import AdminSalesDemoCreator from "./pages/admin/AdminSalesDemoCreator";
import AdminProposalWizard from "./pages/admin/AdminProposalWizard";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminAutomations from "./pages/admin/AdminAutomations";
import AdminExecutiveDashboard from "./pages/admin/AdminExecutiveDashboard";
import AdminLaunchChecklist from "./pages/admin/AdminLaunchChecklist";
import AdminPackageDetail from "./pages/admin/AdminPackageDetail";
import AdminArchitecture from "./pages/admin/AdminArchitecture";
import AdminRevenueExpansion from "./pages/admin/AdminRevenueExpansion";
import AdminImplementationRequests from "./pages/admin/AdminImplementationRequests";
import AdminHandoffChecklist from "./pages/admin/AdminHandoffChecklist";
import AdminClientLifecycle from "./pages/admin/AdminClientLifecycle";
import AdminCloseCenter from "./pages/admin/AdminCloseCenter";
import AdminImplementationQueue from "./pages/admin/AdminImplementationQueue";
import AdminImplementationDetail from "./pages/admin/AdminImplementationDetail";
import AdminOnboardingCommandCenter from "./pages/admin/AdminOnboardingCommandCenter";
import AdminSalesControlCenter from "./pages/admin/AdminSalesControlCenter";
import MeetingCancel from "./pages/MeetingCancel";
import Onboarding from "./pages/Onboarding";
import Enterprise from "./pages/Enterprise";
import ClientSetup from "./pages/ClientSetup";
import BrandAssets from "./pages/BrandAssets";
import Finance from "./pages/Finance";
import CalendarPage from "./pages/CalendarPage";
import BrandingSettings from "./pages/BrandingSettings";
import Welcome from "./pages/Welcome";
import EmailPage from "./pages/Email";
import HowItWorks from "./pages/HowItWorks";
import BookingPage from "./pages/BookingPage";
import GetStarted from "./pages/GetStarted";
import WorkspaceEntry from "./pages/WorkspaceEntry";
import Workforce from "./pages/Workforce";
import Chat from "./pages/Chat";
import ContentPlanner from "./pages/ContentPlanner";
import Proposals from "./pages/Proposals";
import HelpDesk from "./pages/HelpDesk";
import KnowledgeBase from "./pages/KnowledgeBase";
import CalendarManagement from "./pages/CalendarManagement";
import CalendarDetail from "./pages/CalendarDetail";
import AppointmentDetail from "./pages/AppointmentDetail";
import TeamManagement from "./pages/TeamManagement";
import CalendarIntegrations from "./pages/CalendarIntegrations";
import ProposalView from "./pages/ProposalView";
import SetupCenter from "./pages/SetupCenter";
import ServiceManager from "./pages/ServiceManager";
import AdminClientSuccess from "./pages/admin/AdminClientSuccess";
import ClientSuccessCenter from "./pages/ClientSuccessCenter";
import SupportTickets from "./pages/SupportTickets";
import ConversationsPage from "./pages/ConversationsPage";
import FollowUpQueue from "./pages/FollowUpQueue";
import MessageTemplates from "./pages/MessageTemplates";
import PublicSite from "./pages/PublicSite";
import ClientIntakeForm from "./pages/ClientIntakeForm";
import SetupPortal from "./pages/SetupPortal";
import Landing from "./pages/Landing";
import ActivateAccount from "./pages/ActivateAccount";
import { AccountManagerDashboard, BDRDashboard, EmployeePlaceholder, GenericEmployeeDashboard, SDRDashboard, SupportEmployeeDashboard } from "./pages/employee/EmployeeDashboards";

const queryClient = new QueryClient();

// Global replay trigger – components call this to show the intro overlay
let globalReplayTrigger: (() => void) | null = null;
export function triggerIntroReplay() {
  resetIntroState();
  globalReplayTrigger?.();
}

/** Context-aware intro overlay that reads workspace state */
function IntroOverlay() {
  const [showIntro, setShowIntro] = useState(shouldPlayIntro);
  const handleIntroComplete = useCallback(() => setShowIntro(false), []);
  const { isAdmin, activeClientName, branding } = useWorkspace();

  // Register global replay
  globalReplayTrigger = useCallback(() => setShowIntro(true), []);

  if (!showIntro) return null;

  const displayName = branding.company_name || activeClientName;
  const launchLabel = isAdmin
    ? "Launching Admin Portal…"
    : displayName
      ? `Launching ${displayName}…`
      : "Launching workspace…";

  return <NewLightIntro onComplete={handleIntroComplete} launchLabel={launchLabel} />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <WorkspaceProvider>
            <IntroOverlay />
            <Routes>
              {/* Public landing */}
              <Route path="/" element={<Landing />} />

              {/* Auth */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/activate" element={<ActivateAccount />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/meeting/cancel/:token" element={<MeetingCancel />} />
              <Route path="/book/:slug" element={<BookingPage />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/w/:slug" element={<WorkspaceEntry />} />
              <Route path="/proposal/:token" element={<ProposalView />} />
              <Route path="/site/:clientSlug" element={<PublicSite />} />
              <Route path="/intake" element={<ClientIntakeForm />} />
              <Route path="/site/:clientSlug/:pageSlug" element={<PublicSite />} />

              {/* Admin Portal */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="clients" element={<AdminClients />} />
                <Route path="monitoring" element={<AdminMonitoring />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="training-center" element={<AdminTrainingCenter />} />
                <Route path="training-center/bdr/certification" element={<AdminBDRCertification />} />
                <Route path="training-center/:trackKey" element={<AdminTrainingTrack />} />
                <Route path="prospects" element={<AdminProspects />} />
                <Route path="provision" element={<AdminProvision />} />
                <Route path="fix-now" element={<AdminFixNow />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="templates" element={<AdminTemplates />} />
                <Route path="packages" element={<AdminPackages />} />
                <Route path="packages/:id" element={<AdminPackageDetail />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="growth-advisor" element={<AdminGrowthAdvisor />} />
                <Route path="activation" element={<AdminActivation />} />
                <Route path="master-activation" element={<AdminMasterActivation />} />
                <Route path="clients/:clientId/activate" element={<AdminMasterActivation />} />
                <Route path="demo-builds" element={<AdminDemoBuilds />} />
                <Route path="demo-builds/:buildId/close" element={<AdminCloseConfirm />} />
                <Route path="clients/:clientId/setup" element={<AdminClientSetup />} />
                <Route path="prospects/:prospectId" element={<AdminProspectDetail />} />
                <Route path="welcome" element={<AdminWelcome />} />
                <Route path="app-settings" element={<AdminAppSettings />} />
                <Route path="sales-pipeline" element={<AdminSalesPipeline />} />
                <Route path="deals/:dealId" element={<AdminDealDetail />} />
                <Route path="meetings/:meetingId" element={<AdminMeetingDetail />} />
                <Route path="proposals/:proposalId" element={<AdminProposalDetail />} />
                <Route path="proposal-templates" element={<AdminProposalTemplates />} />
                <Route path="sales-demo-creator" element={<AdminSalesDemoCreator />} />
                <Route path="clients/:clientId/proposal-wizard" element={<AdminProposalWizard />} />
                <Route path="billing" element={<AdminBilling />} />
                <Route path="automations" element={<AdminAutomations />} />
                <Route path="executive" element={<AdminExecutiveDashboard />} />
                <Route path="launch-checklist" element={<AdminLaunchChecklist />} />
                <Route path="client-success" element={<AdminClientSuccess />} />
                <Route path="conversations" element={<ConversationsPage scopeType="admin_global" title="Admin Conversations" />} />
                <Route path="follow-ups" element={<FollowUpQueue />} />
                <Route path="message-templates" element={<MessageTemplates />} />
                <Route path="how-it-works" element={<HowItWorks />} />
                <Route path="architecture" element={<AdminArchitecture />} />
                <Route path="revenue-expansion" element={<AdminRevenueExpansion />} />
                <Route path="implementation-requests" element={<AdminImplementationRequests />} />
                <Route path="clients/:clientId/handoff" element={<AdminHandoffChecklist />} />
                <Route path="clients/:clientId/lifecycle" element={<AdminClientLifecycle />} />
                <Route path="clients/:clientId/close" element={<AdminCloseCenter />} />
                <Route path="implementation-queue" element={<AdminImplementationQueue />} />
                <Route path="clients/:clientId/implementation" element={<AdminImplementationDetail />} />
                <Route path="onboarding-command-center" element={<AdminOnboardingCommandCenter />} />
                <Route path="sales-control-center" element={<AdminSalesControlCenter />} />
              </Route>

              {/* Employee Portal */}
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<Navigate to="/employee/generic" replace />} />
                <Route path="bdr" element={<BDRDashboard />} />
                <Route path="sdr" element={<SDRDashboard />} />
                <Route path="account-manager" element={<AccountManagerDashboard />} />
                <Route path="support" element={<SupportEmployeeDashboard />} />
                <Route path="generic" element={<GenericEmployeeDashboard />} />
                <Route path="training" element={<EmployeePlaceholder title="Training Center" />} />
                <Route path="pipeline" element={<EmployeePlaceholder title="My Leads/Pipeline" />} />
                <Route path="calendar" element={<EmployeePlaceholder title="My Calendar" />} />
                <Route path="profile" element={<EmployeePlaceholder title="My Profile" />} />
              </Route>

              {/* Client Workspace */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crm" element={<PermissionGuard moduleKey="crm"><CRM /></PermissionGuard>} />
                <Route path="/crm/contacts/:contactId" element={<PermissionGuard moduleKey="crm"><ContactDetail /></PermissionGuard>} />
                <Route path="/crm/companies/:companyId" element={<PermissionGuard moduleKey="crm"><CompanyDetail /></PermissionGuard>} />
                <Route path="/website" element={<PermissionGuard moduleKey="website"><Website /></PermissionGuard>} />
                <Route path="/social-media" element={<PermissionGuard moduleKey="social"><SocialMedia /></PermissionGuard>} />
                <Route path="/seo" element={<PermissionGuard moduleKey="seo"><SEO /></PermissionGuard>} />
                <Route path="/paid-ads" element={<PermissionGuard moduleKey="ads"><PaidAds /></PermissionGuard>} />
                <Route path="/reviews" element={<PermissionGuard moduleKey="reviews"><Reviews /></PermissionGuard>} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/reports" element={<PermissionGuard moduleKey="reports"><Reports /></PermissionGuard>} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/ai-insights" element={<PermissionGuard moduleKey="ai"><AIInsights /></PermissionGuard>} />
                <Route path="/training" element={<PermissionGuard moduleKey="training"><Training /></PermissionGuard>} />
                <Route path="/settings" element={<PermissionGuard moduleKey="settings"><SettingsPage /></PermissionGuard>} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/pipeline" element={<PermissionGuard moduleKey="crm"><Pipeline /></PermissionGuard>} />
                <Route path="/inbox" element={<PermissionGuard moduleKey="messaging"><Inbox /></PermissionGuard>} />
                <Route path="/proposal-booking" element={<ProposalBooking />} />
                <Route path="/prospect-detail" element={<ProspectDetail />} />
                <Route path="/audit-pack" element={<AuditPack />} />
                <Route path="/meeting-outcome" element={<MeetingOutcome />} />
                <Route path="/proposal-draft" element={<ProposalDraft />} />
                <Route path="/website-builder" element={<PermissionGuard moduleKey="website"><WebsiteBuilder /></PermissionGuard>} />
                <Route path="/funnel-builder" element={<PermissionGuard moduleKey="website"><FunnelBuilder /></PermissionGuard>} />
                <Route path="/landing-pages" element={<PermissionGuard moduleKey="website"><LandingPageEditor /></PermissionGuard>} />
                <Route path="/forms" element={<PermissionGuard moduleKey="forms"><FormBuilder /></PermissionGuard>} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/client-performance" element={<PermissionGuard moduleKey="reports"><ClientPerformance /></PermissionGuard>} />
                <Route path="/client-report" element={<PermissionGuard moduleKey="reports"><ClientReport /></PermissionGuard>} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/agency" element={<AgencyDashboard />} />
                <Route path="/integrations" element={<PermissionGuard moduleKey="settings"><Integrations /></PermissionGuard>} />
                <Route path="/growth-advisor" element={<PermissionGuard moduleKey="ai"><GrowthAdvisor /></PermissionGuard>} />
                <Route path="/business-health" element={<PermissionGuard moduleKey="reports"><BusinessHealth /></PermissionGuard>} />
                <Route path="/revenue-opportunities" element={<PermissionGuard moduleKey="reports"><RevenueOpportunities /></PermissionGuard>} />
                <Route path="/priority-actions" element={<PriorityActions />} />
                <Route path="/live-activity" element={<LiveActivity />} />
                <Route path="/market-research" element={<PermissionGuard moduleKey="reports"><MarketResearch /></PermissionGuard>} />
                <Route path="/competitor-tracking" element={<PermissionGuard moduleKey="reports"><CompetitorTracking /></PermissionGuard>} />
                <Route path="/meeting-intelligence" element={<PermissionGuard moduleKey="meeting_intel"><MeetingIntelligence /></PermissionGuard>} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/enterprise" element={<Enterprise />} />
                <Route path="/client-setup" element={<ClientSetup />} />
                <Route path="/setup-portal" element={<SetupPortal />} />
                <Route path="/brand-assets" element={<BrandAssets />} />
                <Route path="/finance" element={<PermissionGuard moduleKey="finance"><Finance /></PermissionGuard>} />
                <Route path="/calendar" element={<PermissionGuard moduleKey="calendar"><CalendarPage /></PermissionGuard>} />
                <Route path="/calendar-management" element={<PermissionGuard moduleKey="calendar" minLevel="edit"><CalendarManagement /></PermissionGuard>} />
                <Route path="/calendar-management/:calendarId" element={<PermissionGuard moduleKey="calendar" minLevel="edit"><CalendarDetail /></PermissionGuard>} />
                <Route path="/appointments/:appointmentId" element={<PermissionGuard moduleKey="calendar"><AppointmentDetail /></PermissionGuard>} />
                <Route path="/email" element={<PermissionGuard moduleKey="email"><EmailPage /></PermissionGuard>} />
                <Route path="/branding-settings" element={<PermissionGuard moduleKey="settings"><BrandingSettings /></PermissionGuard>} />
                <Route path="/welcome" element={<Dashboard />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/workforce" element={<PermissionGuard moduleKey="workforce"><Workforce /></PermissionGuard>} />
                <Route path="/chat" element={<PermissionGuard moduleKey="messaging"><Chat /></PermissionGuard>} />
                <Route path="/content-planner" element={<Navigate to="/social-media" replace />} />
                <Route path="/proposals" element={<PermissionGuard moduleKey="proposals"><Proposals /></PermissionGuard>} />
                <Route path="/help-desk" element={<PermissionGuard moduleKey="support"><HelpDesk /></PermissionGuard>} />
                <Route path="/knowledge-base" element={<PermissionGuard moduleKey="support"><KnowledgeBase /></PermissionGuard>} />
                <Route path="/team" element={<TeamManagement />} />
                <Route path="/calendar-integrations" element={<PermissionGuard moduleKey="calendar"><CalendarIntegrations /></PermissionGuard>} />
                <Route path="/setup-center" element={<SetupCenter />} />
                <Route path="/service-manager" element={<PermissionGuard moduleKey="services"><ServiceManager /></PermissionGuard>} />
                <Route path="/client-success" element={<ClientSuccessCenter />} />
                <Route path="/support-tickets" element={<PermissionGuard moduleKey="support"><SupportTickets /></PermissionGuard>} />
                <Route path="/conversations" element={<PermissionGuard moduleKey="messaging"><ConversationsPage /></PermissionGuard>} />
                <Route path="/follow-ups" element={<PermissionGuard moduleKey="crm"><FollowUpQueue /></PermissionGuard>} />
                <Route path="/message-templates" element={<PermissionGuard moduleKey="messaging"><MessageTemplates /></PermissionGuard>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
