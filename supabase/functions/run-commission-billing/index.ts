import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const CRON_SECRET = Deno.env.get('CRON_SECRET');

async function stripeFetch(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${path} failed (${res.status})`);
  return json;
}

// Default = the previous calendar month (UTC).
function defaultPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

export async function runCommissionBillingForClient(
  supabase: ReturnType<typeof createClient>,
  client_id: string,
  period_start: string,
  period_end: string,
) {
  // Skip if a run for this client + exact period already exists (idempotent)
  const { data: existing } = await supabase
    .from('commission_billing_runs')
    .select('id, status')
    .eq('client_id', client_id)
    .eq('period_start', period_start)
    .eq('period_end', period_end)
    .in('status', ['succeeded', 'pending'])
    .maybeSingle();
  if (existing) {
    return { client_id, skipped: true, reason: 'already_run', run_id: existing.id };
  }

  // Most recent completed close-prep deal for this client (this row holds the pricing terms)
  const { data: deal } = await supabase
    .from('crm_deals')
    .select('id, pricing_model, commission_rate, recurring_fee, initial_fee, close_prep_completed_at')
    .eq('client_id', client_id)
    .not('close_prep_completed_at', 'is', null)
    .order('close_prep_completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!deal || !deal.pricing_model) {
    const { data: run } = await supabase.from('commission_billing_runs').insert({
      client_id, deal_id: null, period_start, period_end,
      pricing_model: 'retainer', amount_charged: 0,
      status: 'skipped', failure_reason: 'no completed close-prep deal',
    }).select('id').single();
    return { client_id, skipped: true, reason: 'no_deal', run_id: run?.id };
  }

  // Compute amount based on pricing model
  let revenue_base: number | null = null;
  let rate_applied: number | null = null;
  let amount_charged = 0;

  if (deal.pricing_model === 'retainer') {
    amount_charged = Number(deal.recurring_fee ?? 0);
  } else {
    // commission — sum closed-won crm_deals in the client's own workspace within the period
    const { data: wonDeals } = await supabase
      .from('crm_deals')
      .select('deal_value, updated_at')
      .eq('client_id', client_id)
      .eq('pipeline_stage', 'closed_won')
      .gte('updated_at', `${period_start}T00:00:00Z`)
      .lte('updated_at', `${period_end}T23:59:59Z`);
    revenue_base = (wonDeals ?? []).reduce((s, d: any) => s + (Number(d.deal_value) || 0), 0);
    rate_applied = Number(deal.commission_rate ?? 0);
    amount_charged = Math.round(revenue_base * (rate_applied / 100) * 100) / 100;
  }

  if (amount_charged <= 0) {
    const { data: run } = await supabase.from('commission_billing_runs').insert({
      client_id, deal_id: deal.id, period_start, period_end,
      pricing_model: deal.pricing_model, revenue_base, rate_applied,
      amount_charged: 0, status: 'skipped',
      failure_reason: 'nothing to charge this period',
    }).select('id').single();
    return { client_id, skipped: true, reason: 'zero_amount', run_id: run?.id };
  }

  // Card on file?
  const { data: billing } = await supabase
    .from('billing_accounts')
    .select('id, stripe_customer_id, stripe_payment_method_id, default_currency')
    .eq('client_id', client_id)
    .maybeSingle();

  if (!billing?.stripe_customer_id || !billing?.stripe_payment_method_id) {
    const { data: run } = await supabase.from('commission_billing_runs').insert({
      client_id, deal_id: deal.id, period_start, period_end,
      pricing_model: deal.pricing_model, revenue_base, rate_applied,
      amount_charged, status: 'failed', failure_reason: 'no card on file',
    }).select('id').single();
    return { client_id, failed: true, reason: 'no_card', run_id: run?.id };
  }

  if (!STRIPE_SECRET_KEY) {
    const { data: run } = await supabase.from('commission_billing_runs').insert({
      client_id, deal_id: deal.id, period_start, period_end,
      pricing_model: deal.pricing_model, revenue_base, rate_applied,
      amount_charged, status: 'failed', failure_reason: 'STRIPE_SECRET_KEY not configured',
    }).select('id').single();
    return { client_id, failed: true, reason: 'no_stripe_key', run_id: run?.id };
  }

  const currency = (billing.default_currency || 'usd').toLowerCase();

  try {
    const pi = await stripeFetch('payment_intents', {
      amount: String(Math.round(amount_charged * 100)),
      currency,
      customer: billing.stripe_customer_id,
      payment_method: billing.stripe_payment_method_id,
      off_session: 'true',
      confirm: 'true',
      description: `${deal.pricing_model === 'retainer' ? 'Monthly retainer' : 'Commission'} — ${period_start} to ${period_end}`,
      'metadata[client_id]': client_id,
      'metadata[deal_id]': deal.id,
      'metadata[period_start]': period_start,
      'metadata[period_end]': period_end,
    });

    const succeeded = pi.status === 'succeeded';
    const { data: run } = await supabase.from('commission_billing_runs').insert({
      client_id, deal_id: deal.id, period_start, period_end,
      pricing_model: deal.pricing_model, revenue_base, rate_applied,
      amount_charged,
      stripe_payment_intent_id: pi.id,
      status: succeeded ? 'succeeded' : 'failed',
      failure_reason: succeeded ? null : `Stripe status: ${pi.status}`,
    }).select('id').single();

    return { client_id, ok: succeeded, amount_charged, run_id: run?.id, payment_intent_id: pi.id };
  } catch (err) {
    const msg = (err as Error).message;
    const { data: run } = await supabase.from('commission_billing_runs').insert({
      client_id, deal_id: deal.id, period_start, period_end,
      pricing_model: deal.pricing_model, revenue_base, rate_applied,
      amount_charged, status: 'failed', failure_reason: msg,
    }).select('id').single();
    return { client_id, failed: true, reason: msg, run_id: run?.id };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: allow cron secret OR authenticated admin/operator
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    let allowed = false;

    if (CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) {
      allowed = true;
    } else {
      const jwt = authHeader.replace(/^Bearer\s+/i, '');
      if (jwt) {
        const { data: userData } = await supabase.auth.getUser(jwt);
        const user = userData?.user;
        if (user) {
          const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
          if ((roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'operator')) allowed = true;
        }
      }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { client_id } = body;
    const period = body.period_start && body.period_end
      ? { period_start: body.period_start, period_end: body.period_end }
      : defaultPeriod();

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await runCommissionBillingForClient(supabase, client_id, period.period_start, period.period_end);
    return new Response(JSON.stringify({ period, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('run-commission-billing error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
