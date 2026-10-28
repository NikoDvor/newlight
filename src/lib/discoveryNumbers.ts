/**
 * Discovery numbers — the prospect's own figures entered on the discovery call.
 *
 * Salesman enters (each with a month/year switch where it's a flow):
 *   goal revenue, goal clients, current revenue, current clients,
 *   number of new leads, leads per client.
 * The app derives:
 *   average ticket = current revenue ÷ current clients
 *   close rate     = 1 ÷ leads per client
 *   new clients    = new leads ÷ leads per client
 *   new revenue    = new clients × average ticket          (current pace, per year)
 *   gap            = goal − current (revenue and clients)
 * Sliders model leads / close rate / ticket:
 *   modelled revenue           = leads × close rate × ticket
 *   missed revenue opportunity = modelled revenue − current-pace new revenue
 *   gap remaining              = gap − modelled revenue
 * Everything is annual. Pure functions only — the panel and admin table share them.
 */

export type Period = "year" | "month";
export type FirmType = "ria" | "insurance";

export interface DiscoveryInputs {
  firm_type: FirmType;
  goal_revenue: number | null;
  goal_revenue_period: Period;
  goal_clients: number | null;
  current_revenue: number | null;
  current_revenue_period: Period;
  current_clients: number | null;
  new_leads: number | null;
  new_leads_period: Period;
  leads_per_client: number | null;
}

export interface DiscoveryModel {
  leads: number;     // per year
  closeRate: number; // 0–1
  ticket: number;    // $ per client per year
}

export const EMPTY_INPUTS: DiscoveryInputs = {
  firm_type: "ria",
  goal_revenue: null, goal_revenue_period: "year",
  goal_clients: null,
  current_revenue: null, current_revenue_period: "year",
  current_clients: null,
  new_leads: null, new_leads_period: "year",
  leads_per_client: null,
};

const annual = (v: number | null, p: Period) => (v == null ? null : p === "month" ? v * 12 : v);
const pos = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export interface DiscoveryResult {
  goalRevenue: number | null;
  goalClients: number | null;
  currentRevenue: number | null;
  currentClients: number | null;
  avgTicket: number | null;
  closeRate: number | null;
  leadsPerYear: number | null;
  newClients: number | null;
  newRevenue: number | null;
  gapRevenue: number | null;
  gapClients: number | null;
  shortAtPace: number | null;
  /** What's missing to calculate (labels), empty when complete. */
  missing: string[];
}

export function computeDiscovery(i: DiscoveryInputs): DiscoveryResult {
  const goalRevenue = annual(i.goal_revenue, i.goal_revenue_period);
  const currentRevenue = annual(i.current_revenue, i.current_revenue_period);
  const leadsPerYear = annual(i.new_leads, i.new_leads_period);
  const avgTicket = pos(currentRevenue) && pos(i.current_clients) ? currentRevenue / i.current_clients : null;
  const closeRate = pos(i.leads_per_client) ? Math.min(1, 1 / i.leads_per_client) : null;
  const newClients = leadsPerYear != null && pos(i.leads_per_client) ? leadsPerYear / i.leads_per_client : null;
  const newRevenue = newClients != null && avgTicket != null ? newClients * avgTicket : null;
  const gapRevenue = goalRevenue != null && currentRevenue != null ? Math.max(0, goalRevenue - currentRevenue) : null;
  const gapClients = i.goal_clients != null && i.current_clients != null ? Math.max(0, i.goal_clients - i.current_clients) : null;
  const shortAtPace = gapRevenue != null && newRevenue != null ? Math.max(0, gapRevenue - newRevenue) : null;
  const clientWord = i.firm_type === "insurance" ? "policies" : "clients";
  const missing: string[] = [];
  if (i.goal_revenue == null) missing.push("goal revenue");
  if (i.goal_clients == null) missing.push(`goal ${clientWord}`);
  if (i.current_revenue == null) missing.push("current revenue");
  if (i.current_clients == null) missing.push(`current ${clientWord}`);
  if (i.new_leads == null) missing.push("new leads");
  if (i.leads_per_client == null) missing.push(`leads per ${i.firm_type === "insurance" ? "policy" : "client"}`);
  return {
    goalRevenue, goalClients: i.goal_clients, currentRevenue, currentClients: i.current_clients,
    avgTicket, closeRate, leadsPerYear, newClients, newRevenue, gapRevenue, gapClients, shortAtPace, missing,
  };
}

/** The current numbers as the slider starting point. */
export function baselineModel(r: DiscoveryResult): DiscoveryModel {
  return {
    leads: r.leadsPerYear ?? 0,
    closeRate: r.closeRate ?? 0,
    ticket: r.avgTicket ?? 0,
  };
}

export function projectModel(r: DiscoveryResult, m: DiscoveryModel) {
  const modelClients = m.leads * m.closeRate;
  const modelRevenue = modelClients * m.ticket;
  const missedOpportunity = Math.max(0, modelRevenue - (r.newRevenue ?? 0));
  const gapRemaining = r.gapRevenue != null ? Math.max(0, r.gapRevenue - modelRevenue) : null;
  const gapClosedShare = r.gapRevenue ? Math.min(1, modelRevenue / r.gapRevenue) : null;
  const clientsNeeded = r.gapRevenue != null && m.ticket > 0 ? Math.ceil(r.gapRevenue / m.ticket) : null;
  const leadsNeeded = clientsNeeded != null && m.closeRate > 0 ? Math.ceil(clientsNeeded / m.closeRate) : null;
  return { modelClients, modelRevenue, missedOpportunity, gapRemaining, gapClosedShare, clientsNeeded, leadsNeeded };
}
