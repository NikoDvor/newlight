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

export const mockLeads: Lead[] = [];

export const mockConversations: Conversation[] = [];

export const mockAuditItems: AuditItem[] = [];
