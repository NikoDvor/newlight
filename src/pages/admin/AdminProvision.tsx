import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw, Mail, MoreVertical, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface QueueItem {
  id: string;
  client_id: string;
  provision_status: string;
  automation_setup: boolean | null;
  crm_setup: boolean | null;
  integrations_status: string | null;
  errors: string[] | null;
  created_at: string;
  clients: { business_name: string } | null;
}

const provisionStatuses = [
  { key: "provisioning", label: "Provisioning", color: "text-white/40", icon: Loader2, animate: true },
  { key: "setup_in_progress", label: "Setup in Progress", color: "text-[hsl(var(--nl-neon))]", icon: Clock },
  { key: "ready_for_kickoff", label: "Ready for Kickoff", color: "text-[hsl(var(--nl-sky))]", icon: CheckCircle2 },
  { key: "active", label: "Active", color: "text-[hsl(var(--nl-cyan))]", icon: CheckCircle2 },
  { key: "error", label: "Error", color: "text-red-400", icon: AlertCircle },
];

const provisionChecklist = [
  "Client record", "Workspace slug", "Owner user", "Enterprise access", "CRM pipeline",
  "Pipeline stages", "Default tasks", "Approvals system", "Reports shell", "AI Insights shell",
  "Bookings module", "Revenue module", "Integrations page", "Onboarding wizard",
  "Branding settings", "Automation templates", "Activity feed", "Health score", "Fix Now monitoring"
];

export default function AdminProvision() {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    supabase.from("provision_queue").select("*, clients(business_name)").order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));
  }, []);

  const getStatusMeta = (s: string) => provisionStatuses.find(ps => ps.key === s) || provisionStatuses[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Provision Queue</h1>
          <p className="text-sm text-white/50 mt-1">Automated workspace creation and setup tracking</p>
        </div>
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
          <RefreshCw className="h-4 w-4 mr-1" /> Retry All Failed
        </Button>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3">
        {provisionStatuses.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-1.5 text-[10px]">
              <Icon className={`h-3 w-3 ${s.color} ${s.animate ? "animate-spin" : ""}`} />
              <span className="text-white/40">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Provision checklist info */}
      <Card className="border-0 bg-white/[0.03] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.06)" }}>
        <CardContent className="p-4">
          <p className="text-xs text-white/50 mb-2 font-semibold">Automated Provisioning Checklist</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {provisionChecklist.map(item => (
              <div key={item} className="flex items-center gap-1.5 text-[10px] text-white/30">
                <CheckCircle2 className="h-3 w-3 text-[hsl(var(--nl-sky))]/50" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Queue table */}
      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client", "Status", "Automation", "CRM", "Integrations", "Errors", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const meta = getStatusMeta(item.provision_status);
                const StatusIcon = meta.icon;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{item.clients?.business_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-3.5 w-3.5 ${meta.color} ${meta.animate ? "animate-spin" : ""}`} />
                        <span className="text-white/60 text-xs">{meta.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.automation_setup ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" /> : <Clock className="h-3.5 w-3.5 text-white/30" />}
                    </td>
                    <td className="px-4 py-3">
                      {item.crm_setup ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" /> : <Clock className="h-3.5 w-3.5 text-white/30" />}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs capitalize">{item.integrations_status}</td>
                    <td className="px-4 py-3">
                      {item.errors && item.errors.length > 0 ? (
                        <span className="text-xs text-red-400">{item.errors.length} error(s)</span>
                      ) : (
                        <span className="text-xs text-white/30">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <MoreVertical className="h-3.5 w-3.5 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                          <DropdownMenuItem className="text-xs hover:bg-white/10">
                            <Eye className="h-3 w-3 mr-2" /> Open Workspace
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">
                            <RefreshCw className="h-3 w-3 mr-2" /> Retry Provisioning
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">
                            <Mail className="h-3 w-3 mr-2" /> Resend Invite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-white/30">No items in queue</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
