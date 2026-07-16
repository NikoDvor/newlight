import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

// Thin dispatcher: authenticates the cron/admin caller then hands off to run-commission-billing
// (which does its own auth check and the full per-client billing logic).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

    // Delegate the full loop to run-commission-billing (called without client_id → loops all clients).
    const invokeRes = await fetch(`${SUPABASE_URL}/functions/v1/run-commission-billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET ?? '',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(period),
    });
    const invokeJson = await invokeRes.json();

    console.log('monthly billing cycle summary:', invokeJson?.summary);
    return new Response(JSON.stringify(invokeJson), {
      status: invokeRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('run-monthly-billing-cycle error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
