import { motion } from "framer-motion";
import { Plus, Search, Building2, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Client {
  id: string;
  business_name: string;
  workspace_slug: string;
  industry: string | null;
  service_package: string | null;
  status: string;
  owner_name: string | null;
  owner_email: string | null;
  created_at: string;
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    business_name: "", workspace_slug: "", industry: "", primary_location: "",
    timezone: "America/Los_Angeles", service_package: "starter", owner_name: "", owner_email: ""
  });
  const { setViewMode, setActiveClientId } = useWorkspace();
  const navigate = useNavigate();

  const fetchClients = () => {
    supabase.from("clients").select("*").order("created_at", { ascending: false }).then(({ data }) => setClients(data ?? []));
  };

  useEffect(() => { fetchClients(); }, []);

  const handleCreate = async () => {
    if (!form.business_name || !form.workspace_slug) {
      toast.error("Business name and workspace slug are required");
      return;
    }
    const { data, error } = await supabase.from("clients").insert({
      business_name: form.business_name,
      workspace_slug: form.workspace_slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      industry: form.industry || null,
      primary_location: form.primary_location || null,
      timezone: form.timezone,
      service_package: form.service_package,
      owner_name: form.owner_name || null,
      owner_email: form.owner_email || null,
    }).select().single();

    if (error) {
      toast.error(error.message);
      return;
    }

    // Create provision queue entry
    if (data) {
      await supabase.from("provision_queue").insert({ client_id: data.id });
      // Create default integrations
      const integrations = ["Google Analytics", "Google Search Console", "Google Business Profile", "Meta / Instagram", "Twilio", "Stripe", "Zoom"];
      await supabase.from("client_integrations").insert(integrations.map(name => ({ client_id: data.id, integration_name: name })));
    }

    toast.success("Client workspace created!");
    setShowCreate(false);
    setForm({ business_name: "", workspace_slug: "", industry: "", primary_location: "", timezone: "America/Los_Angeles", service_package: "starter", owner_name: "", owner_email: "" });
    fetchClients();
  };

  const openWorkspace = (client: Client) => {
    setViewMode("workspace");
    setActiveClientId(client.id);
    navigate("/");
  };

  const filtered = clients.filter(c => c.business_name.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === "active") return "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]";
    if (s === "provisioning") return "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]";
    return "bg-white/5 text-white/40";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-white/50 mt-1">{clients.length} client workspaces</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              <Plus className="h-4 w-4 mr-1" /> Create Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
            <DialogHeader>
              <DialogTitle className="text-white">Create Client Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {[
                { label: "Business Name", key: "business_name", placeholder: "Acme Corp" },
                { label: "Workspace Slug", key: "workspace_slug", placeholder: "acme-corp" },
                { label: "Industry", key: "industry", placeholder: "e.g. Dental, Auto, Restaurant" },
                { label: "Primary Location", key: "primary_location", placeholder: "City, State" },
                { label: "Owner Name", key: "owner_name", placeholder: "John Smith" },
                { label: "Owner Email", key: "owner_email", placeholder: "john@example.com" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white/50 mb-1 block">{f.label}</label>
                  <Input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Service Package</label>
                <select
                  value={form.service_package}
                  onChange={e => setForm(prev => ({ ...prev, service_package: e.target.value }))}
                  className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <Button onClick={handleCreate} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white mt-2">
                Create Workspace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client Name", "Industry", "Package", "Status", "Owner", "Created"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                      <span className="text-white font-medium">{c.business_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.industry || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(211,96%,60%,.1)] text-[hsl(var(--nl-neon))] capitalize">{c.service_package}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${statusColor(c.status)}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.owner_name || "—"}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openWorkspace(c)} className="text-[hsl(var(--nl-sky))] hover:text-white transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-white/30">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
