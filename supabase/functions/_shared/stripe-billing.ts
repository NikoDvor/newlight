// Shared Stripe helpers: get the client, find/create the customer, save the payment method.
// Used by stripe-webhook and pay-sign-context. Charging and schedules live in nlBilling.ts.

export async function getStripe(): Promise<any | null> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
  return new Stripe(key, { apiVersion: "2024-04-10" });
}

/**
 * Returns a Stripe customer id for the client, creating one if needed and
 * persisting it on clients.stripe_customer_id + billing_accounts.
 */
// deno-lint-ignore no-explicit-any
export async function ensureStripeCustomer(
  stripe: any,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  args: { clientId?: string | null; email?: string | null; name?: string | null; existingCustomerId?: string | null },
): Promise<string | null> {
  if (args.existingCustomerId) return args.existingCustomerId;

  let clientRow: any = null;
  if (args.clientId) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, owner_email, stripe_customer_id")
      .eq("id", args.clientId)
      .maybeSingle();
    clientRow = data;
    if (clientRow?.stripe_customer_id) return clientRow.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: args.email || clientRow?.owner_email || undefined,
    name: args.name || clientRow?.name || undefined,
    metadata: args.clientId ? { client_id: args.clientId } : {},
  });

  if (args.clientId) {
    await supabase.from("clients").update({ stripe_customer_id: customer.id }).eq("id", args.clientId);
    const { data: ba } = await supabase
      .from("billing_accounts").select("id").eq("client_id", args.clientId).maybeSingle();
    if (ba?.id) {
      await supabase.from("billing_accounts").update({ stripe_customer_id: customer.id }).eq("id", ba.id);
    }
  }
  return customer.id;
}

/**
 * Pulls the payment method used in a completed Checkout Session, attaches it to
 * the customer, makes it the default for off-session charges, and stores it.
 */
// deno-lint-ignore no-explicit-any
export async function savePaymentMethodFromSession(
  stripe: any,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  session: any,
  customerId: string,
  clientId?: string | null,
): Promise<string | null> {
  try {
    let paymentMethodId: string | null = null;
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (piId) {
      const pi = await stripe.paymentIntents.retrieve(piId);
      paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || null;
    }
    if (!paymentMethodId) return null;

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    if (clientId) {
      await supabase.from("clients").update({ stripe_payment_method_id: paymentMethodId }).eq("id", clientId);
      const { data: ba } = await supabase
        .from("billing_accounts").select("id").eq("client_id", clientId).maybeSingle();
      if (ba?.id) {
        await supabase.from("billing_accounts")
          .update({ stripe_customer_id: customerId, stripe_payment_method_id: paymentMethodId })
          .eq("id", ba.id);
      }
    }
    return paymentMethodId;
  } catch (e) {
    console.error("[stripe-billing] savePaymentMethodFromSession error", e);
    return null;
  }
}

/**
 * Computes the retainer subscription trial end: exactly 90 days from booking.
 */
function computeRetainerTrialEnd(bookedAt: Date): number {
  return Math.floor((bookedAt.getTime() + 90 * 24 * 3600 * 1000) / 1000);
}

/**
 * Given a trial_end timestamp, returns the 1st of the FOLLOWING calendar month
 * (in PST/UTC-8) at 10:00 AM PST (18:00 UTC) as the billing-cycle anchor.
 * This guarantees a real partial period between trial_end and the anchor.
 */
function computeBillingCycleAnchor(trialEndUnix: number): number {
  const trialEndDate = new Date(trialEndUnix * 1000);
  // Convert to PST by subtracting 8 hours.
  const pstMs = trialEndDate.getTime() - 8 * 3600 * 1000;
  const pstDate = new Date(pstMs);

  const pstYear = pstDate.getUTCFullYear();
  const pstMonth = pstDate.getUTCMonth();

  // Following month, always next month relative to trial_end's PST month.
  const anchorYear = pstYear + Math.floor((pstMonth + 1) / 12);
  const anchorMonth = (pstMonth + 1) % 12;

  const anchor = new Date(Date.UTC(anchorYear, anchorMonth, 1, 18, 0, 0));
  return Math.floor(anchor.getTime() / 1000);
}
