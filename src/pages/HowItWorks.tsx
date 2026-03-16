import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Users, Calendar, Mail, Star, Globe, Search, Megaphone, Share2,
  Wallet, FileText, Plug, Brain, Heart, Target, DollarSign,
  TrendingUp, Workflow, Shield, ChevronDown, ChevronRight,
  ArrowRight, CheckCircle2, Zap, Info, Lightbulb
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ─── Module definitions ─── */
interface ModuleInfo {
  id: string;
  icon: any;
  name: string;
  tagline: string;
  whatItIs: string;
  whatItDoes: string;
  connectsTo: string[];
  automatic: string[];
  manual: string[];
  whyItMatters: string;
  flow: { label: string; detail?: string }[];
  category: string;
}

const modules: ModuleInfo[] = [
  {
    id: "crm", icon: Users, name: "CRM", tagline: "Your customer command center",
    category: "Growth Systems",
    whatItIs: "A central place to store and manage every lead, customer, and business contact.",
    whatItDoes: "Tracks contacts through your sales pipeline — from first inquiry to loyal customer. Stores notes, history, deals, and communication in one place.",
    connectsTo: ["Calendar", "Email", "Reviews", "Automations"],
    automatic: ["New leads are scored automatically", "Contact records update when appointments are booked", "Email conversations are linked to contacts", "Follow-up tasks are created for uncontacted leads"],
    manual: ["Add or import contacts", "Move deals through pipeline stages", "Add notes after calls or meetings"],
    whyItMatters: "Without a CRM, leads fall through the cracks. This ensures every potential customer gets proper follow-up.",
    flow: [
      { label: "Lead comes in", detail: "From website, ad, referral, or manual entry" },
      { label: "Contact created", detail: "Record stored with source and details" },
      { label: "Pipeline updated", detail: "Lead moves through stages" },
      { label: "Follow-up happens", detail: "Automated or manual outreach" },
      { label: "Deal closed", detail: "Won or lost, logged to history" },
    ],
  },
  {
    id: "calendar", icon: Calendar, name: "Calendar", tagline: "Never miss an appointment",
    category: "Enterprise Services",
    whatItIs: "A scheduling and appointment management system for your business.",
    whatItDoes: "Manages bookings, sends reminders, tracks attendance, and connects appointments to your CRM contacts.",
    connectsTo: ["CRM", "Reviews", "Automations", "Email"],
    automatic: ["Reminders sent before appointments", "No-shows are flagged automatically", "Review requests triggered after completed appointments", "CRM contact history updated"],
    manual: ["Create appointments", "Mark appointments as completed", "Add notes after meetings"],
    whyItMatters: "Missed appointments cost money. This system keeps your schedule organized and reduces no-shows.",
    flow: [
      { label: "Customer books", detail: "Via booking link or manual entry" },
      { label: "Appointment created", detail: "Stored in calendar with details" },
      { label: "Reminders sent", detail: "24h, 3h, and 30min before" },
      { label: "Appointment completed", detail: "Marked by staff after visit" },
      { label: "Review request triggered", detail: "Automatically asks for feedback" },
    ],
  },
  {
    id: "email", icon: Mail, name: "Email", tagline: "Communicate without leaving the app",
    category: "Enterprise Services",
    whatItIs: "An email hub that lets you read, reply to, and manage business emails inside the platform.",
    whatItDoes: "Shows your inbox, lets you compose and reply, and automatically links email conversations to CRM contacts.",
    connectsTo: ["CRM", "Calendar", "Automations"],
    automatic: ["Emails matched to CRM contacts by address", "Conversation history logged to contact records", "Connection status monitored"],
    manual: ["Connect your email account", "Reply to messages", "Create contacts from unknown senders"],
    whyItMatters: "Centralizes communication so you never lose track of a customer conversation.",
    flow: [
      { label: "Email connected", detail: "Link Gmail or Outlook account" },
      { label: "Messages appear", detail: "Inbox syncs to the app" },
      { label: "Reply sent", detail: "Respond from within the platform" },
      { label: "Logged to CRM", detail: "Conversation linked to contact" },
    ],
  },
  {
    id: "reviews", icon: Star, name: "Reviews", tagline: "Build your reputation automatically",
    category: "Growth Systems",
    whatItIs: "A review generation and reputation management system.",
    whatItDoes: "Sends review requests to customers, collects feedback, routes happy customers to public review sites, and flags unhappy customers for follow-up.",
    connectsTo: ["Calendar", "CRM", "Automations"],
    automatic: ["Review requests sent after appointments", "Happy responses directed to Google/Yelp", "Unhappy responses flagged for recovery", "Review stats updated on dashboard"],
    manual: ["Send manual review requests", "Respond to negative feedback", "Choose review platforms"],
    whyItMatters: "More positive reviews mean more trust, more clicks, and more customers.",
    flow: [
      { label: "Appointment completed" },
      { label: "Review request sent", detail: "Via SMS or email" },
      { label: "Customer responds" },
      { label: "Happy → Public review", detail: "Directed to Google/Yelp" },
      { label: "Unhappy → Recovery", detail: "Internal alert for follow-up" },
    ],
  },
  {
    id: "website", icon: Globe, name: "Website", tagline: "Your online storefront",
    category: "Growth Systems",
    whatItIs: "Website performance tracking and management tools.",
    whatItDoes: "Monitors your website traffic, page speed, conversions, and provides insights on what to improve.",
    connectsTo: ["SEO", "Ads", "CRM"],
    automatic: ["Traffic metrics tracked", "Conversion rates calculated", "Performance alerts generated"],
    manual: ["Update website content", "Review analytics", "Implement suggested changes"],
    whyItMatters: "Your website is often the first impression. Knowing how it performs helps you convert more visitors into customers.",
    flow: [
      { label: "Visitor lands on site" },
      { label: "Behavior tracked", detail: "Pages viewed, time spent" },
      { label: "Conversion tracked", detail: "Form fill, call, or booking" },
      { label: "Lead created in CRM", detail: "If form submitted" },
    ],
  },
  {
    id: "seo", icon: Search, name: "SEO", tagline: "Get found on Google",
    category: "Growth Systems",
    whatItIs: "Search Engine Optimization tracking — how well your business shows up when people search online.",
    whatItDoes: "Tracks your keyword rankings, identifies SEO issues, monitors competitors, and suggests improvements.",
    connectsTo: ["Website", "Reviews", "Competitor Tracking"],
    automatic: ["Keyword positions tracked", "SEO issues detected", "Competitor rankings compared"],
    manual: ["Review keyword reports", "Implement content changes", "Fix technical issues"],
    whyItMatters: "If people can't find you on Google, they'll find your competitor instead.",
    flow: [
      { label: "Keywords tracked" },
      { label: "Rankings monitored", detail: "Position changes detected" },
      { label: "Issues identified", detail: "Missing tags, slow pages, etc." },
      { label: "Actions recommended", detail: "Prioritized improvements" },
    ],
  },
  {
    id: "ads", icon: Megaphone, name: "Ads", tagline: "Turn ad spend into customers",
    category: "Growth Systems",
    whatItIs: "Paid advertising campaign management and performance tracking.",
    whatItDoes: "Shows how your Google Ads, Facebook Ads, and other campaigns are performing — clicks, leads, cost per lead, and return on ad spend.",
    connectsTo: ["CRM", "Website", "Calendar"],
    automatic: ["Campaign metrics synced", "Cost per lead calculated", "ROAS tracked", "Budget alerts triggered"],
    manual: ["Create and adjust campaigns", "Set budgets", "Review performance reports"],
    whyItMatters: "Knowing your cost per lead and return on ad spend helps you spend smarter and grow faster.",
    flow: [
      { label: "Campaign launched" },
      { label: "Impressions & clicks", detail: "Ad shown to audience" },
      { label: "Leads generated", detail: "Form fills or calls" },
      { label: "Cost per lead calculated" },
      { label: "ROAS reported", detail: "Revenue vs. spend" },
    ],
  },
  {
    id: "social", icon: Share2, name: "Social Media", tagline: "Stay visible and engaging",
    category: "Growth Systems",
    whatItIs: "Social media presence tracking and content management.",
    whatItDoes: "Monitors your social media performance across platforms and helps plan content.",
    connectsTo: ["Website", "Reviews", "Ads"],
    automatic: ["Engagement metrics tracked", "Performance summaries generated"],
    manual: ["Post content", "Respond to comments", "Plan content calendar"],
    whyItMatters: "Consistent social media builds trust and keeps your brand top of mind.",
    flow: [
      { label: "Content published" },
      { label: "Engagement tracked", detail: "Likes, shares, comments" },
      { label: "Audience grows" },
      { label: "Traffic driven to website" },
    ],
  },
  {
    id: "finance", icon: Wallet, name: "Finance", tagline: "Know your numbers",
    category: "Enterprise Services",
    whatItIs: "Financial tracking including revenue, expenses, payroll, and business adjustments.",
    whatItDoes: "Shows daily/weekly/monthly revenue, tracks payroll, and provides financial summaries.",
    connectsTo: ["CRM", "Calendar", "Reports"],
    automatic: ["Revenue calculated from deals", "Payroll totals computed", "Financial summaries generated"],
    manual: ["Log manual adjustments", "Approve payroll runs", "Review financial reports"],
    whyItMatters: "Clear financial visibility helps you make smarter business decisions.",
    flow: [
      { label: "Deals closed in CRM" },
      { label: "Revenue recorded" },
      { label: "Expenses & payroll tracked" },
      { label: "Profit calculated" },
    ],
  },
  {
    id: "integrations", icon: Plug, name: "Integrations", tagline: "Connect your tools",
    category: "Setup",
    whatItIs: "A central place to connect your external business accounts to the platform.",
    whatItDoes: "Links your Google Business, ad accounts, review platforms, website analytics, and other tools so data flows automatically.",
    connectsTo: ["All modules"],
    automatic: ["Connection health monitored", "Sync status updated", "Error alerts generated"],
    manual: ["Connect each account", "Reconnect if needed", "Review connection status"],
    whyItMatters: "Connected accounts mean automatic data — less manual work, more accurate insights.",
    flow: [
      { label: "Onboarding started" },
      { label: "Integration records created" },
      { label: "Statuses assigned", detail: "Not Started, Access Needed, etc." },
      { label: "Client connects accounts" },
      { label: "Data starts flowing" },
    ],
  },
  {
    id: "ai", icon: Brain, name: "Ask AI", tagline: "Your AI business advisor",
    category: "Intelligence",
    whatItIs: "An AI assistant that analyzes your business data and provides actionable recommendations.",
    whatItDoes: "Reviews your CRM, calendar, reviews, and financial data to find opportunities, flag issues, and suggest next steps.",
    connectsTo: ["CRM", "Calendar", "Reviews", "Finance", "Growth Score"],
    automatic: ["Business insights generated", "Priority actions ranked", "Opportunity alerts created"],
    manual: ["Ask specific questions", "Review suggestions", "Act on recommendations"],
    whyItMatters: "Like having a business consultant available 24/7 — always watching for ways to help you grow.",
    flow: [
      { label: "Data collected", detail: "From all connected modules" },
      { label: "AI analyzes patterns" },
      { label: "Insights generated", detail: "Specific, actionable advice" },
      { label: "Priority actions listed" },
    ],
  },
  {
    id: "growth-score", icon: Heart, name: "Growth Score", tagline: "Your business health at a glance",
    category: "Intelligence",
    whatItIs: "A 0–100 score that measures how well your business growth systems are performing.",
    whatItDoes: "Evaluates 8 categories — website, SEO, leads, conversions, reviews, social, automation, and ads — then combines them into one score.",
    connectsTo: ["All Growth Systems", "AI Advisor"],
    automatic: ["Score calculated from real data", "Category breakdowns updated", "Weak areas identified", "Improvement actions suggested"],
    manual: ["Review your score regularly", "Act on recommendations"],
    whyItMatters: "One number tells you if your growth systems are working or need attention.",
    flow: [
      { label: "Data collected", detail: "From all growth modules" },
      { label: "Score calculated", detail: "Weighted across 8 categories" },
      { label: "Weak areas identified" },
      { label: "Priority actions suggested" },
    ],
  },
  {
    id: "opportunities", icon: Target, name: "Opportunity Finder", tagline: "Find money you're leaving on the table",
    category: "Intelligence",
    whatItIs: "A system that detects missed revenue opportunities across your business.",
    whatItDoes: "Scans for uncontacted leads, missed follow-ups, inactive customers, and low review volume — then estimates how much revenue you're missing.",
    connectsTo: ["CRM", "Calendar", "Reviews"],
    automatic: ["Missed opportunities detected", "Revenue impact estimated", "Actions recommended"],
    manual: ["Review opportunities", "Take recommended actions"],
    whyItMatters: "Most businesses leave money on the table without knowing it. This finds it for you.",
    flow: [
      { label: "Business data scanned" },
      { label: "Gaps detected", detail: "Missed leads, reviews, follow-ups" },
      { label: "Revenue estimated", detail: "$ impact calculated" },
      { label: "Actions recommended" },
    ],
  },
  {
    id: "simulator", icon: DollarSign, name: "Revenue Simulator", tagline: "See what's possible",
    category: "Intelligence",
    whatItIs: "An interactive tool that projects how changes in your business would affect revenue.",
    whatItDoes: "Lets you adjust conversion rates, review ratings, traffic, and retention to see projected revenue impact.",
    connectsTo: ["Growth Score", "CRM", "Finance"],
    automatic: ["Baseline calculated from your data"],
    manual: ["Adjust sliders to explore scenarios", "Set growth targets"],
    whyItMatters: "Helps you prioritize which improvements will have the biggest financial impact.",
    flow: [
      { label: "Current metrics loaded" },
      { label: "Adjust variables", detail: "Conversion, traffic, retention" },
      { label: "Revenue projected" },
      { label: "Best actions identified" },
    ],
  },
  {
    id: "onboarding", icon: Workflow, name: "Onboarding", tagline: "Get set up fast",
    category: "Setup",
    whatItIs: "A guided setup process to get your workspace fully configured.",
    whatItDoes: "Walks you through connecting accounts, entering business info, setting up your CRM, and preparing for launch.",
    connectsTo: ["Integrations", "CRM", "Calendar", "Branding"],
    automatic: ["Progress tracked automatically", "Setup tasks created", "Status updates sent to admin"],
    manual: ["Complete each setup step", "Connect accounts", "Upload brand assets"],
    whyItMatters: "A properly set up workspace means everything works smoothly from day one.",
    flow: [
      { label: "Account created" },
      { label: "Business info entered" },
      { label: "Accounts connected" },
      { label: "CRM configured" },
      { label: "Ready to launch" },
    ],
  },
  {
    id: "admin", icon: Shield, name: "Admin Portal", tagline: "Manage everything from one place",
    category: "Administration",
    whatItIs: "The central management hub for administrators to oversee all client workspaces and platform operations.",
    whatItDoes: "Lets admins create clients, monitor health scores, manage team members, review prospects, and control platform settings.",
    connectsTo: ["All client workspaces", "Team management", "Provisioning"],
    automatic: ["Client health monitored", "Onboarding progress tracked", "Integration errors flagged", "Audit logs recorded"],
    manual: ["Create and manage clients", "Assign team members", "Review and resolve issues", "Configure platform settings"],
    whyItMatters: "Gives your team complete visibility and control over every client relationship.",
    flow: [
      { label: "Prospect identified" },
      { label: "Demo built" },
      { label: "Client activated" },
      { label: "Workspace provisioned" },
      { label: "Onboarding monitored" },
      { label: "Growth managed" },
    ],
  },
];

/* ─── Status glossary ─── */
const statuses = [
  { label: "Not Started", color: "hsla(215,16%,50%,.15)", textColor: "hsl(215 16% 50%)", meaning: "This item hasn't been started yet. No action has been taken." },
  { label: "Access Needed", color: "hsla(38,92%,50%,.12)", textColor: "hsl(38 92% 50%)", meaning: "We need login credentials or permissions from you to proceed." },
  { label: "Ready to Connect", color: "hsla(211,96%,56%,.12)", textColor: "hsl(211 96% 56%)", meaning: "Everything is prepared — just needs to be connected." },
  { label: "Connected", color: "hsla(142,72%,45%,.12)", textColor: "hsl(142 72% 45%)", meaning: "Successfully linked and working. Data is flowing." },
  { label: "Needs Reconnect", color: "hsla(0,84%,60%,.12)", textColor: "hsl(0 84% 60%)", meaning: "The connection was lost. Needs to be re-linked." },
  { label: "Awaiting Client", color: "hsla(38,92%,50%,.12)", textColor: "hsl(38 92% 50%)", meaning: "We're waiting for you to complete an action or provide information." },
  { label: "Awaiting Operator", color: "hsla(270,70%,55%,.12)", textColor: "hsl(270 70% 55%)", meaning: "Our team is working on this. No action needed from you." },
  { label: "Booked", color: "hsla(211,96%,56%,.12)", textColor: "hsl(211 96% 56%)", meaning: "An appointment has been scheduled and confirmed." },
  { label: "Completed", color: "hsla(142,72%,45%,.12)", textColor: "hsl(142 72% 45%)", meaning: "This item is finished and done." },
  { label: "Cancelled", color: "hsla(0,84%,60%,.12)", textColor: "hsl(0 84% 60%)", meaning: "This was cancelled and is no longer active." },
  { label: "Closed Won", color: "hsla(142,72%,45%,.12)", textColor: "hsl(142 72% 45%)", meaning: "The deal was successful — the customer said yes!" },
  { label: "Closed Lost", color: "hsla(0,84%,60%,.12)", textColor: "hsl(0 84% 60%)", meaning: "The deal didn't work out. Stored for learning and follow-up." },
];

const categories = ["Growth Systems", "Enterprise Services", "Intelligence", "Setup", "Administration"];

export default function HowItWorks() {
  const { isAdmin } = useWorkspace();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all"
    ? modules
    : modules.filter((m) => m.category === activeCategory);

  return (
    <div>
      <PageHeader
        title="How It Works"
        description="Understand every part of your growth system in simple terms"
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mt-4 mb-8">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeCategory === "all"
              ? "text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={activeCategory === "all" ? {
            background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))",
            boxShadow: "0 2px 12px -3px hsla(211,96%,56%,.4)",
          } : { background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,56%,.1)" }}
        >
          All Modules
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeCategory === cat
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={activeCategory === cat ? {
              background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))",
              boxShadow: "0 2px 12px -3px hsla(211,96%,56%,.4)",
            } : { background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,56%,.1)" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Module cards */}
      <div className="space-y-4">
        {filtered.map((mod) => {
          const isOpen = expandedModule === mod.id;
          return (
            <motion.div
              key={mod.id}
              className="card-widget overflow-hidden"
              layout
            >
              {/* Header — always visible */}
              <button
                onClick={() => setExpandedModule(isOpen ? null : mod.id)}
                className="w-full flex items-center gap-4 text-left"
              >
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsla(211,96%,56%,.08)" }}
                >
                  <mod.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{mod.name}</h3>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-primary/15 text-muted-foreground"
                    >
                      {mod.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.tagline}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 space-y-5">
                      {/* What it is & does */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl" style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,56%,.08)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">What It Is</p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{mod.whatItIs}</p>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,56%,.08)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">What It Does</p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{mod.whatItDoes}</p>
                        </div>
                      </div>

                      {/* Why it matters */}
                      <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: "linear-gradient(135deg, hsla(211,96%,56%,.06), hsla(197,92%,68%,.04))", border: "1px solid hsla(211,96%,56%,.1)" }}>
                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "hsl(38 92% 50%)" }} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Why It Matters</p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{mod.whyItMatters}</p>
                        </div>
                      </div>

                      {/* Flow diagram */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">How It Flows</p>
                        <div className="flex flex-col sm:flex-row items-stretch gap-0">
                          {mod.flow.map((step, i) => (
                            <div key={i} className="flex items-center sm:flex-1">
                              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "hsla(211,96%,56%,.05)", border: "1px solid hsla(211,96%,56%,.1)" }}>
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center mx-auto mb-1.5 text-[10px] font-bold text-white"
                                  style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))" }}
                                >
                                  {i + 1}
                                </div>
                                <p className="text-[11px] font-semibold text-foreground">{step.label}</p>
                                {step.detail && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</p>
                                )}
                              </div>
                              {i < mod.flow.length - 1 && (
                                <ArrowRight className="h-3.5 w-3.5 text-primary/30 shrink-0 mx-1 hidden sm:block" />
                              )}
                              {i < mod.flow.length - 1 && (
                                <div className="flex justify-center py-1 sm:hidden">
                                  <ChevronDown className="h-3 w-3 text-primary/30" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Automatic vs Manual */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl" style={{ background: "hsla(142,72%,45%,.04)", border: "1px solid hsla(142,72%,45%,.1)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "hsl(142 72% 45%)" }}>
                            ⚡ Happens Automatically
                          </p>
                          <ul className="space-y-1.5">
                            {mod.automatic.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                                <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "hsl(142 72% 45%)" }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,56%,.1)" }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "hsl(211 96% 56%)" }}>
                            👤 You Do This
                          </p>
                          <ul className="space-y-1.5">
                            {mod.manual.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                                <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "hsl(211 96% 56%)" }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Connects to */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Connects To</p>
                        <div className="flex flex-wrap gap-2">
                          {mod.connectsTo.map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-[10px] border-primary/15 text-primary/70"
                            >
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Admin details */}
                      {isAdmin && (
                        <div className="p-4 rounded-xl" style={{ background: "hsla(270,70%,55%,.05)", border: "1px solid hsla(270,70%,55%,.1)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-3.5 w-3.5" style={{ color: "hsl(270 70% 55%)" }} />
                            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "hsl(270 70% 55%)" }}>
                              Admin / Internal Notes
                            </p>
                          </div>
                          <ul className="space-y-1 text-xs text-foreground/60">
                            <li>• Records are scoped by client_id with RLS policies</li>
                            <li>• Automations trigger via autopilot_rules table</li>
                            <li>• All actions logged to audit_logs and crm_activities</li>
                            <li>• Module data connects via foreign keys to clients table</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Status Glossary */}
      <div className="mt-12">
        <h2 className="text-lg font-bold text-foreground mb-1">Status Glossary</h2>
        <p className="text-xs text-muted-foreground mb-6">What every status label means across the platform</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {statuses.map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-xl"
              style={{ background: s.color, border: `1px solid ${s.color}` }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-2 w-2 rounded-full" style={{ background: s.textColor }} />
                <span className="text-xs font-bold" style={{ color: s.textColor }}>{s.label}</span>
              </div>
              <p className="text-[11px] text-foreground/60 leading-relaxed">{s.meaning}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Platform overview */}
      <div className="mt-12 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">How It All Fits Together</h2>
        <p className="text-xs text-muted-foreground mb-6">The complete NewLight growth engine</p>
        <div className="card-widget p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Attract", desc: "Website, SEO, Ads, Social", icon: Globe },
              { label: "Capture", desc: "CRM, Forms, Calendar", icon: Users },
              { label: "Convert", desc: "Follow-ups, Reviews, Email", icon: Star },
              { label: "Grow", desc: "AI, Score, Simulator", icon: TrendingUp },
            ].map((phase, i) => (
              <div key={phase.label} className="text-center">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: "hsla(211,96%,56%,.08)" }}
                >
                  <phase.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <p className="text-xs font-bold text-foreground">{phase.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{phase.desc}</p>
                {i < 3 && (
                  <ArrowRight className="h-3 w-3 text-primary/20 mx-auto mt-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="text-center p-4 rounded-xl" style={{ background: "linear-gradient(135deg, hsla(211,96%,56%,.06), hsla(197,92%,68%,.04))", border: "1px solid hsla(211,96%,56%,.08)" }}>
            <Zap className="h-5 w-5 mx-auto mb-2" style={{ color: "hsl(211 96% 56%)" }} />
            <p className="text-xs font-semibold text-foreground">Everything connects automatically</p>
            <p className="text-[10px] text-muted-foreground mt-1">Leads flow into CRM → Appointments booked → Reviews collected → Growth tracked → AI advises next steps</p>
          </div>
        </div>
      </div>
    </div>
  );
}
