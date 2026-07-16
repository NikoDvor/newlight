import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { runCommissionBillingForClient } from '../run-commission-billing/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

function defaultPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
          if ((roles ?? []).some((r: any) => r.role === 'admin')) allowed = true;
        }
      }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const period = body.period_start && body.period_end
      ? { period_start: body.period_start, period_end: body.period_end }
      : defaultPeriod();

    // All active clients with at least one completed close-prep deal
    const { data: deals } = await supabase
      .from('crm_deals')
      .select('client_id')
      .not('close_prep_completed_at', 'is', null);
    const clientIds = Array.from(new Set((deals ?? []).map((d: any) => d.client_id).filter(Boolean))) as string[];

    const results: any[] = [];
    for (const client_id of clientIds) {
      try {
        const r = await runCommissionBillingForClient(supabase, client_id, period.period_start, period.period_end);
        results.push(r);
      } catch (err) {
        results.push({ client_id, error: (err as Error).message });
      }
    }

    const summary = {
      period,
      total_clients: clientIds.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => r.failed).length,
      skipped: results.filter((r) => r.skipped).length,
    };
    console.log('monthly billing cycle summary:', summary);

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('run-monthly-billing-cycle error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
