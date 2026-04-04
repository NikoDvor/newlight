import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Rocket, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type AuthMode = "signin" | "signup" | "forgot";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const navigate = useNavigate();
  const { user, isAdmin, userRole } = useWorkspace();

  useEffect(() => {
    if (user && userRole) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        navigate(redirect, { replace: true });
      } else if (isAdmin) {
        navigate("/admin", { replace: true });
      } else {
        (async () => {
          const { data: roles } = await supabase.from("user_roles").select("client_id").eq("user_id", user.id).not("client_id", "is", null).limit(1);
          const clientId = roles?.[0]?.client_id;
          if (clientId) {
            const { data: client } = await supabase.from("clients").select("payment_status, portal_access_enabled").eq("id", clientId).single();
            if (client?.payment_status === "paid" && client?.portal_access_enabled) {
              const { data: items } = await supabase.from("client_setup_items" as any).select("item_status, submitted_by_client").eq("client_id", clientId);
              const clientItems = ((items || []) as any[]).filter((i: any) => i.submitted_by_client);
              const doneCount = clientItems.filter((i: any) => ["received", "completed"].includes(i.item_status)).length;
              const pct = clientItems.length > 0 ? (doneCount / clientItems.length) * 100 : 100;
              if (pct < 80) {
                navigate("/setup-portal", { replace: true });
                return;
              }
            }
          }
          navigate("/dashboard", { replace: true });
        })();
        return;
      }
    }
  }, [user, isAdmin, userRole, navigate]);

  const getRedirectAwareNav = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset link sent to your email");
        setMode("signin");
      }
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email to verify your address before signing in.");
        setMode("signin");
        setEmail("");
        setPassword("");
      }
      setLoading(false);
      return;
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Invalid email or password");
    } else if (!signInData.user.email_confirmed_at) {
      await supabase.auth.signOut();
      toast.error("Please verify your email before signing in.");
    } else {
      toast.success("Welcome back!");
      const redirectPath = getRedirectAwareNav();
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id)
          .limit(1)
          .maybeSingle();
        if (roleData?.role === "admin") {
          navigate("/admin");
        } else if (roleData?.role === "operator") {
          navigate("/admin/clients");
        } else {
          navigate("/dashboard");
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(218 35% 6%) 0%, hsl(220 42% 12%) 40%, hsl(215 50% 10%) 70%, hsl(218 35% 6%) 100%)" }}
    >
      {/* Animated grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(hsla(211,96%,60%,.18) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.18) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)",
        opacity: 0.12,
        animation: "nl-grid-drift 50s linear infinite",
      }} />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, hsla(211,96%,60%,.4), transparent)",
          boxShadow: "0 0 20px 2px hsla(211,96%,60%,.15)",
        }}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{ duration: 8, ease: "linear", repeat: Infinity }}
      />

      {/* Orbs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600, height: 600, top: "-200px", right: "-150px",
          background: "radial-gradient(circle, hsla(211,96%,62%,.20), transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500, height: 500, bottom: "-150px", left: "-100px",
          background: "radial-gradient(circle, hsla(197,92%,68%,.14), transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ scale: [1, 1.1, 1], x: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 2 + Math.random() * 3, height: 2 + Math.random() * 3,
            background: "hsla(211,96%,70%,.5)",
            left: `${15 + Math.random() * 70}%`, top: `${15 + Math.random() * 70}%`,
            filter: "blur(1px)",
          }}
          animate={{ opacity: [0, 0.7, 0], y: [0, -40, -80] }}
          transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 4 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo area */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center mb-3 relative"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <img src={newlightLogo} alt="NewLight" className="h-16 sm:h-20 w-auto object-contain relative z-10"
              style={{ filter: "drop-shadow(0 0 30px hsla(211,96%,56%,.4))" }} />
            {/* Logo glow ring */}
            <div className="absolute -inset-4 rounded-full" style={{
              background: "radial-gradient(circle, hsla(211,96%,60%,.12), transparent 70%)",
            }} />
          </motion.div>
          <motion.p
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: "hsla(211,96%,70%,.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {mode === "forgot" ? "Reset your password" : mode === "signup" ? "Create your account" : "Sign in to your account"}
          </motion.p>
        </div>

        {/* Glass card */}
        <motion.div
          className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{
            background: "hsla(215,35%,12%,.65)",
            backdropFilter: "blur(32px) saturate(1.6)",
            WebkitBackdropFilter: "blur(32px) saturate(1.6)",
            border: "1px solid hsla(211,96%,60%,.15)",
            boxShadow: "0 24px 80px -16px hsla(211,96%,56%,.25), 0 0 0 1px hsla(211,96%,60%,.08), inset 0 1px 0 0 hsla(211,96%,70%,.08)",
          }}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {/* Card shimmer accent */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(115deg, transparent 30%, hsla(211,96%,60%,.04) 48%, hsla(197,92%,68%,.03) 52%, transparent 70%)",
            backgroundSize: "250% 100%",
            animation: "nl-shimmer 8s ease-in-out infinite",
          }} />

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="text-[11px] text-white/45 mb-1.5 block font-semibold tracking-wider uppercase">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[hsl(211,96%,60%)] transition-colors" />
                <Input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-11 focus:border-[hsla(211,96%,60%,.4)] focus:ring-[hsla(211,96%,60%,.2)] focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="text-[11px] text-white/45 mb-1.5 block font-semibold tracking-wider uppercase">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[hsl(211,96%,60%)] transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    className="pl-9 pr-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-11 focus:border-[hsla(211,96%,60%,.4)] focus:ring-[hsla(211,96%,60%,.2)] focus:bg-white/[0.06] transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full h-11 text-sm font-bold text-white border-0 relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, hsl(217 90% 54%), hsl(211 96% 52%), hsl(197 90% 50%))",
                backgroundSize: "200% 200%",
                boxShadow: "0 6px 28px -6px hsla(211,96%,56%,.5), inset 0 1px 0 0 hsla(0,0%,100%,.15)",
              }}
            >
              <span className="relative z-10">
                {loading ? "Please wait..." : mode === "forgot" ? "Send Reset Link" : mode === "signup" ? "Create Account" : "Sign In"}
              </span>
              {/* Button hover shimmer */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(115deg, transparent 30%, hsla(0,0%,100%,.12) 48%, transparent 70%)",
                  backgroundSize: "250% 100%",
                  animation: "nl-shimmer 3s ease-in-out infinite",
                }}
              />
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 relative z-10">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-xs text-white/35 hover:text-white/65 transition-colors">
                  Forgot your password?
                </button>
                <button onClick={() => setMode("signup")} className="text-xs text-white/35 hover:text-white/65 transition-colors">
                  Don't have an account? <span className="text-[hsl(211,96%,60%)] font-medium">Sign Up</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => setMode("signin")} className="text-xs text-white/35 hover:text-white/65 transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="text-xs text-white/35 hover:text-white/65 transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </button>
            )}
          </div>
        </motion.div>

        {/* Bottom links */}
        <div className="text-center mt-6 space-y-3">
          <Link to="/get-started"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(211,96%,56%)] hover:text-white transition-colors">
            <Rocket className="h-3.5 w-3.5" /> New business? Get Started
          </Link>
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="h-3 w-3" style={{ color: "hsla(211,96%,70%,.4)" }} />
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "hsla(0,0%,100%,.25)" }}>
              Powered by NewLight
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
