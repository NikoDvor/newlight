import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
// Publishable key optional — the frontend usually holds its own. Returned only if configured.
const STRIPE_PUBLISHABLE_KEY = Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? null;

async function stripeFetch(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
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

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
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

    const { client_id } = await req.json();
    if (!client_id || typeof client_id !== 'string') {
      return new Response(JSON.stringify({ error: 'client_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization: caller must have access to this client
    const { data: canAccess } = await supabase.rpc('user_can_access_client', {
      _user_id: user.id, _client_id: client_id,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find or create billing_account for this client
    let { data: billing } = await supabase
      .from('billing_accounts')
      .select('id, stripe_customer_id, billing_email')
      .eq('client_id', client_id)
      .maybeSingle();

    if (!billing) {
      const { data: client } = await supabase
        .from('clients').select('name, owner_email').eq('id', client_id).maybeSingle();
      const { data: created, error: cErr } = await supabase
        .from('billing_accounts')
        .insert({
          client_id,
          billing_status: 'active',
          billing_email: client?.owner_email ?? user.email ?? null,
        })
        .select('id, stripe_customer_id, billing_email')
        .single();
      if (cErr) throw cErr;
      billing = created;
    }

    // Create Stripe Customer if needed
    let customerId = billing.stripe_customer_id;
    if (!customerId) {
      const { data: client } = await supabase
        .from('clients').select('name, owner_email').eq('id', client_id).maybeSingle();
      const customer = await stripeFetch('customers', {
        email: billing.billing_email || client?.owner_email || user.email || '',
        name: client?.name || '',
        'metadata[client_id]': client_id,
      });
      customerId = customer.id;
      await supabase
        .from('billing_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', billing.id);
    }

    // Create SetupIntent
    const setupIntent = await stripeFetch('setup_intents', {
      customer: customerId!,
      'payment_method_types[]': 'card',
      usage: 'off_session',
      'metadata[client_id]': client_id,
    });

    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id,
        customer_id: customerId,
        publishable_key: STRIPE_PUBLISHABLE_KEY,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('stripe-setup-card error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
