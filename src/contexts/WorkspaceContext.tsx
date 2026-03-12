import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "admin" | "workspace";

interface ClientBranding {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  company_name: string;
  welcome_message: string;
}

const defaultBranding: ClientBranding = {
  logo_url: "",
  primary_color: "#3B82F6",
  secondary_color: "#06B6D4",
  company_name: "",
  welcome_message: "Welcome to your business dashboard",
};

interface WorkspaceContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  activeClientName: string | null;
  isAdmin: boolean;
  user: any;
  branding: ClientBranding;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  viewMode: "workspace",
  setViewMode: () => {},
  activeClientId: null,
  setActiveClientId: () => {},
  activeClientName: null,
  isAdmin: false,
  user: null,
  branding: defaultBranding,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [branding, setBranding] = useState<ClientBranding>(defaultBranding);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch client name + branding when activeClientId changes
  useEffect(() => {
    if (!activeClientId) {
      setActiveClientName(null);
      setBranding(defaultBranding);
      return;
    }

    // Fetch client name
    supabase
      .from("clients")
      .select("business_name")
      .eq("id", activeClientId)
      .single()
      .then(({ data }) => {
        setActiveClientName(data?.business_name ?? null);
      });

    // Fetch branding
    supabase
      .from("client_branding")
      .select("*")
      .eq("client_id", activeClientId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBranding({
            logo_url: data.logo_url || "",
            primary_color: data.primary_color || "#3B82F6",
            secondary_color: data.secondary_color || "#06B6D4",
            company_name: data.company_name || "",
            welcome_message: data.welcome_message || "Welcome to your business dashboard",
          });
        } else {
          setBranding(defaultBranding);
        }
      });
  }, [activeClientId]);

  return (
    <WorkspaceContext.Provider value={{
      viewMode, setViewMode,
      activeClientId, setActiveClientId,
      activeClientName,
      isAdmin, user, branding,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
