/**
 * Recommendation Persistence Engine
 * Persists recommendation engine results to the database,
 * creating signals, recommendations, projection models, and run records.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ServiceRecommendation, WorkspaceContext } from "./recommendationEngine";

export async function persistRecommendations(
  clientId: string,
  recs: ServiceRecommendation[],
  ctx: WorkspaceContext
) {
  if (recs.length === 0) return;

  const top = recs[0];

  // 1. Upsert recommended_services — delete stale, upsert current
  // First archive old recs not in this run
  const activeKeys = recs.map(r => r.key);
  await supabase
    .from("recommended_services")
    .update({ recommendation_status: "Archived" } as any)
    .eq("client_id", clientId)
    .eq("recommendation_status", "Active")
    .not("service_key", "in", `(${activeKeys.join(",")})`);

  // Upsert current recs — preserve non-Active statuses (Viewed, Approved, etc.)
  for (const rec of recs) {
    const { data: existing } = await supabase
      .from("recommended_services")
      .select("id, recommendation_status")
      .eq("client_id", clientId)
      .eq("service_key", rec.key)
      .maybeSingle();

    // Don't overwrite user-driven statuses
    const preserveStatuses = ["Viewed", "In Review", "Approved", "Implemented", "Dismissed"];
    if (existing && preserveStatuses.includes(existing.recommendation_status)) {
      // Just update projections
      await supabase
        .from("recommended_services")
        .update({
          priority_rank: rec.priorityRank,
          fit_score: rec.fitScore,
          projected_monthly_revenue_impact: rec.projectedMonthly,
          projected_annual_revenue_impact: rec.projectedAnnual,
          confidence_score: rec.confidence,
          urgency_level: rec.urgency,
          reason_summary: rec.reason,
        } as any)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("recommended_services")
        .upsert({
          ...(existing ? { id: existing.id } : {}),
          client_id: clientId,
          service_key: rec.key,
          service_name: rec.name,
          recommendation_status: "Active",
          priority_rank: rec.priorityRank,
          urgency_level: rec.urgency,
          fit_score: rec.fitScore,
          projected_monthly_revenue_impact: rec.projectedMonthly,
          projected_annual_revenue_impact: rec.projectedAnnual,
          confidence_score: rec.confidence,
          reason_summary: rec.reason,
        } as any, { onConflict: "id" });
    }
  }

  // 2. Persist signals
  const signals = buildSignals(clientId, ctx);
  // Delete old signals for this client, then insert fresh
  await supabase
    .from("service_recommendation_signals")
    .delete()
    .eq("client_id", clientId);

  if (signals.length > 0) {
    await supabase
      .from("service_recommendation_signals")
      .insert(signals as any);
  }

  // 3. Create recommendation run record
  await supabase
    .from("recommendation_runs")
    .insert({
      client_id: clientId,
      run_status: "Completed",
      top_service_key: top.key,
      top_projected_monthly_revenue_impact: top.projectedMonthly,
      run_summary: `Generated ${recs.length} recommendations. Top: ${top.name} ($${top.projectedMonthly}/mo).`,
    } as any);

  // 4. Upsert revenue projection model
  const totalMonthly = recs.reduce((s, r) => s + r.projectedMonthly, 0);
  await supabase
    .from("revenue_projection_models")
    .upsert({
      client_id: clientId,
      model_type: "Full Growth Model",
      baseline_payload_json: {
        contacts: ctx.contactCount,
        bookings: ctx.bookingCount,
        reviews: ctx.reviewCount,
        avgRating: ctx.avgRating,
        pipelineValue: ctx.pipelineValue,
        wonValue: ctx.wonValue,
      },
      market_assumptions_json: {
        avgBookingValue: 150,
        seoTrafficLift: 0.35,
        adsCloseRate: 0.12,
        reviewConversionLift: 0.08,
        crmRecoveryRate: 0.10,
      },
      projected_payload_json: {
        totalMonthly,
        totalAnnual: totalMonthly * 12,
        topService: top.key,
        topServiceMonthly: top.projectedMonthly,
        recCount: recs.length,
      },
    } as any, { onConflict: "client_id,model_type", ignoreDuplicates: false });
}

function buildSignals(clientId: string, ctx: WorkspaceContext) {
  const signals: any[] = [];
  const add = (type: string, key: string, value: number, weight: number) => {
    signals.push({ client_id: clientId, signal_type: type, signal_key: key, signal_value: value, signal_weight: weight });
  };

  add("CRM", "contact_count", ctx.contactCount, 2);
  add("CRM", "open_deals", ctx.openDeals, 2);
  add("CRM", "pipeline_value", ctx.pipelineValue, 3);
  add("CRM", "won_value", ctx.wonValue, 3);
  add("Calendar", "upcoming_events", ctx.upcomingEvents, 2);
  add("Calendar", "completed_events", ctx.completedEvents, 2);
  add("Booking", "booking_count", ctx.bookingCount, 3);
  add("Booking", "noshow_count", ctx.noShowCount, 2);
  add("Booking", "cancelled_count", ctx.cancelledCount, 1);
  add("Reviews", "review_count", ctx.reviewCount, 3);
  add("Reviews", "avg_rating", ctx.avgRating, 3);
  add("Integrations", "connected_count", ctx.integrationsConnected, 1);
  add("Team", "team_size", ctx.teamSize, 1);
  add("SEO", "seo_active", ctx.hasSEO ? 1 : 0, 2);
  add("Ads", "ads_active", ctx.hasAds ? 1 : 0, 2);
  add("Social", "social_active", ctx.hasSocial ? 1 : 0, 1);
  add("Website", "website_active", ctx.hasWebsite ? 1 : 0, 2);

  return signals;
}

/** Update a recommendation's lifecycle status */
export async function updateRecommendationStatus(
  recId: string,
  status: string
) {
  return supabase
    .from("recommended_services")
    .update({ recommendation_status: status } as any)
    .eq("id", recId);
}
