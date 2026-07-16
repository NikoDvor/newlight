import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

async function stripeFetch(path: string, method: 'GET' | 'POST', params?: Record<string, string>) {
  const url = method === 'GET' && params
    ? `https://api.stripe.com/v1/${path}?${new URLSearchParams(params)}`
    : `https://api.stripe.com/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'POST' && params ? new URLSearchParams(params).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${path} failed (${res.status})`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured. Add it in Project Settings → Secrets.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData } = await supabase.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { client_id, payment_method_id } = await req.json();
    if (!client_id || !payment_method_id) {
      return new Response(JSON.stringify({ error: 'client_id and payment_method_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: canAccess } = await supabase.rpc('user_can_access_client', {
      _user_id: user.id, _client_id: client_id,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: billing } = await supabase
      .from('billing_accounts')
      .select('id, stripe_customer_id')
      .eq('client_id', client_id)
      .maybeSingle();
    if (!billing?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer for this client. Run stripe-setup-card first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Attach the payment method to the customer (idempotent — Stripe returns the same PM if already attached)
    try {
      await stripeFetch(`payment_methods/${payment_method_id}/attach`, 'POST', {
        customer: billing.stripe_customer_id,
      });
    } catch (err) {
      // If already attached to this same customer, Stripe returns an error — safe to ignore.
      const msg = (err as Error).message || '';
      if (!/already been attached/i.test(msg)) throw err;
    }

    // Retrieve the payment method to get card details
    const pm = await stripeFetch(`payment_methods/${payment_method_id}`, 'GET');
    const card = pm.card ?? {};

    // Set as default payment method for future invoices/off-session charges
    await stripeFetch(`customers/${billing.stripe_customer_id}`, 'POST', {
      'invoice_settings[default_payment_method]': payment_method_id,
    });

    await supabase.from('billing_accounts').update({
      stripe_payment_method_id: payment_method_id,
      card_last4: card.last4 ?? null,
      card_brand: card.brand ?? null,
      card_saved_at: new Date().toISOString(),
    }).eq('id', billing.id);

    return new Response(
      JSON.stringify({
        ok: true,
        card: { brand: card.brand, last4: card.last4, exp_month: card.exp_month, exp_year: card.exp_year },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('stripe-confirm-card error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
