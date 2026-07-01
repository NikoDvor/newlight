import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmployeeRoute } from "@/lib/employeeRouting";
import newlightLogo from "@/assets/newlight-logo.jpg";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const userId = data.user?.id;
    let dest = searchParams.get("redirect") || "/dashboard";

    if (userId) {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("employee_profiles").select("job_title").eq("user_id", userId).maybeSingle(),
      ]);

      const roleList = (roles ?? []).map((r) => r.role);
      const adminRoles = ["admin", "operator"];
      const employeeRoles = ["marketing_staff", "support_staff"];

      if (!searchParams.get("redirect")) {
        if (roleList.some((r) => adminRoles.includes(r))) {
          dest = "/admin/dashboard";
        } else {
          const empRole = roleList.find((r) => employeeRoles.includes(r));
          if (empRole) {
            dest = getEmployeeRoute(empRole, profile?.job_title) || "/dashboard";
          }
        }
      }
    }

    setLoading(false);
    navigate(dest, { replace: true });
  };

  const inputStyle: React.CSSProperties = {
    background: "hsla(0,0%,100%,.04)",
    border: "1px solid hsla(211,96%,60%,.15)",
    color: "#FFFFFF",
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white flex items-center justify-center px-6 py-10">
      {/* Cinematic background stack */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 nl-hero-bg" />
        <div className="absolute inset-0 nl-hero-grid" />
        <div className="absolute inset-0 nl-hero-orb nl-hero-orb--a" />
        <div className="absolute inset-0 nl-hero-orb nl-hero-orb--b" />
        <div className="absolute inset-0 nl-hero-shimmer" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex flex-col items-center mb-8">
          <img
            src={newlightLogo}
            alt="NewLight"
            className="h-14 w-auto object-contain mb-5"
            style={{ filter: "drop-shadow(0 0 24px hsla(211,96%,56%,.55))" }}
          />
          <div className="nl-hero-badge">COMMAND CENTER ACCESS</div>
        </div>

        <div className="card-glass rounded-2xl p-8">
          <h1
            className="text-2xl font-extrabold text-white mb-1"
            style={{ letterSpacing: "-0.02em" }}
          >
            Sign In
          </h1>
          <p className="text-sm text-white/40 mb-6">
            Enter your credentials to access your workspace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold tracking-wider uppercase text-white/45 mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full h-11 px-3 rounded-md text-sm outline-none transition-colors placeholder:text-white/30 focus:border-[hsl(211,96%,60%)]"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold tracking-wider uppercase text-white/45 mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 rounded-md text-sm outline-none transition-colors placeholder:text-white/30 focus:border-[hsl(211,96%,60%)]"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full h-11 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>

            {error && (
              <p className="text-xs text-red-400/80 text-center mt-2">{error}</p>
            )}
          </form>

          <p className="text-xs text-white/40 text-center mt-6">
            Don't have access?{" "}
            <Link
              to="/get-started"
              className="font-semibold"
              style={{ color: "hsl(211,96%,60%)" }}
            >
              Book a demo →
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
