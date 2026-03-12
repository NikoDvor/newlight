// Shared types and mock data for CRM / Sales workflow

export type LeadStage = "New Lead" | "Contacted" | "Proposal Booked" | "Proposal Sent" | "Won" | "Lost";

export type WorkflowStatus =
  | "Booked"
  | "Intake Received"
  | "Audit Running"
  | "Audit Ready"
  | "Meeting Complete"
  | "Proposal Drafting"
  | "Proposal Needs Approval"
  | "Proposal Sent"
  | "Won"
  | "Lost";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  owner: string;
  nextTask: string;
  value: string;
  stage: LeadStage;
  notes: string;
  workflowStatus: WorkflowStatus;
}

export interface Conversation {
  id: string;
  contactName: string;
  company: string;
  channel: "sms" | "email" | "web_lead" | "call" | "internal";
  subject: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: { id: string; from: string; text: string; time: string; direction: "inbound" | "outbound" }[];
  tags: string[];
  nextTask: string;
}

export interface AuditItem {
  name: string;
  status: "Not Started" | "Running" | "Ready" | "Failed";
}

export const STAGE_ORDER: LeadStage[] = ["New Lead", "Contacted", "Proposal Booked", "Proposal Sent", "Won", "Lost"];

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
  Booked: "bg-blue-50 text-blue-700",
  "Intake Received": "bg-sky-50 text-sky-700",
  "Audit Running": "bg-amber-50 text-amber-700",
  "Audit Ready": "bg-emerald-50 text-emerald-700",
  "Meeting Complete": "bg-indigo-50 text-indigo-700",
  "Proposal Drafting": "bg-violet-50 text-violet-700",
  "Proposal Needs Approval": "bg-orange-50 text-orange-700",
  "Proposal Sent": "bg-cyan-50 text-cyan-700",
  Won: "bg-green-50 text-green-700",
  Lost: "bg-red-50 text-red-700",
};

export const mockLeads: Lead[] = [
  { id: "1", name: "Sarah Johnson", company: "TechCorp Inc.", email: "sarah@techcorp.com", phone: "(555) 123-4567", source: "Website", tags: ["Enterprise", "Q2"], owner: "Alex M.", nextTask: "Send proposal", value: "$24,000", stage: "Proposal Sent", notes: "Interested in full marketing package.", workflowStatus: "Proposal Sent" },
  { id: "2", name: "Mike Chen", company: "GrowthLab", email: "mike@growthlab.io", phone: "(555) 234-5678", source: "Referral", tags: ["SMB"], owner: "Jordan R.", nextTask: "Schedule call", value: "$8,500", stage: "New Lead", notes: "Came from partner referral.", workflowStatus: "Booked" },
  { id: "3", name: "Lisa Park", company: "Bloom Agency", email: "lisa@bloom.co", phone: "(555) 345-6789", source: "Google Ads", tags: ["Agency", "Priority"], owner: "Alex M.", nextTask: "Follow up on proposal", value: "$36,000", stage: "Proposal Booked", notes: "High-value prospect, wants SEO + PPC.", workflowStatus: "Audit Running" },
  { id: "4", name: "David Smith", company: "RetailMax", email: "david@retailmax.com", phone: "(555) 456-7890", source: "LinkedIn", tags: ["Enterprise", "Q1"], owner: "Jordan R.", nextTask: "Send contract", value: "$52,000", stage: "Won", notes: "Signed 12-month contract.", workflowStatus: "Won" },
  { id: "5", name: "Emma Wilson", company: "Startup Labs", email: "emma@startuplabs.io", phone: "(555) 567-8901", source: "Website", tags: ["Startup"], owner: "Alex M.", nextTask: "Initial outreach", value: "$12,000", stage: "Contacted", notes: "Interested in social media management.", workflowStatus: "Intake Received" },
  { id: "6", name: "Tom Harris", company: "LocalEats", email: "tom@localeats.com", phone: "(555) 678-9012", source: "Referral", tags: ["Local", "Restaurant"], owner: "Jordan R.", nextTask: "Prepare audit", value: "$6,000", stage: "Contacted", notes: "Needs Google Business and reviews help.", workflowStatus: "Audit Running" },
  { id: "7", name: "Rachel Green", company: "FitLife Studios", email: "rachel@fitlife.com", phone: "(555) 789-0123", source: "Instagram", tags: ["Fitness", "SMB"], owner: "Alex M.", nextTask: "Book proposal meeting", value: "$15,000", stage: "New Lead", notes: "Wants website + social media bundle.", workflowStatus: "Booked" },
  { id: "8", name: "James Lee", company: "CloudSoft", email: "james@cloudsoft.io", phone: "(555) 890-1234", source: "Website", tags: ["SaaS", "Enterprise"], owner: "Jordan R.", nextTask: "Send recap email", value: "$45,000", stage: "Lost", notes: "Went with another agency.", workflowStatus: "Lost" },
];

export const mockConversations: Conversation[] = [
  {
    id: "c1", contactName: "Sarah Johnson", company: "TechCorp Inc.", channel: "email", subject: "Proposal Follow-up", lastMessage: "Thanks for sending the proposal over. We'll review it this week.", time: "2 hours ago", unread: true, tags: ["Enterprise"], nextTask: "Follow up Friday",
    messages: [
      { id: "m1", from: "You", text: "Hi Sarah, here's the updated proposal for the marketing package we discussed.", time: "Yesterday 3:45 PM", direction: "outbound" },
      { id: "m2", from: "Sarah Johnson", text: "Thanks for sending the proposal over. We'll review it this week.", time: "2 hours ago", direction: "inbound" },
    ],
  },
  {
    id: "c2", contactName: "Mike Chen", company: "GrowthLab", channel: "sms", subject: "Initial Contact", lastMessage: "Hey! Just wanted to check if you got my voicemail.", time: "4 hours ago", unread: false, tags: ["SMB"], nextTask: "Schedule discovery call",
    messages: [
      { id: "m3", from: "You", text: "Hi Mike, this is Alex from NewLight Marketing. I'd love to chat about how we can help GrowthLab.", time: "Yesterday 10:00 AM", direction: "outbound" },
      { id: "m4", from: "Mike Chen", text: "Hey! Just wanted to check if you got my voicemail.", time: "4 hours ago", direction: "inbound" },
    ],
  },
  {
    id: "c3", contactName: "Lisa Park", company: "Bloom Agency", channel: "web_lead", subject: "Website Inquiry", lastMessage: "I'm interested in your SEO and PPC services. Can we set up a call?", time: "1 day ago", unread: true, tags: ["Agency", "Priority"], nextTask: "Send calendar link",
    messages: [
      { id: "m5", from: "Lisa Park", text: "I'm interested in your SEO and PPC services. Can we set up a call?", time: "1 day ago", direction: "inbound" },
    ],
  },
  {
    id: "c4", contactName: "Tom Harris", company: "LocalEats", channel: "call", subject: "Discovery Call Notes", lastMessage: "Discussed local SEO strategy and Google Business optimization.", time: "2 days ago", unread: false, tags: ["Local"], nextTask: "Prepare audit pack",
    messages: [
      { id: "m6", from: "You", text: "Call notes: Tom is looking for help with Google Business Profile and getting more online reviews. Budget around $500/mo.", time: "2 days ago", direction: "outbound" },
    ],
  },
  {
    id: "c5", contactName: "Internal", company: "", channel: "internal", subject: "Team Update", lastMessage: "Reminder: All audit packs need to be completed by Friday EOD.", time: "3 hours ago", unread: false, tags: [], nextTask: "",
    messages: [
      { id: "m7", from: "Jordan R.", text: "Reminder: All audit packs need to be completed by Friday EOD.", time: "3 hours ago", direction: "inbound" },
    ],
  },
];

export const mockAuditItems: AuditItem[] = [
  { name: "Website Audit", status: "Ready" },
  { name: "Social Analysis", status: "Running" },
  { name: "CRM Bottleneck Analysis", status: "Not Started" },
  { name: "Reviews / Reputation Analysis", status: "Ready" },
  { name: "SEO / Local Visibility Analysis", status: "Running" },
  { name: "Market Research", status: "Not Started" },
  { name: "Website Preview", status: "Failed" },
];
