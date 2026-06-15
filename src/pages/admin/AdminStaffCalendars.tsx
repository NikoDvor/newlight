import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Eye } from "lucide-react";

interface ClientOption {
  id: string;
  business_name: string;
}

export default function AdminStaffCalendars() {
  const [staffCalendars, setStaffCalendars] = useState<any[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [calRes, clientRes] = await Promise.all([
        supabase
          .from("calendars")
          .select("*, workers(id, full_name, role_title, department, status, client_id)")
          .eq("calendar_type", "staff")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("id, business_name")
          .order("business_name"),
      ]);
      setStaffCalendars(calRes.data || []);
      setClients(clientRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Staff Calendars</h1>
        <p className="text-sm text-white/50 mt-1">
          All employee personal calendars across every client workspace
        </p>
      </div>

      {loading ? (
        <div className="text-white/50 text-sm">Loading calendars...</div>
      ) : staffCalendars.length === 0 ? (
        <Card className="p-8 text-center bg-white/[0.03] border-white/[0.06]">
          <Calendar className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <h3 className="text-white font-medium">No staff calendars yet</h3>
          <p className="text-white/40 text-sm mt-1">
            Staff calendars are created automatically when workers are added in Workforce.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white/[0.03] border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Employee", "Role", "Department", "Client Workspace", "Calendar", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffCalendars.map((cal: any) => {
                  const worker = (cal.workers as any) || {};
                  const clientName = clients.find((c) => c.id === worker.client_id)?.business_name || "—";
                  return (
                    <motion.tr
                      key={cal.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/60 text-xs font-medium">
                            {(worker.full_name || "?").substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">
                            {worker.full_name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/60">{worker.role_title || "—"}</td>
                      <td className="px-4 py-3 text-white/60">{worker.department || "—"}</td>
                      <td className="px-4 py-3 text-white/60">{clientName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-white/30" />
                          <span className="text-white/80">{cal.calendar_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          worker.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-white/5 text-white/40"
                        }`}>
                          {worker.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.location.assign(`/calendar-management/${cal.id}`)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button
                            onClick={() => window.location.assign(`/book/${cal.id}`)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-[hsla(211,96%,60%,.12)] text-[hsl(var(--nl-sky))] hover:bg-[hsla(211,96%,60%,.2)] transition-colors flex items-center gap-1"
                          >
                            <Calendar className="h-3 w-3" /> Book
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
