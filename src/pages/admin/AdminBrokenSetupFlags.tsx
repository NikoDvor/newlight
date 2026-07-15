import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning, Plug, Megaphone } from "lucide-react";
import { MOCK_CLIENTS } from "@/lib/clientHealthMock";

const iconFor = (s: string) => {
  if (s.toLowerCase().includes("sop")) return FileWarning;
  if (s.toLowerCase().includes("integration") || s.toLowerCase().includes("ads") || s.toLowerCase().includes("crm") || s.toLowerCase().includes("tracking") || s.toLowerCase().includes("gbp") || s.toLowerCase().includes("google")) return Plug;
  return Megaphone;
};

export default function AdminBrokenSetupFlags() {
  const flagged = MOCK_CLIENTS.filter(c => c.missingSetup.length > 0);
  const total = flagged.reduce((s, c) => s + c.missingSetup.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Broken Setup Flags</h1>
        <p className="text-sm text-white/50 mt-1">Missing SOPs, incomplete integrations, no active campaigns.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Clients Flagged</p>
          <p className="text-2xl font-bold text-white mt-1">{flagged.length}</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Total Issues</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{total}</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Clean Setups</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{MOCK_CLIENTS.length - flagged.length}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {flagged.map(c => (
          <Card key={c.id} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                {c.name}
                <span className="text-[10px] text-amber-400 font-semibold">{c.missingSetup.length} issue{c.missingSetup.length > 1 ? "s" : ""}</span>
              </CardTitle>
              <p className="text-[10px] text-white/40 uppercase">{c.industry}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {c.missingSetup.map(m => {
                const I = iconFor(m);
                return (
                  <div key={m} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.03] border border-white/[0.05]">
                    <I className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-white/70">{m}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
