import { motion } from "framer-motion";
import { Brain, ArrowUpRight, AlertTriangle, DollarSign, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function GrowthAdvisorCard() {
  return (
    <motion.div
      className="card-widget relative overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(135deg, hsla(211,96%,56%,.05) 0%, hsla(197,92%,68%,.03) 100%)"
      }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{
              background: "hsla(211,96%,56%,.1)",
              boxShadow: "0 0 16px -4px hsla(211,96%,56%,.2)"
            }}>
              <Brain className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <h3 className="section-title !mb-0">AI Growth Advisor</h3>
          </div>
          <Link to="/growth-advisor" className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "hsl(211 96% 56%)" }}>
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 py-1.5">
            <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(215,75%,48%,.1)" }}>
              <AlertTriangle className="h-3 w-3" style={{ color: "hsl(215 75% 42%)" }} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Top Recommendation</p>
              <p className="text-[10px] text-muted-foreground">Invest more in Google Ads — highest ROI channel</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 py-1.5">
            <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(197,92%,48%,.1)" }}>
              <DollarSign className="h-3 w-3" style={{ color: "hsl(197 92% 48%)" }} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Revenue Impact</p>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>$42,600/mo missed opportunity</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 py-1.5">
            <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.1)" }}>
              <Zap className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Next Best Action</p>
              <p className="text-[10px] text-muted-foreground">Launch retargeting ads · Est. $5,100/mo</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
