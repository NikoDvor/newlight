import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startSession, endSession, installSessionLifecycleHandlers } from "@/lib/sessionTracking";

type ViewMode = "admin" | "workspace" | "employee";

interface EmployeeProfile {
  full_name: string;
  email: string;
  department: string | null;
  job_title: string | null;
  employee_role: string;
}

interface ClientBranding {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  company_name: string;
  welcome_message: string;
  app_icon_url: string;
  pwa_icon_url: string;
  splash_logo_url: string;
  app_display_name: string;
  updated_at: string | null;
}

const defaultBranding: ClientBranding = {
  logo_url: "",
  primary_color: "#3B82F6",
  secondary_color: "#06B6D4",
  company_name: "",
  welcome_message: "Welcome to your business dashboard",
  app_icon_url: "",
  pwa_icon_url: "",
  splash_logo_url: "",
  app_display_name: "",
  updated_at: null,
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
  employeeProfile: EmployeeProfile | null;
  isSessionLoading: boolean;
  signOut: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType>({
  viewMode: "workspace",
  setViewMode: () => {},
  activeClientId: null,
  setActiveClientId: () => {},
  activeClientName: null,
  isAdmin: false,
  user: null,
  branding: defaultBranding,
  userRole: null,
  employeeProfile: null,
  isSessionLoading: true,
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
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const signOut = async () => {
    await endSession();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setUserRole(null);
    setEmployeeProfile(null);
    setActiveClientId(null);
  };

  // Detect auth/JWT failures (stale tokens — common in installed PWAs)
  const isAuthError = (err: any): boolean => {
    if (!err) return false;
    const status = (err as any).status ?? (err as any).statusCode;
    if (status === 401 || status === 403) return true;
    const blob = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
    return (
      blob.includes("bad_jwt") ||
      blob.includes("invalid claim") ||
      blob.includes("missing sub claim") ||
      blob.includes("jwt expired") ||
      blob.includes("invalid jwt") ||
      blob.includes("pgrst301")
    );
  };

  // Fetch user role from user_roles table — supports multi-workspace users
  // `attempt` guards against infinite retry loops: one refresh + retry max.
  const fetchUserRole = async (userId: string, attempt = 0): Promise<void> => {
    // Fetch ALL roles for this user (multi-workspace support)
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", userId);

    if (rolesError) {
      if (isAuthError(rolesError) && attempt === 0) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshed?.session?.user) {
          (window as any).__nl_token__ = refreshed.session.access_token;
          return fetchUserRole(refreshed.session.user.id, 1);
        }
        setSessionExpired(true);
        return;
      }
      if (isAuthError(rolesError)) {
        setSessionExpired(true);
        return;
      }
      // Non-auth failure (network/RLS): don't fake a role, surface nothing.
      console.error("[WorkspaceContext] user_roles query failed:", rolesError);
      return;
    }

    setSessionExpired(false);

    if (roles && roles.length > 0) {
      const adminRoles = ["admin", "operator"];
      const employeeRoles = ["marketing_staff", "support_staff"];
      const hasAdmin = roles.some(r => adminRoles.includes(r.role));
      const employeeRole = roles.find(r => employeeRoles.includes(r.role));

      if (hasAdmin) {
        const adminRole = roles.find(r => adminRoles.includes(r.role));
        setUserRole(adminRole?.role || "admin");
        setIsAdmin(true);
      } else if (employeeRole) {
        setUserRole(employeeRole.role);
        setIsAdmin(false);
        setViewMode("employee");
        setActiveClientId(null);
        const { data: profile, error: profileError } = await supabase
          .from("employee_profiles")
          .select("full_name, email, department, job_title, employee_role")
          .eq("user_id", userId)
          .maybeSingle();
        if (profileError) {
          if (isAuthError(profileError) && attempt === 0) {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshed?.session?.user) {
              (window as any).__nl_token__ = refreshed.session.access_token;
              return fetchUserRole(refreshed.session.user.id, 1);
            }
            setSessionExpired(true);
            return;
          }
          if (isAuthError(profileError)) {
            setSessionExpired(true);
            return;
          }
          console.error("[WorkspaceContext] employee_profiles query failed:", profileError);
          return;
        }
        setEmployeeProfile(profile ?? null);
      } else {
        // Client user — prefer a role row that carries an explicit client_id
        // (e.g. the client_owner row from provisioning) over the default
        // client_team row inserted by the signup trigger, which has null
        // client_id and would leave the workspace unresolved.
        const withClient = roles.find(r => !!r.client_id) || roles[0];
        setUserRole(withClient.role);
        setIsAdmin(false);
        // Only auto-set client if none is already set (e.g. from /w/:slug)
        if (!activeClientId && withClient.client_id) {
          setActiveClientId(withClient.client_id);
          setViewMode("workspace");
        }
      }
    } else {
      // Genuinely empty result (no error) — real "no workspace assigned" case.
      setUserRole("client_team");
      setIsAdmin(false);
    }
  };


  const initialCheckDone = useRef(false);

  useEffect(() => {
    installSessionLifecycleHandlers();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      (window as any).__nl_token__ = session?.access_token;
      if (u) {
        if (event === "SIGNED_IN") {
          // Defer to let role fetch determine client_id
          setTimeout(async () => {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("client_id")
              .eq("user_id", u.id)
              .limit(1);
            await startSession(u.id, roles?.[0]?.client_id ?? null);
          }, 100);
        }
        setTimeout(() => fetchUserRole(u.id).finally(() => setIsSessionLoading(false)), 0);
      } else {
        // Guard against the race where onAuthStateChange fires with a
        // momentarily-null session before getSession() has restored from
        // storage. Only close the loading gate on a no-user signal once the
        // authoritative initial getSession() check has completed.
        if (initialCheckDone.current) {
          setIsAdmin(false);
          setUserRole(null);
          setEmployeeProfile(null);
          setIsSessionLoading(false);
        }
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      (window as any).__nl_token__ = session?.access_token;
      if (u) {
        setTimeout(() => fetchUserRole(u.id).finally(() => {
          setIsSessionLoading(false);
          initialCheckDone.current = true;
        }), 0);
      } else {
        setIsSessionLoading(false);
        initialCheckDone.current = true;
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
            pwa_icon_url: (data as any).pwa_icon_url || "",
            splash_logo_url: (data as any).splash_logo_url || "",
            app_display_name: (data as any).app_display_name || "",
            updated_at: (data as any).updated_at ?? null,
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
      isAdmin, user, branding, userRole, employeeProfile, isSessionLoading, signOut,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
