// ── Lock Context Hook ──
// Builds a LockContext from workspace state for use with FeatureLockGate.

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LockContext } from "@/lib/lockStateEngine";

export function useLockContext(clientId: string | null): LockContext {
  const [ctx, setCtx] = useState<LockContext>({});

  useEffect(() => {
    if (!clientId) return;

    const load = async () => {
      const [calRes, intgRes, brandRes, teamRes, formRes, contactsRes, clientRes] = await Promise.all([
        supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("client_integrations").select("integration_type, status").eq("client_id", clientId),
        supabase.from("client_branding").select("logo_url, primary_color").eq("client_id", clientId).maybeSingle(),
        supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("clients").select("onboarding_stage, payment_status").eq("id", clientId).single(),
      ]);

      const integrations = intgRes.data || [];
      const connected = (type: string) => integrations.some((i: any) => i.integration_type === type && i.status === "connected");

      setCtx({
        hasCalendar: (calRes.count ?? 0) > 0,
        hasTwilio: connected("twilio"),
        hasReviewPlatform: connected("google_reviews") || connected("yelp") || connected("review_platform"),
        hasStripe: connected("stripe"),
        hasGoogleIntegration: connected("google"),
        hasBranding: !!(brandRes.data?.logo_url && brandRes.data?.primary_color),
        hasTeam: (teamRes.count ?? 0) > 1,
        hasForms: (formRes.count ?? 0) > 0,
        hasContacts: (contactsRes.count ?? 0) > 0,
        paymentStatus: (clientRes.data as any)?.payment_status || "unpaid",
        onboardingStage: (clientRes.data as any)?.onboarding_stage || "setup",
      });
    };

    load();
  }, [clientId]);

  return ctx;
}
