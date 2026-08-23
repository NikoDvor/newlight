import { describe, it, expect } from "vitest";
import { computePipelineRevenue, toCanonStage } from "@/lib/pipelineRevenue";

const now = new Date("2026-08-23T00:00:00Z");
const d = (i: number, stage: string, value: number, days: number, user = "u1", lr: string | null = null, la: string | null = null) => ({
  id: "d" + i, client_id: "c", deal_name: "Deal " + i, deal_value: value,
  pipeline_stage: stage, status: "open", assigned_user: user,
  created_at: new Date(now.getTime() - days * 86400000).toISOString(),
  lost_reason: lr, lost_at: la,
});

describe("pipeline revenue", () => {
  it("maps legacy stages", () => {
    expect(toCanonStage("new_lead")).toBe("cold");
    expect(toCanonStage("appointment_booked")).toBe("warm");
    expect(toCanonStage("negotiation")).toBe("hot");
    expect(toCanonStage("closed_won")).toBe("won");
    expect(toCanonStage("closed_lost")).toBe("lost");
  });

  it("computes rates, weighted range, coverage, winbacks", () => {
    const deals: any[] = [];
    for (let i = 0; i < 40; i++) deals.push(d(i, "new_lead", 1000, 10));
    for (let i = 40; i < 60; i++) deals.push(d(i, "appointment_booked", 1000, 20));
    for (let i = 60; i < 70; i++) deals.push(d(i, "negotiation", 1000, 30));
    for (let i = 70; i < 75; i++) deals.push(d(i, "closed_won", 2000, 40));
    deals.push(d(99, "lost", 5000, 200, "u1", "price", new Date(now.getTime() - 90 * 86400000).toISOString()));

    const m = computePipelineRevenue({ deals, meetings: [
      { id: "m1", meeting_type: "first", attended: true, start_time: null, assigned_salesman_user_id: "u1" },
      { id: "m2", meeting_type: "first", attended: false, start_time: null, assigned_salesman_user_id: "u1" },
      { id: "m3", meeting_type: "second_meeting", attended: true, start_time: null, assigned_salesman_user_id: "u1" },
    ], revenueTarget: 50000, now });

    // cold->warm = 35/75 reached warm+ (20+10+5) out of 75 cold-reached
    expect(m.stageRates[0].sampleSize).toBe(75); // 200-day-old lost deal is outside the 90d window
    expect(m.stageRates.length).toBe(3);
    expect(m.wonValueAllTime).toBe(10000);
    expect(m.wonCountAllTime).toBe(5);
    expect(m.weighted.low).toBeLessThanOrEqual(m.weighted.point);
    expect(m.weighted.high).toBeGreaterThanOrEqual(m.weighted.point);
    expect(m.coverageRatio).toBeCloseTo(m.weighted.point / 50000);
    expect(m.showUp[0]).toMatchObject({ booked: 2, attended: 1, rate: 0.5 });
    expect(m.showUp[1]).toMatchObject({ booked: 1, attended: 1, rate: 1 });
    expect(m.winBacks.map(w => w.id)).toEqual(["d99"]);
    expect(m.trend.length).toBe(8);
    expect(m.benchmark).toBeNull();
  });

  it("hides benchmark for tiny peer groups", () => {
    const m = computePipelineRevenue({
      deals: [d(1, "new_lead", 100, 1)], meetings: [], revenueTarget: null,
      peerDeals: [{ client_id: "x", pipeline_stage: "closed_won" }], now,
    });
    expect(m.benchmark).toBeNull();
  });
});
