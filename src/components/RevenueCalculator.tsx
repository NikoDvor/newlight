import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Metric {
  label: string;
  key: string;
  placeholder: string;
  suffix?: string;
}

const metrics: Metric[] = [
  { label: "Monthly Website Traffic", key: "traffic", placeholder: "5000" },
  { label: "Current Conversion Rate", key: "convRate", placeholder: "2", suffix: "%" },
  { label: "Average Order Value", key: "aov", placeholder: "150", suffix: "$" },
  { label: "Appointment Value", key: "appointmentValue", placeholder: "200", suffix: "$" },
  { label: "Lead Close Rate", key: "closeRate", placeholder: "25", suffix: "%" },
  { label: "Review Trust Score", key: "reviewScore", placeholder: "4.2" },
  { label: "Ad Opportunity Gap", key: "adGap", placeholder: "30", suffix: "%" },
  { label: "Social Media Gap", key: "socialGap", placeholder: "20", suffix: "%" },
];

export function RevenueCalculator() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const traffic = parseFloat(values.traffic || "5000");
    const convRate = parseFloat(values.convRate || "2") / 100;
    const aov = parseFloat(values.aov || "150");
    const closeRate = parseFloat(values.closeRate || "25") / 100;
    const adGap = parseFloat(values.adGap || "30") / 100;
    const socialGap = parseFloat(values.socialGap || "20") / 100;

    // Optimized conversion (industry avg ~4%)
    const optConvRate = Math.min(convRate * 1.8, 0.06);
    const conversionGain = traffic * (optConvRate - convRate) * aov;
    const leadGain = traffic * convRate * closeRate * aov * 0.15;
    const adRevenue = traffic * convRate * aov * adGap;
    const socialRevenue = traffic * 0.1 * convRate * aov * socialGap;

    setResult(Math.round(conversionGain + leadGain + adRevenue + socialRevenue));
  };

  return (
    <motion.div className="card-widget"
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
          <Calculator className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Revenue Opportunity Calculator</p>
          <p className="text-xs text-muted-foreground">Estimate missed monthly revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {metrics.map(m => (
          <div key={m.key}>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{m.label}</label>
            <Input
              value={values[m.key] || ""}
              onChange={e => setValues(prev => ({ ...prev, [m.key]: e.target.value }))}
              placeholder={m.placeholder}
              className="h-8 text-xs bg-secondary/50 border-border"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={calculate} size="sm" className="btn-gradient h-9 px-6 rounded-xl text-xs font-semibold">
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Calculate Potential
        </Button>

        {result !== null && (
          <motion.div className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <DollarSign className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
            <div>
              <p className="text-xs text-muted-foreground">Estimated Monthly Gain</p>
              <p className="metric-value text-xl">${result.toLocaleString()}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
