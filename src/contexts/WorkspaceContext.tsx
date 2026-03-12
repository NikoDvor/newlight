import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "admin" | "workspace";

interface WorkspaceContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  activeClientName: string | null;
  isAdmin: boolean;
  user: any;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  viewMode: "workspace",
  setViewMode: () => {},
  activeClientId: null,
  setActiveClientId: () => {},
  activeClientName: null,
  isAdmin: false,
  user: null,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true); // Default true for demo
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch client name when activeClientId changes
  useEffect(() => {
    if (!activeClientId) {
      setActiveClientName(null);
      return;
    }
    supabase
      .from("clients")
      .select("business_name")
      .eq("id", activeClientId)
      .single()
      .then(({ data }) => {
        setActiveClientName(data?.business_name ?? null);
      });
  }, [activeClientId]);

  return (
    <WorkspaceContext.Provider value={{
      viewMode, setViewMode,
      activeClientId, setActiveClientId,
      activeClientName,
      isAdmin, user,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
