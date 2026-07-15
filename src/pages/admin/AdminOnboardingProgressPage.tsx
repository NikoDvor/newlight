import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";
import { MOCK_CLIENTS, ONBOARDING_STAGES } from "@/lib/clientHealthMock";

export default function AdminOnboardingProgress() {
  const avgStage = MOCK_CLIENTS.reduce((s, c) => s + c.onboardingStage, 0) / MOCK_CLIENTS.length;
  const complete = MOCK_CLIENTS.filter(c => c.onboardingStage >= 7).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Onboarding Progress</h1>
        <p className="text-sm text-white/50 mt-1">Where each client sits in the setup flow.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Average Stage</p>
          <p className="text-2xl font-bold text-white mt-1">{avgStage.toFixed(1)} / 7</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Fully Live</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{complete}</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">In Setup</p>
          <p className="text-2xl font-bold text-[hsl(211,96%,68%)] mt-1">{MOCK_CLIENTS.length - complete}</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {MOCK_CLIENTS.map(c => {
          const pct = Math.round((c.onboardingStage / 7) * 100);
          return (
            <Card key={c.id} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-[11px] text-white/40">{c.industry}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50">{ONBOARDING_STAGES[c.onboardingStage]}</p>
                    <p className="text-sm font-bold text-[hsl(211,96%,68%)]">{pct}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {ONBOARDING_STAGES.map((s, i) => {
                    const done = i <= c.onboardingStage;
                    return (
                      <div key={s} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-1 rounded-full ${done ? "bg-[hsl(211,96%,62%)]" : "bg-white/10"}`} />
                        <div className="flex items-center gap-1">
                          {done ? <Check className="h-2.5 w-2.5 text-[hsl(211,96%,68%)]" /> : <Circle className="h-2 w-2 text-white/20" />}
                          <span className={`text-[9px] ${done ? "text-white/70" : "text-white/30"} hidden md:inline`}>{s}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
