import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { PWAInstallProvider } from "@/hooks/usePWAInstall";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ClientFlagGate } from "@/components/ClientFlagGate";

import { AdminOpsProvider } from "@/contexts/AdminOpsContext";

// Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CRM = lazy(() => import("./pages/CRM"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const Website = lazy(() => import("./pages/Website"));
const SocialMedia = lazy(() => import("./pages/SocialMedia"));
const SEO = lazy(() => import("./pages/SEO"));
const PaidAds = lazy(() => import("./pages/PaidAds"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Meetings = lazy(() => import("./pages/Meetings"));
const Reports = lazy(() => import("./pages/Reports"));
const SalesPipelineInsights = lazy(() => import("./pages/SalesPipelineInsights"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Training = lazy(() => import("./pages/Training"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Pipeline = lazy(() => import("./pages/Pipeline"));

const ProspectDetail = lazy(() => import("./pages/ProspectDetail"));
const AuditPack = lazy(() => import("./pages/AuditPack"));
const MeetingOutcome = lazy(() => import("./pages/MeetingOutcome"));
const ProposalDraft = lazy(() => import("./pages/ProposalDraft"));
const WebsiteBuilder = lazy(() => import("./pages/WebsiteBuilder"));
const FunnelBuilder = lazy(() => import("./pages/FunnelBuilder"));
const LandingPageEditor = lazy(() => import("./pages/LandingPageEditor"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const Automations = lazy(() => import("./pages/Automations"));
const ClientPerformance = lazy(() => import("./pages/ClientPerformance"));
const ClientReport = lazy(() => import("./pages/ClientReport"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AgencyDashboard = lazy(() => import("./pages/AgencyDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BusinessHealth = lazy(() => import("./pages/BusinessHealth"));
const RevenueOpportunities = lazy(() => import("./pages/RevenueOpportunities"));
const PriorityActions = lazy(() => import("./pages/PriorityActions"));
const LiveActivity = lazy(() => import("./pages/LiveActivity"));
const MarketResearch = lazy(() => import("./pages/MarketResearch"));
const CompetitorTracking = lazy(() => import("./pages/CompetitorTracking"));
const MeetingIntelligence = lazy(() => import("./pages/MeetingIntelligence"));
const Integrations = lazy(() => import("./pages/Integrations"));
const GrowthAdvisor = lazy(() => import("./pages/GrowthAdvisor"));
const TrackingAttribution = lazy(() => import("./pages/TrackingAttribution"));
const LifecycleNurture = lazy(() => import("./pages/LifecycleNurture"));
const FinancialCompliance = lazy(() => import("./pages/FinancialCompliance"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));
const AIVisibility = lazy(() => import("./pages/AIVisibility"));
const Auth = lazy(() => import("./pages/Auth"));
const PaySign = lazy(() => import("./pages/PaySign"));
const Activation = lazy(() => import("./pages/Activation"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCombinedDashboard = lazy(() => import("./pages/admin/AdminCombinedDashboard"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminClientProfile = lazy(() => import("./pages/admin/AdminClientProfile"));

const AdminClientAcquisitionAnalytics = lazy(() => import("./pages/admin/AdminClientAcquisitionAnalytics"));
const AdminProspects = lazy(() => import("./pages/admin/AdminProspects"));
const AdminProvision = lazy(() => import("./pages/admin/AdminProvision"));
const AdminFixNow = lazy(() => import("./pages/admin/AdminFixNow"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminTemplates = lazy(() => import("./pages/admin/AdminTemplates"));
const AdminPackages = lazy(() => import("./pages/admin/AdminPackages"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminMonitoring = lazy(() => import("./pages/admin/AdminMonitoring"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminTrainingCenter = lazy(() => import("./pages/admin/AdminTrainingCenter"));
const AdminTrainingTrack = lazy(() => import("./pages/admin/AdminTrainingTrack"));
const AdminTrainingFlashcards = lazy(() => import("./pages/admin/AdminTrainingFlashcards"));
const AdminQuestionReassignment = lazy(() => import("./pages/admin/AdminQuestionReassignment"));
const AdminTrainingHealth = lazy(() => import("./pages/admin/AdminTrainingHealth"));
const AdminBDRCertification = lazy(() => import("./pages/admin/AdminBDRCertification"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminPipelineInsights = lazy(() => import("./pages/admin/AdminPipelineInsights"));
const AdminGrowthAdvisor = lazy(() => import("./pages/admin/AdminGrowthAdvisor"));
const AdminDemoBuilds = lazy(() => import("./pages/admin/AdminDemoBuilds"));
const AdminCloseConfirm = lazy(() => import("./pages/admin/AdminCloseConfirm"));
const AdminClientSetup = lazy(() => import("./pages/admin/AdminClientSetup"));
const AdminChannelTracking = lazy(() => import("./pages/admin/AdminChannelTracking"));
const AdminClientSOP = lazy(() => import("./pages/admin/AdminClientSOP"));
const AdminProspectDetail = lazy(() => import("./pages/admin/AdminProspectDetail"));
const AdminWelcome = lazy(() => import("./pages/admin/AdminWelcome"));
const AdminAppSettings = lazy(() => import("./pages/admin/AdminAppSettings"));
const AdminMasterActivation = lazy(() => import("./pages/admin/AdminMasterActivation"));
const AdminSalesPipeline = lazy(() => import("./pages/admin/AdminSalesPipeline"));
const AdminDealDetail = lazy(() => import("./pages/admin/AdminDealDetail"));
const AdminMeetingDetail = lazy(() => import("./pages/admin/AdminMeetingDetail"));
const AdminProposalDetail = lazy(() => import("./pages/admin/AdminProposalDetail"));
const AdminProposalTemplates = lazy(() => import("./pages/admin/AdminProposalTemplates"));
const AdminSalesDemoCreator = lazy(() => import("./pages/admin/AdminSalesDemoCreator"));
const AdminProposalWizard = lazy(() => import("./pages/admin/AdminProposalWizard"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminClientRevenue = lazy(() => import("./pages/admin/AdminClientRevenue"));
const AdminAutomations = lazy(() => import("./pages/admin/AdminAutomations"));
const AdminExecutiveDashboard = lazy(() => import("./pages/admin/AdminExecutiveDashboard"));
const AdminLaunchChecklist = lazy(() => import("./pages/admin/AdminLaunchChecklist"));
const AdminPackageDetail = lazy(() => import("./pages/admin/AdminPackageDetail"));
const AdminArchitecture = lazy(() => import("./pages/admin/AdminArchitecture"));
const AdminRevenueExpansion = lazy(() => import("./pages/admin/AdminRevenueExpansion"));
const AdminImplementationRequests = lazy(() => import("./pages/admin/AdminImplementationRequests"));
const AdminHandoffChecklist = lazy(() => import("./pages/admin/AdminHandoffChecklist"));
const AdminClientLifecycle = lazy(() => import("./pages/admin/AdminClientLifecycle"));
const AdminCloseCenter = lazy(() => import("./pages/admin/AdminCloseCenter"));
const AdminImplementationQueue = lazy(() => import("./pages/admin/AdminImplementationQueue"));
const AdminImplementationDetail = lazy(() => import("./pages/admin/AdminImplementationDetail"));
const AdminOnboardingCommandCenter = lazy(() => import("./pages/admin/AdminOnboardingCommandCenter"));
const AdminSalesControlCenter = lazy(() => import("./pages/admin/AdminSalesControlCenter"));
const AdminRetention = lazy(() => import("./pages/admin/AdminRetention"));
const AdminSignedDocuments = lazy(() => import("./pages/admin/AdminSignedDocuments"));
const AdminMarketingReview = lazy(() => import("./pages/admin/AdminMarketingReview"));
const AdminMarketingTemplates = lazy(() => import("./pages/admin/AdminMarketingTemplates"));
const AdminRiskProfiles = lazy(() => import("./pages/admin/AdminRiskProfiles"));
const AdminPromoters = lazy(() => import("./pages/admin/AdminPromoters"));
const AdminNotetakerIntegrations = lazy(() => import("./pages/admin/AdminNotetakerIntegrations"));
const AdminHouseholds = lazy(() => import("./pages/admin/AdminHouseholds"));
const AdminWebinars = lazy(() => import("./pages/admin/AdminWebinars"));
const WebinarRegistration = lazy(() => import("./pages/WebinarRegistration"));
const MeetingCancel = lazy(() => import("./pages/MeetingCancel"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const ClientSetup = lazy(() => import("./pages/ClientSetup"));
const BrandAssets = lazy(() => import("./pages/BrandAssets"));

const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const InternalSystem = lazy(() => import("./pages/InternalSystem"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const BrandingSettings = lazy(() => import("./pages/BrandingSettings"));
const Welcome = lazy(() => import("./pages/Welcome"));
const EmailPage = lazy(() => import("./pages/Email"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const BookingPage = lazy(() => import("./pages/BookingPage"));

const WorkspaceEntry = lazy(() => import("./pages/WorkspaceEntry"));
const Workforce = lazy(() => import("./pages/Workforce"));
const Chat = lazy(() => import("./pages/Chat"));
const ContentPlanner = lazy(() => import("./pages/ContentPlanner"));
const Proposals = lazy(() => import("./pages/Proposals"));
const ClientDocuments = lazy(() => import("./pages/ClientDocuments"));
const HelpDesk = lazy(() => import("./pages/HelpDesk"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const CalendarManagement = lazy(() => import("./pages/CalendarManagement"));
const CalendarDetail = lazy(() => import("./pages/CalendarDetail"));
const AppointmentDetail = lazy(() => import("./pages/AppointmentDetail"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const BDRTeamPipeline = lazy(() => import("./pages/BDRTeamPipeline"));
const BDRLeadSourcing = lazy(() => import("./pages/BDRLeadSourcing"));
const SalesTeamPipeline = lazy(() => import("./pages/SalesTeamPipeline"));
const CalendarIntegrations = lazy(() => import("./pages/CalendarIntegrations"));
const ProposalView = lazy(() => import("./pages/ProposalView"));
const ClientCloseAndSign = lazy(() => import("./pages/ClientCloseAndSign"));
const ClientAgreementTemplate = lazy(() => import("./pages/ClientAgreementTemplate"));
const ClientPaymentSettings = lazy(() => import("./pages/ClientPaymentSettings"));
const OnboardingPipelineSetup = lazy(() => import("./pages/OnboardingPipelineSetup"));
const ClientCloseAndSend = lazy(() => import("./pages/ClientCloseAndSend"));
const SetupCenter = lazy(() => import("./pages/SetupCenter"));
const ServiceManager = lazy(() => import("./pages/ServiceManager"));
const AdminClientSuccess = lazy(() => import("./pages/admin/AdminClientSuccess"));
const ClientSuccessCenter = lazy(() => import("./pages/ClientSuccessCenter"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const FollowUpQueue = lazy(() => import("./pages/FollowUpQueue"));
const MessageTemplates = lazy(() => import("./pages/MessageTemplates"));
const PublicSite = lazy(() => import("./pages/PublicSite"));

const SetupPortal = lazy(() => import("./pages/SetupPortal"));
const Landing = lazy(() => import("./pages/Landing"));
const Install = lazy(() => import("./pages/Install"));
const ActivateAccount = lazy(() => import("./pages/ActivateAccount"));
const AppDownload = lazy(() => import("./pages/AppDownload"));
const AccountManagerDashboard = lazy(() => import("./pages/employee/EmployeeDashboards").then(m => ({ default: m.AccountManagerDashboard })));
const BDRDashboard = lazy(() => import("./pages/employee/EmployeeDashboards").then(m => ({ default: m.BDRDashboard })));
const EmployeePlaceholder = lazy(() => import("./pages/employee/EmployeeDashboards").then(m => ({ default: m.EmployeePlaceholder })));
const GenericEmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboards").then(m => ({ default: m.GenericEmployeeDashboard })));
const SDRDashboard = lazy(() => import("./pages/employee/EmployeeDashboards").then(m => ({ default: m.SDRDashboard })));
const SupportEmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboards").then(m => ({ default: m.SupportEmployeeDashboard })));
const EmployeeTrainingCenter = lazy(() => import("./pages/employee/EmployeeTrainingCenter"));
const BDRCertificationExam = lazy(() => import("./pages/employee/BDRCertificationExam"));
const BDRMyLeads = lazy(() => import("./pages/employee/BDRMyLeads"));
const BDRDialer = lazy(() => import("./pages/employee/BDRDialer"));
const BDRStreetWalk = lazy(() => import("./pages/employee/BDRStreetWalk"));
const StreetSweepDiscover = lazy(() => import("./pages/employee/StreetSweepDiscover"));




const BDRCalendar = lazy(() => import("./pages/employee/BDRCalendar"));
const ClosePrep = lazy(() => import("./pages/employee/ClosePrep"));
const EmployeePaySign = lazy(() => import("./pages/employee/EmployeePaySign"));
const BDRBookingPublic = lazy(() => import("./pages/BDRBookingPublic"));
const AdminBDRPerformance = lazy(() => import("./pages/admin/AdminBDRPerformance"));
const AdminBdrMeetingAnalytics = lazy(() => import("./pages/admin/AdminBdrMeetingAnalytics"));
const AdminBDRCalendars = lazy(() => import("./pages/admin/AdminBDRCalendars"));
const AdminAllCalendars = lazy(() => import("./pages/admin/AdminAllCalendars"));
const AdminStaffCalendars = lazy(() => import("./pages/admin/AdminStaffCalendars"));
const AdminMeetingIntelligence = lazy(() => import("./pages/admin/AdminMeetingIntelligence"));
const AdminEmployeePerformance = lazy(() => import("./pages/admin/AdminEmployeePerformance"));
const AdminWebsites = lazy(() => import("./pages/admin/AdminWebsites"));
const AdminClientHealth = lazy(() => import("./pages/admin/AdminClientHealth"));
const AdminRevenueGrowth = lazy(() => import("./pages/admin/AdminRevenueGrowth"));
const AdminPriorityAlerts = lazy(() => import("./pages/admin/AdminPriorityAlerts"));
const AdminBrokenSetupFlags = lazy(() => import("./pages/admin/AdminBrokenSetupFlags"));
const AdminWinTracking = lazy(() => import("./pages/admin/AdminWinTracking"));
const AdminOptimizationFlags = lazy(() => import("./pages/admin/AdminOptimizationFlags"));
const Approvals = lazy(() => import("./pages/Approvals"));
const CallTracking = lazy(() => import("./pages/CallTracking"));
import SessionGate from "@/components/SessionGate";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";


const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <WorkspaceProvider>
            <PWAInstallProvider>
              <PWAUpdateBanner />
              <Routes>

              {/* Public landing */}
              <Route path="/" element={<SessionGate><Landing /></SessionGate>} />
              <Route path="/install" element={<Install />} />


              {/* Auth */}
              <Route path="/auth" element={<SessionGate><Auth /></SessionGate>} />

              <Route path="/activate" element={<ActivateAccount />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/meeting/cancel/:token" element={<MeetingCancel />} />
              <Route path="/book/:slug" element={<BookingPage />} />
              <Route path="/bdr/book/:slug" element={<BDRBookingPublic />} />
              <Route path="/app/:slug" element={<AppDownload />} />
              <Route path="/webinar/:slug" element={<WebinarRegistration />} />
              <Route path="/w/:slug" element={<WorkspaceEntry />} />
              <Route path="/proposal/:token" element={<ProposalView />} />
              <Route path="/close-and-sign/:envelopeId" element={<ClientCloseAndSign />} />
              <Route path="/site/:clientSlug" element={<PublicSite />} />
              
              <Route path="/pay-sign/:token" element={<PaySign />} />
              <Route path="/sign/:token" element={<PaySign />} />
              <Route path="/activation" element={<Activation />} />
              <Route path="/site/:clientSlug/:pageSlug" element={<PublicSite />} />

              {/* Admin Portal */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminCombinedDashboard />} />
                <Route path="dashboard" element={<AdminCombinedDashboard />} />
                <Route path="clients" element={<AdminClients />} />
                <Route path="clients/acquisition-analytics" element={<AdminClientAcquisitionAnalytics />} />
                <Route path="clients/:clientId" element={<AdminClientProfile />} />
                <Route path="channel-tracking" element={<AdminChannelTracking />} />

                <Route path="monitoring" element={<AdminMonitoring />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="training-center" element={<AdminTrainingCenter />} />
                <Route path="sops" element={<PlaceholderPage title="Standard Operating Procedures" description="Standard operating procedures for your team." />} />
                
                <Route path="training-center/bdr/certification" element={<AdminBDRCertification />} />
                <Route path="training-center/bdr/flashcards" element={<AdminTrainingFlashcards />} />
                <Route path="training-center/question-reassignment" element={<AdminQuestionReassignment />} />
                <Route path="training-health" element={<AdminTrainingHealth />} />
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
                <Route path="pipeline-insights" element={<AdminPipelineInsights />} />
                <Route path="growth-advisor" element={<AdminGrowthAdvisor />} />
                <Route path="master-activation" element={<AdminMasterActivation />} />
                <Route path="clients/:clientId/activate" element={<AdminMasterActivation />} />
                <Route path="demo-builds" element={<AdminDemoBuilds />} />
                <Route path="demo-builds/:buildId/close" element={<AdminCloseConfirm />} />
                <Route path="clients/:clientId/setup" element={<AdminClientSetup />} />
                <Route path="clients/:clientId/sop" element={<AdminClientSOP />} />
                <Route path="prospects/:prospectId" element={<AdminProspectDetail />} />
                <Route path="welcome" element={<AdminWelcome />} />
                <Route path="app-settings" element={<AdminAppSettings />} />
                <Route path="sales-pipeline" element={<AdminSalesPipeline />} />
                <Route path="deals/:dealId" element={<AdminDealDetail />} />
                <Route path="meetings/:meetingId" element={<AdminMeetingDetail />} />
                <Route path="proposals/:proposalId" element={<AdminProposalDetail />} />
                <Route path="proposal-templates" element={<AdminProposalTemplates />} />
                <Route path="sales-demo-creator" element={<AdminSalesDemoCreator />} />
                <Route path="meeting-intelligence" element={<AdminMeetingIntelligence />} />
                <Route path="employee-performance" element={<AdminEmployeePerformance />} />
                <Route path="clients/:clientId/proposal-wizard" element={<AdminProposalWizard />} />
                <Route path="billing" element={<AdminBilling />} />
                <Route path="client-revenue" element={<AdminClientRevenue />} />
                <Route path="automations" element={<AdminAutomations />} />
                <Route path="executive" element={<Navigate to="/admin" replace />} />
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
                <Route path="bdr-performance" element={<AdminBDRPerformance />} />
                <Route path="bdr-meeting-analytics" element={<AdminBdrMeetingAnalytics />} />
                <Route path="bdr-calendars" element={<AdminBDRCalendars />} />
                <Route path="calendars" element={<AdminAllCalendars />} />
                <Route path="websites" element={<AdminWebsites />} />
                <Route path="staff-calendars" element={<AdminStaffCalendars />} />
                <Route path="client-intelligence/health" element={<AdminClientHealth />} />
                <Route path="client-intelligence/revenue" element={<AdminRevenueGrowth />} />
                <Route path="client-intelligence/alerts" element={<AdminPriorityAlerts />} />
                <Route path="client-intelligence/setup-flags" element={<AdminBrokenSetupFlags />} />
                <Route path="client-intelligence/wins" element={<AdminWinTracking />} />
                <Route path="client-intelligence/optimization" element={<AdminOptimizationFlags />} />
                <Route path="client-intelligence/retention" element={<AdminRetention />} />
                <Route path="client-intelligence/signed-documents" element={<AdminSignedDocuments />} />
                <Route path="marketing-review" element={<AdminMarketingReview />} />
                <Route path="marketing-templates" element={<AdminMarketingTemplates />} />
                <Route path="risk-profiles" element={<AdminRiskProfiles />} />
                <Route path="promoters" element={<AdminPromoters />} />
                <Route path="notetaker-integrations" element={<AdminNotetakerIntegrations />} />
                <Route path="households" element={<AdminHouseholds />} />
                <Route path="webinars" element={<AdminWebinars />} />

                {/* NewLight Ops — internal admin operations workspace (reuses workspace pages, scoped to ADMIN_OPS_CLIENT_ID) */}
                <Route path="ops/dashboard" element={<AdminOpsProvider><Dashboard /></AdminOpsProvider>} />
                <Route path="ops/crm" element={<AdminOpsProvider><CRM /></AdminOpsProvider>} />
                <Route path="ops/pipeline" element={<AdminOpsProvider><Pipeline /></AdminOpsProvider>} />
                <Route path="ops/calendar" element={<AdminOpsProvider><CalendarPage /></AdminOpsProvider>} />
                <Route path="ops/calendar-management" element={<AdminOpsProvider><CalendarManagement /></AdminOpsProvider>} />
                <Route path="ops/calendar-management/:calendarId" element={<AdminOpsProvider><CalendarDetail /></AdminOpsProvider>} />
                <Route path="ops/conversations" element={<AdminOpsProvider><ConversationsPage /></AdminOpsProvider>} />
                <Route path="ops/follow-ups" element={<AdminOpsProvider><FollowUpQueue /></AdminOpsProvider>} />
                <Route path="ops/proposals" element={<AdminOpsProvider><Proposals /></AdminOpsProvider>} />
                <Route path="ops/reviews" element={<AdminOpsProvider><Reviews /></AdminOpsProvider>} />
                <Route path="ops/social" element={<AdminOpsProvider><SocialMedia /></AdminOpsProvider>} />
                <Route path="ops/seo" element={<AdminOpsProvider><SEO /></AdminOpsProvider>} />
                <Route path="ops/ads" element={<AdminOpsProvider><PaidAds /></AdminOpsProvider>} />
                <Route path="ops/website" element={<AdminOpsProvider><Website /></AdminOpsProvider>} />
                <Route path="ops/ai-visibility" element={<AdminOpsProvider><AIVisibility /></AdminOpsProvider>} />

                <Route path="ops/ai-insights" element={<AdminOpsProvider><AIInsights /></AdminOpsProvider>} />
                <Route path="ops/growth-advisor" element={<AdminOpsProvider><GrowthAdvisor /></AdminOpsProvider>} />
                <Route path="ops/market-research" element={<AdminOpsProvider><MarketResearch /></AdminOpsProvider>} />
                <Route path="ops/content" element={<AdminOpsProvider><ContentPlanner /></AdminOpsProvider>} />
                <Route path="ops/workforce" element={<AdminOpsProvider><Workforce /></AdminOpsProvider>} />
                
                <Route path="ops/integrations" element={<AdminOpsProvider><Integrations /></AdminOpsProvider>} />
                <Route path="ops/settings" element={<AdminOpsProvider><SettingsPage /></AdminOpsProvider>} />
                <Route path="ops/tasks" element={<AdminOpsProvider><Tasks /></AdminOpsProvider>} />
                <Route path="ops/email" element={<AdminOpsProvider><EmailPage /></AdminOpsProvider>} />
                <Route path="ops/message-templates" element={<AdminOpsProvider><MessageTemplates /></AdminOpsProvider>} />
                <Route path="ops/forms" element={<AdminOpsProvider><FormBuilder /></AdminOpsProvider>} />
                <Route path="ops/reports" element={<AdminOpsProvider><Reports /></AdminOpsProvider>} />
                <Route path="ops/help-desk" element={<AdminOpsProvider><HelpDesk /></AdminOpsProvider>} />
                <Route path="ops/business-health" element={<AdminOpsProvider><BusinessHealth /></AdminOpsProvider>} />
                <Route path="ops/revenue-opportunities" element={<AdminOpsProvider><RevenueOpportunities /></AdminOpsProvider>} />
                <Route path="ops/priority-actions" element={<AdminOpsProvider><PriorityActions /></AdminOpsProvider>} />
                <Route path="ops/live-activity" element={<AdminOpsProvider><LiveActivity /></AdminOpsProvider>} />
                <Route path="ops/competitor-tracking" element={<AdminOpsProvider><CompetitorTracking /></AdminOpsProvider>} />
                <Route path="ops/meeting-intelligence" element={<AdminOpsProvider><MeetingIntelligence /></AdminOpsProvider>} />
                <Route path="ops/services" element={<AdminOpsProvider><ServiceManager /></AdminOpsProvider>} />
                <Route path="ops/brand-assets" element={<AdminOpsProvider><BrandAssets /></AdminOpsProvider>} />
                <Route path="ops/onboarding" element={<AdminOpsProvider><Onboarding /></AdminOpsProvider>} />
                <Route path="ops/notifications" element={<AdminOpsProvider><Notifications /></AdminOpsProvider>} />
                <Route path="ops/calendar-integrations" element={<AdminOpsProvider><CalendarIntegrations /></AdminOpsProvider>} />
                <Route path="ops/training" element={<AdminOpsProvider><Training /></AdminOpsProvider>} />
                <Route path="ops/support-tickets" element={<AdminOpsProvider><SupportTickets /></AdminOpsProvider>} />
                <Route path="ops/knowledge-base" element={<AdminOpsProvider><KnowledgeBase /></AdminOpsProvider>} />
                <Route path="ops/setup-center" element={<AdminOpsProvider><SetupCenter /></AdminOpsProvider>} />
              </Route>

              {/* Employee Portal */}
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<Navigate to="/employee/generic" replace />} />
                <Route path="bdr" element={<BDRDashboard />} />
                <Route path="sdr" element={<SDRDashboard />} />
                <Route path="account-manager" element={<AccountManagerDashboard />} />
                <Route path="support" element={<SupportEmployeeDashboard />} />
                <Route path="generic" element={<GenericEmployeeDashboard />} />
                <Route path="training" element={<EmployeeTrainingCenter />} />
                <Route path="training/bdr/certification" element={<AdminBDRCertification basePath="/employee/training" />} />
                <Route path="training/bdr/flashcards" element={<AdminTrainingFlashcards />} />
                <Route path="training/:trackKey" element={<AdminTrainingTrack basePath="/employee/training" />} />
                <Route path="certification/bdr" element={<BDRCertificationExam />} />
                <Route path="leads" element={<ClientFlagGate flag="has_sales_team" source="employee"><BDRMyLeads /></ClientFlagGate>} />
                <Route path="lead-sourcing" element={<ClientFlagGate flag="has_sales_team" source="employee"><BDRLeadSourcing /></ClientFlagGate>} />
                <Route path="team-pipeline" element={<ClientFlagGate flag="has_sales_team" source="employee"><BDRTeamPipeline /></ClientFlagGate>} />
                <Route path="dialer" element={<ClientFlagGate flag="has_sales_team" source="employee"><BDRDialer /></ClientFlagGate>} />
                <Route path="street-walk" element={<ClientFlagGate flag="has_sales_team" source="employee"><BDRStreetWalk /></ClientFlagGate>} />
                <Route path="street-sweep" element={<ClientFlagGate flag="has_sales_team" source="employee"><StreetSweepDiscover /></ClientFlagGate>} />




                <Route path="pipeline" element={<EmployeePlaceholder title="My Leads/Pipeline" />} />
                <Route path="calendar" element={<ClientFlagGate flag="has_sales_team" source="employee"><BDRCalendar /></ClientFlagGate>} />
                <Route path="close-prep/:leadId" element={<ClientFlagGate flag="has_sales_team" source="employee"><ClosePrep /></ClientFlagGate>} />
                <Route path="pay-sign/:leadId" element={<ClientFlagGate flag="has_sales_team" source="employee"><EmployeePaySign /></ClientFlagGate>} />
                <Route path="profile" element={<EmployeePlaceholder title="My Profile" />} />
              </Route>

              {/* Legacy employee dashboard redirect */}
              <Route path="/employee/dashboard" element={<Navigate to="/employee/generic" replace />} />

              {/* Client Workspace */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crm" element={<PermissionGuard moduleKey="crm"><CRM /></PermissionGuard>} />
                <Route path="/crm/contacts/:contactId" element={<PermissionGuard moduleKey="crm"><ContactDetail /></PermissionGuard>} />
                <Route path="/crm/companies/:companyId" element={<PermissionGuard moduleKey="crm"><CompanyDetail /></PermissionGuard>} />
                <Route path="/call-tracking" element={<PermissionGuard moduleKey="crm"><CallTracking /></PermissionGuard>} />
                <Route path="/sales-team" element={<PermissionGuard moduleKey="crm"><ClientFlagGate flag="has_sales_team"><SalesTeamPipeline /></ClientFlagGate></PermissionGuard>} />
                <Route path="/website" element={<PermissionGuard moduleKey="website"><Website /></PermissionGuard>} />
                <Route path="/social-media" element={<PermissionGuard moduleKey="social"><SocialMedia /></PermissionGuard>} />
                <Route path="/seo" element={<PermissionGuard moduleKey="seo"><SEO /></PermissionGuard>} />
                <Route path="/paid-ads" element={<PermissionGuard moduleKey="ads"><PaidAds /></PermissionGuard>} />
                <Route path="/reviews" element={<PermissionGuard moduleKey="reviews"><Reviews /></PermissionGuard>} />
                <Route path="/approvals" element={<PermissionGuard moduleKey="approvals"><Approvals /></PermissionGuard>} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/reports" element={<PermissionGuard moduleKey="reports"><Reports /></PermissionGuard>} />
                <Route path="/ai-insights" element={<PermissionGuard moduleKey="ai"><AIInsights /></PermissionGuard>} />
                <Route path="/training" element={<PermissionGuard moduleKey="training"><Training /></PermissionGuard>} />
                <Route path="/settings" element={<PermissionGuard moduleKey="settings"><SettingsPage /></PermissionGuard>} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/pipeline" element={<PermissionGuard moduleKey="crm"><Pipeline /></PermissionGuard>} />
                <Route path="/pipeline-insights" element={<PermissionGuard moduleKey="reports"><SalesPipelineInsights /></PermissionGuard>} />
                <Route path="/inbox" element={<Navigate to="/conversations" replace />} />

                
                <Route path="/prospect-detail" element={<ProspectDetail />} />
                <Route path="/audit-pack" element={<AuditPack />} />
                <Route path="/meeting-outcome" element={<MeetingOutcome />} />
                <Route path="/proposal-draft" element={<ProposalDraft />} />
                <Route path="/website-builder" element={<PermissionGuard moduleKey="website"><WebsiteBuilder /></PermissionGuard>} />
                <Route path="/funnel-builder" element={<PermissionGuard moduleKey="website"><FunnelBuilder /></PermissionGuard>} />
                <Route path="/landing-pages" element={<PermissionGuard moduleKey="website"><LandingPageEditor /></PermissionGuard>} />
                <Route path="/forms" element={<PermissionGuard moduleKey="forms"><FormBuilder /></PermissionGuard>} />
                <Route path="/automations" element={<PermissionGuard moduleKey="intelligence"><AdminAutomations /></PermissionGuard>} />
                <Route path="/client-performance" element={<PermissionGuard moduleKey="reports"><ClientPerformance /></PermissionGuard>} />
                <Route path="/client-report" element={<PermissionGuard moduleKey="reports"><ClientReport /></PermissionGuard>} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/agency" element={<AgencyDashboard />} />
                <Route path="/integrations" element={<PermissionGuard moduleKey="settings"><Integrations /></PermissionGuard>} />
                <Route path="/growth-advisor" element={<PermissionGuard moduleKey="ai"><GrowthAdvisor /></PermissionGuard>} />
                <Route path="/tracking-attribution" element={<PermissionGuard moduleKey="reports"><TrackingAttribution /></PermissionGuard>} />
                <Route path="/lifecycle-nurture" element={<PermissionGuard moduleKey="intelligence"><LifecycleNurture /></PermissionGuard>} />
                <Route path="/financial-compliance" element={<PermissionGuard moduleKey="finance"><FinancialCompliance /></PermissionGuard>} />
                <Route path="/referral-program" element={<PermissionGuard moduleKey="intelligence"><ReferralProgram /></PermissionGuard>} />
                <Route path="/ai-visibility" element={<PermissionGuard moduleKey="ai"><AIVisibility /></PermissionGuard>} />
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
                <Route path="/internal-system" element={<InternalSystem />} />
                <Route path="/sops" element={<PlaceholderPage title="SOPs" description="Standard operating procedures for your team." />} />
                <Route path="/workflows" element={<PlaceholderPage title="Workflows" description="Internal process workflows and step-by-step playbooks." />} />
                <Route path="/roles-permissions" element={<PlaceholderPage title="Roles & Permissions" description="Manage team roles and access levels." />} />
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
                <Route path="/agreement-template" element={<PermissionGuard moduleKey="settings" minLevel="manage"><ClientAgreementTemplate /></PermissionGuard>} />
                <Route path="/payment-settings" element={<PermissionGuard moduleKey="settings" minLevel="manage"><ClientPaymentSettings /></PermissionGuard>} />
                <Route path="/onboarding-pipeline" element={<PermissionGuard moduleKey="crm"><OnboardingPipelineSetup /></PermissionGuard>} />
                <Route path="/close-and-send/:dealId" element={<PermissionGuard moduleKey="crm"><ClientCloseAndSend /></PermissionGuard>} />
                <Route path="/documents" element={<ClientDocuments />} />
                
                <Route path="/help-desk" element={<PermissionGuard moduleKey="support"><HelpDesk /></PermissionGuard>} />
                <Route path="/knowledge-base" element={<PermissionGuard moduleKey="support"><KnowledgeBase /></PermissionGuard>} />
                <Route path="/team" element={<PermissionGuard moduleKey="team"><AdminTeam /></PermissionGuard>} />
                <Route path="/staff-calendars" element={<PermissionGuard moduleKey="team"><AdminStaffCalendars /></PermissionGuard>} />
                <Route path="/employee-performance" element={<PermissionGuard moduleKey="team"><AdminEmployeePerformance /></PermissionGuard>} />
                <Route path="/training-center" element={<PermissionGuard moduleKey="training"><AdminTrainingCenter /></PermissionGuard>} />
                <Route path="/revenue-expansion" element={<PermissionGuard moduleKey="intelligence"><AdminRevenueExpansion /></PermissionGuard>} />
                <Route path="/audit-logs" element={<PermissionGuard moduleKey="intelligence"><AdminAuditLogs /></PermissionGuard>} />
                <Route path="/team-management" element={<TeamManagement />} />
                <Route path="/bdr-team-pipeline" element={<ClientFlagGate flag="has_sales_team"><BDRTeamPipeline /></ClientFlagGate>} />
                <Route path="/bdr-lead-sourcing" element={<ClientFlagGate flag="has_sales_team"><BDRLeadSourcing /></ClientFlagGate>} />
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
            </PWAInstallProvider>
          </WorkspaceProvider>
        </BrowserRouter>
      </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
