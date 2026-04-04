import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "admin" | "workspace";

interface ClientBranding {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  company_name: string;
  welcome_message: string;
  app_icon_url: string;
  splash_logo_url: string;
  app_display_name: string;
}

const defaultBranding: ClientBranding = {
  logo_url: "",
  primary_color: "#3B82F6",
  secondary_color: "#06B6D4",
  company_name: "",
  welcome_message: "Welcome to your business dashboard",
  app_icon_url: "",
  splash_logo_url: "",
  app_display_name: "",
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
  userRole: string | null;
  isSessionLoading: boolean;
  signOut: () => Promise<void>;
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
  userRole: null,
  signOut: async () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [branding, setBranding] = useState<ClientBranding>(defaultBranding);
  const [userRole, setUserRole] = useState<string | null>(null);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setUserRole(null);
    setActiveClientId(null);
  };

  // Fetch user role from user_roles table — supports multi-workspace users
  const fetchUserRole = async (userId: string) => {
    // Fetch ALL roles for this user (multi-workspace support)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", userId);

    if (roles && roles.length > 0) {
      const adminRoles = ["admin", "operator"];
      const hasAdmin = roles.some(r => adminRoles.includes(r.role));

      if (hasAdmin) {
        const adminRole = roles.find(r => adminRoles.includes(r.role));
        setUserRole(adminRole?.role || "admin");
        setIsAdmin(true);
      } else {
        // Client user — pick the first role
        setUserRole(roles[0].role);
        setIsAdmin(false);
        // Only auto-set client if none is already set (e.g. from /w/:slug)
        if (!activeClientId && roles[0].client_id) {
          setActiveClientId(roles[0].client_id);
          setViewMode("workspace");
        }
      }
    } else {
      // No role found — keep as non-admin, wait for role assignment
      setUserRole("client_team");
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // Defer role fetch to avoid Supabase auth deadlock
        setTimeout(() => fetchUserRole(u.id), 0);
      } else {
        setIsAdmin(false);
        setUserRole(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => fetchUserRole(u.id), 0);
      }
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

    supabase
      .from("clients")
      .select("business_name")
      .eq("id", activeClientId)
      .single()
      .then(({ data }) => {
        setActiveClientName(data?.business_name ?? null);
      });

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
            app_icon_url: (data as any).app_icon_url || "",
            splash_logo_url: (data as any).splash_logo_url || "",
            app_display_name: (data as any).app_display_name || "",
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
      isAdmin, user, branding, userRole, signOut,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
