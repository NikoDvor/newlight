import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getEmployeeRoute } from "@/lib/employeeRouting";
import newlightLogo from "@/assets/newlight-logo.jpg";

/**
 * Wraps public pages (Landing, Auth). While the session is loading it shows
 * a branded splash. Once loaded, if the user is already authenticated it
 * redirects them to their dashboard — otherwise it renders children.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, userRole, employeeProfile, isSessionLoading } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSessionLoading) return;
    if (user && userRole) {
      const employeeRoute = getEmployeeRoute(userRole, employeeProfile?.job_title);
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else if (employeeRoute) {
        navigate(employeeRoute, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isSessionLoading, user, userRole, employeeProfile?.job_title, isAdmin, navigate]);

  if (isSessionLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(222 38% 5%) 0%, hsl(220 42% 8%) 30%, hsl(218 45% 6%) 60%, hsl(222 38% 5%) 100%)",
        }}
      >
        {/* Neural grid */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsla(211,96%,60%,.2) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.2) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.03,
            maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)",
          }}
        />

        {/* Orb A */}
        <div
          className="fixed rounded-full pointer-events-none"
          style={{
            width: 500, height: 500,
            top: "10%", right: "-5%",
            background: "radial-gradient(circle, hsla(211,96%,60%,.12), transparent 70%)",
            filter: "blur(80px)",
            animation: "nl-orb-a 20s ease-in-out infinite",
          }}
        />

        {/* Orb B */}
        <div
          className="fixed rounded-full pointer-events-none"
          style={{
            width: 400, height: 400,
            bottom: "5%", left: "-3%",
            background: "radial-gradient(circle, hsla(197,88%,55%,.08), transparent 70%)",
            filter: "blur(70px)",
            animation: "nl-orb-b 24s ease-in-out infinite",
          }}
        />

        {/* Logo + pulse ring */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <img
              src={newlightLogo}
              alt="NewLight"
              className="h-16 w-auto object-contain"
              style={{ filter: "drop-shadow(0 0 30px hsla(211,96%,56%,.5))" }}
            />
            <div
              className="absolute -inset-6 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, hsla(211,96%,60%,.12), transparent 70%)",
                animation: "glow-pulse-anim 2.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Waveform bars */}
          <div className="flex items-center gap-[3px] mt-5 h-3">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  background: "hsla(211,96%,60%,.4)",
                  animation: `dash-wave 1.8s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          <p
            className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "hsla(211,96%,68%,.35)" }}
          >
            Initializing your system…
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated — the useEffect will redirect, render nothing meanwhile
  if (user && userRole) return null;

  return <>{children}</>;
}
