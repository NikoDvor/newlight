import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Building2, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ClientItem {
  id: string;
  business_name: string;
  workspace_slug: string;
  status: string;
}

export function WorkspaceSwitcher() {
  const { viewMode, setViewMode, activeClientId, setActiveClientId, activeClientName } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<ClientItem[]>([]);

  useEffect(() => {
    supabase.from("clients").select("id, business_name, workspace_slug, status").order("business_name").then(({ data }) => {
      setClients(data ?? []);
    });
  }, []);

  const isAdminView = location.pathname.startsWith("/admin");

  const handleAdminSwitch = () => {
    setViewMode("admin");
    setActiveClientId(null);
    navigate("/admin");
  };

  const handleClientSwitch = (client: ClientItem) => {
    setViewMode("workspace");
    setActiveClientId(client.id);
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:bg-white/10" style={{
          background: "hsla(211,96%,60%,.12)",
          border: "1px solid hsla(211,96%,60%,.15)"
        }}>
          {isAdminView ? (
            <>
              <Shield className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
              <span className="text-white/80 hidden sm:inline">Admin Portal</span>
            </>
          ) : (
            <>
              <Building2 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
              <span className="text-white/80 hidden sm:inline truncate max-w-[120px]">{activeClientName || "Workspace"}</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 text-white/40" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" style={{
        background: "hsl(218 35% 12%)",
        border: "1px solid hsla(211,96%,60%,.15)",
        color: "white"
      }}>
        <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-wider">Switch View</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleAdminSwitch}
          className={`gap-2 cursor-pointer text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white ${isAdminView ? "bg-[hsla(211,96%,60%,.12)]" : ""}`}
        >
          <Shield className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
          Admin Portal
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-wider">Client Workspaces</DropdownMenuLabel>
        {clients.length === 0 && (
          <DropdownMenuItem disabled className="text-white/30 text-xs">No clients yet</DropdownMenuItem>
        )}
        {clients.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => handleClientSwitch(c)}
            className={`gap-2 cursor-pointer text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white ${activeClientId === c.id && !isAdminView ? "bg-[hsla(211,96%,60%,.12)]" : ""}`}
          >
            <Building2 className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            <span className="truncate">{c.business_name}</span>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
              c.status === "active" ? "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]" : "bg-white/5 text-white/30"
            }`}>{c.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
