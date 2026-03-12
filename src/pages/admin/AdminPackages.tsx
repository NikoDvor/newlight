import { Card, CardContent } from "@/components/ui/card";
import { Package, Check } from "lucide-react";
import { motion } from "framer-motion";

const packages = [
  {
    name: "Starter", price: "$497/mo",
    features: ["Website", "CRM", "Reviews", "Basic Reports"],
    locked: ["SEO", "Ads", "Social Media", "Automation", "Meeting Intelligence"]
  },
  {
    name: "Growth", price: "$997/mo",
    features: ["Website", "CRM", "Reviews", "SEO", "Social Media", "Reports", "Automation"],
    locked: ["Ads", "Meeting Intelligence"]
  },
  {
    name: "Premium", price: "$1,997/mo",
    features: ["Website", "CRM", "Reviews", "SEO", "Social Media", "Ads", "Reports", "Automation", "Meeting Intelligence"],
    locked: []
  },
  {
    name: "Enterprise", price: "Custom",
    features: ["All features", "Custom integrations", "Dedicated support", "White-label options"],
    locked: []
  },
];

export default function AdminPackages() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Package Access</h1>
        <p className="text-sm text-white/50 mt-1">Configure service packages and module access</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg, i) => (
          <motion.div key={pkg.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm h-full" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "hsla(211,96%,60%,.1)" }}>
                  <Package className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                </div>
                <p className="text-white font-bold text-lg">{pkg.name}</p>
                <p className="text-[hsl(var(--nl-sky))] font-semibold text-sm mt-1">{pkg.price}</p>
                <div className="mt-4 space-y-1.5">
                  {pkg.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-white/70">
                      <Check className="h-3 w-3 text-[hsl(var(--nl-sky))]" /> {f}
                    </div>
                  ))}
                  {pkg.locked.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-white/30 line-through">
                      {f}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
