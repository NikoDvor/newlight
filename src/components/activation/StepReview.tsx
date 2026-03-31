import { CheckCircle2, AlertCircle, Clock, FileText, CreditCard, ScrollText, Receipt } from "lucide-react";
import { INTEGRATION_KEYS, type StepProps } from "./activationTypes";

const sectionCls = "rounded-xl p-4 space-y-2";
const sectionStyle = { background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" };

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-white/40 min-w-[130px] shrink-0">{label}</span>
      <span className="text-white/70">{value}</span>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={sectionCls} style={sectionStyle}>
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">{title}</p>
      {children}
    </div>
  );
}

function ReadinessItem({ label, status, icon: Icon }: { label: string; status: "ready" | "pending" | "missing"; icon: React.ElementType }) {
  const colors = {
    ready: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", iconCls: "text-emerald-400" },
    pending: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", iconCls: "text-amber-400" },
    missing: { bg: "bg-white/[0.03]", border: "border-white/10", text: "text-white/30", iconCls: "text-white/20" },
  };
  const c = colors[status];
  const statusLabel = status === "ready" ? "Ready" : status === "pending" ? "Pending" : "Not Created";

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${c.iconCls}`} />
        <span className={`text-xs font-medium ${c.text}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {status === "ready" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : status === "pending" ? <Clock className="h-3.5 w-3.5 text-amber-400" /> : <AlertCircle className="h-3.5 w-3.5 text-white/20" />}
        <span className={`text-[10px] font-medium ${c.text}`}>{statusLabel}</span>
      </div>
    </div>
  );
}

export function StepReview({ form }: StepProps) {
  const enabledIntegrations = INTEGRATION_KEYS.filter(k => form.integrations[k]?.used === "yes");
  const missingAccess = enabledIntegrations.filter(k => form.integrations[k]?.access_ready !== "yes");

  // ── Proposal/Billing/Contract Readiness ──
  const proposalStatus: "ready" | "pending" | "missing" =
    form.proposal_status === "accepted" ? "ready"
    : form.proposal_id ? "pending"
    : "missing";

  const contractStatus: "ready" | "pending" | "missing" =
    form.contract_record_id ? "pending" : "missing"; // pending = awaiting signature

  const billingStatus: "ready" | "pending" | "missing" =
    form.billing_account_id ? "pending" : "missing"; // pending = pending setup

  const invoiceStatus: "ready" | "pending" | "missing" =
    form.invoice_id ? "pending" : "missing";

  // Calculate setup progress
  let completed = 0;
  let total = 14;
  if (form.business_name_confirmed) completed++;
  if (form.owner_email) completed++;
  if (form.payment_confirmed === "confirmed") completed++;
  if (form.primary_color) completed++;
  if (form.crm_mode) completed++;
  if (form.use_native_calendar) completed++;
  if (form.use_native_email || form.email_provider) completed++;
  if (form.use_native_reviews) completed++;
  if (form.use_workforce !== "") completed++;
  if (form.use_finance !== "") completed++;
  if (form.use_seo || form.use_ads) completed++;
  if (form.use_proposals !== "") completed++;
  if (form.use_helpdesk !== "") completed++;
  if (enabledIntegrations.length > 0) completed++;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className={sectionCls} style={sectionStyle}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Setup Completion</p>
          <span className="text-sm font-bold text-[hsl(var(--nl-sky))]">{pct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(var(--nl-electric)), hsl(var(--nl-sky)))" }} />
        </div>
      </div>

      {/* Sales Readiness Indicators */}
      <SummarySection title="Sales & Billing Readiness">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ReadinessItem
            label={`Proposal ${form.proposal_status === "accepted" ? "(Accepted)" : form.proposal_status === "revised" ? "(Revised)" : form.proposal_id ? "(Generated)" : ""}`}
            status={proposalStatus}
            icon={FileText}
          />
          <ReadinessItem
            label="Service Agreement"
            status={contractStatus}
            icon={ScrollText}
          />
          <ReadinessItem
            label="Billing Account"
            status={billingStatus}
            icon={CreditCard}
          />
          <ReadinessItem
            label="Setup Invoice"
            status={invoiceStatus}
            icon={Receipt}
          />
        </div>
      </SummarySection>

      <SummarySection title="Deal + Activation">
        <SummaryRow label="Business Name" value={form.business_name_confirmed} />
        <SummaryRow label="Owner" value={`${form.owner_name} — ${form.owner_email}`} />
        <SummaryRow label="Package" value={form.service_package} />
        <SummaryRow label="Setup Fee" value={form.setup_fee ? `$${Number(form.setup_fee).toLocaleString()}` : ""} />
        <SummaryRow label="Monthly Fee" value={form.monthly_fee ? `$${Number(form.monthly_fee).toLocaleString()}/mo` : ""} />
        <SummaryRow label="Contract" value={form.contract_term} />
        <SummaryRow label="Payment Method" value={form.payment_method === "wire_transfer" ? "Wire Transfer" : form.payment_method === "ach" ? "ACH" : form.payment_method === "check" ? "Check" : form.payment_method} />
        <SummaryRow label="Payment Status" value={form.payment_confirmed === "confirmed" ? "✓ Confirmed" : form.payment_confirmed === "awaiting_confirmation" ? "⏳ Awaiting Wire Confirmation" : "⚠ Awaiting Payment — activation allowed"} />
        {form.wire_reference && <SummaryRow label="Wire Reference" value={form.wire_reference} />}
        {form.payment_receipt_url && (
          <div className="flex items-start gap-2 text-[11px]">
            <span className="text-white/40 min-w-[130px] shrink-0">Receipt</span>
            <a href={form.payment_receipt_url} target="_blank" rel="noreferrer" className="text-[hsl(var(--nl-sky))] underline">View uploaded receipt</a>
          </div>
        )}
        <SummaryRow label="Priority" value={form.activation_priority} />
      </SummarySection>

      <SummarySection title="Branding">
        <SummaryRow label="Display Name" value={form.display_name || form.company_name} />
        <SummaryRow label="Industry" value={form.industry} />
        <SummaryRow label="Primary Goal" value={form.primary_goal} />
        <div className="flex gap-2 mt-1">
          {[form.primary_color, form.secondary_color, form.accent_color].map((c, i) => (
            <div key={i} className="h-5 w-5 rounded" style={{ background: c }} />
          ))}
        </div>
      </SummarySection>

      <SummarySection title="CRM">
        <SummaryRow label="Mode" value={form.crm_mode === "native" ? "Native CRM" : `External — ${form.crm_provider}`} />
        <SummaryRow label="Sales Owner" value={form.default_sales_owner} />
      </SummarySection>

      <SummarySection title="Calendar">
        <SummaryRow label="Native Calendar" value={form.use_native_calendar} />
        <SummaryRow label="Calendars" value={String(form.calendar_configs?.length || form.num_calendars)} />
        <SummaryRow label="Timezone" value={form.default_timezone} />
        {form.use_native_calendar === "yes" && form.calendar_configs?.map((cfg, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] mt-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
            <span className="text-white/70">{cfg.calendar_name || `Calendar ${i + 1}`}</span>
            <span className="text-white/30 text-[10px]">({cfg.calendar_type})</span>
          </div>
        ))}
      </SummarySection>

      <SummarySection title="Email + Messaging">
        <SummaryRow label="Email Hub" value={form.use_native_email} />
        <SummaryRow label="Reminder Channel" value={form.preferred_reminder_channel} />
      </SummarySection>

      <SummarySection title="Reviews">
        <SummaryRow label="Native Reviews" value={form.use_native_reviews} />
        <SummaryRow label="Auto-Send" value={form.auto_send_after_appointment} />
        <SummaryRow label="Recovery" value={form.service_recovery_enabled} />
      </SummarySection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummarySection title="Workforce">
          <SummaryRow label="Enabled" value={form.use_workforce} />
          <SummaryRow label="Workers" value={form.num_workers} />
          <SummaryRow label="Payroll" value={form.need_payroll} />
        </SummarySection>
        <SummarySection title="Finance">
          <SummaryRow label="Enabled" value={form.use_finance} />
          <SummaryRow label="Payroll Freq" value={form.payroll_frequency} />
          <SummaryRow label="Accountant" value={form.accountant_name} />
        </SummarySection>
      </div>

      <SummarySection title="Marketing Systems">
        <div className="flex flex-wrap gap-2">
          {form.use_seo === "yes" && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]">SEO</span>}
          {form.use_website_workspace === "yes" && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]">Website</span>}
          {form.use_ads === "yes" && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]">Ads</span>}
          {form.use_social === "yes" && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]">Social</span>}
          {form.use_content_planner === "yes" && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[hsl(var(--nl-electric))]/20 text-[hsl(var(--nl-sky))]">Content</span>}
        </div>
      </SummarySection>

      <SummarySection title="Integrations">
        {enabledIntegrations.length === 0 && <p className="text-xs text-white/30 italic">No integrations enabled</p>}
        {enabledIntegrations.map(name => {
          const int = form.integrations[name];
          const ready = int?.access_ready === "yes";
          return (
            <div key={name} className="flex items-center gap-2 text-[11px]">
              {ready ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Clock className="h-3 w-3 text-yellow-400" />}
              <span className={ready ? "text-white/70" : "text-white/50"}>{name}</span>
              {!ready && <span className="text-[10px] text-yellow-400/70">— Access Needed</span>}
            </div>
          );
        })}
      </SummarySection>

      {missingAccess.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "hsla(40,90%,50%,.06)", border: "1px solid hsla(40,90%,50%,.12)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <p className="text-xs font-semibold text-yellow-400">Missing Access ({missingAccess.length})</p>
          </div>
          <ul className="space-y-1">
            {missingAccess.map(name => (
              <li key={name} className="text-[11px] text-yellow-300/60">• {name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
