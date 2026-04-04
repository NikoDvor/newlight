import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

/**
 * First-time client account activation page.
 * Reached via the invite email link (Supabase sends #type=invite hash).
 * The Supabase client auto-exchanges the hash token for a session,
 * so by the time this renders the user is authenticated but has no password.
 *
 * Flow:
 *  1. Wait for session to be established from the invite token
 *  2. Show "Set your password" form
 *  3. On submit → updateUser({ password })
 *  4. Look up their client_id from user_roles
 *  5. Route directly into their workspace dashboard
 */
export default function ActivateAccount() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const navigate = useNavigate();

  // Wait for Supabase to exchange the invite hash token for a session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSessionReady(true);
        setSessionChecked(true);
      }
    });

    // Also check immediately (token may already have been exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionReady(true);
      }
      setSessionChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // If we checked and there's no session, the link is invalid / expired
  useEffect(() => {
    if (sessionChecked && !sessionReady) {
      const t = setTimeout(() => {
        if (!sessionReady) {
          toast.error("Invalid or expired invite link. Please request a new one.");
          navigate("/auth", { replace: true });
        }
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [sessionChecked, sessionReady, navigate]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Fetch their workspace from user_roles
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/dashboard", { replace: true });
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);

    const adminRoles = ["admin", "operator"];
    const isAdmin = roles?.some(r => adminRoles.includes(r.role));

    if (isAdmin) {
      toast.success("Account activated! Welcome.");
      navigate("/admin", { replace: true });
    } else {
      toast.success("Account activated! Welcome to your workspace.");
      navigate("/dashboard", { replace: true });
    }
    setLoading(false);
  };

  // Loading state while waiting for invite token exchange
  if (!sessionReady) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, hsl(218 35% 6%) 0%, hsl(220 42% 12%) 40%, hsl(215 50% 10%) 70%, hsl(218 35% 6%) 100%)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-14 w-auto object-contain animate-pulse mb-4"
          style={{ filter: "drop-shadow(0 0 30px hsla(211,96%,56%,.4))" }}
        />
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying your invite…
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(218 35% 6%) 0%, hsl(220 42% 12%) 40%, hsl(215 50% 10%) 70%, hsl(218 35% 6%) 100%)",
      }}
    >
      {/* Ambient orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500, height: 500, top: "-150px", right: "-100px",
          background: "radial-gradient(circle, hsla(211,96%,62%,.18), transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center mb-3 relative"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src={newlightLogo}
              alt="NewLight"
              className="h-16 sm:h-20 w-auto object-contain relative z-10"
              style={{ filter: "drop-shadow(0 0 30px hsla(211,96%,56%,.4))" }}
            />
            <div className="absolute -inset-4 rounded-full" style={{
              background: "radial-gradient(circle, hsla(211,96%,60%,.12), transparent 70%)",
            }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="space-y-1"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest"
              style={{
                background: "hsla(140,60%,50%,.12)",
                color: "hsl(140,60%,60%)",
                border: "1px solid hsla(140,60%,50%,.2)",
              }}
            >
              <ShieldCheck className="h-3 w-3" />
              Account Activation
            </div>
            <p className="text-xs text-white/40 mt-2">Set a password to activate your account</p>
          </motion.div>
        </div>

        {/* Form card */}
        <motion.div
          className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{
            background: "hsla(215,35%,12%,.65)",
            backdropFilter: "blur(32px) saturate(1.6)",
            WebkitBackdropFilter: "blur(32px) saturate(1.6)",
            border: "1px solid hsla(211,96%,60%,.15)",
            boxShadow:
              "0 24px 80px -16px hsla(211,96%,56%,.25), 0 0 0 1px hsla(211,96%,60%,.08), inset 0 1px 0 0 hsla(211,96%,70%,.08)",
          }}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <form onSubmit={handleActivate} className="space-y-4 relative z-10">
            <div>
              <label className="text-[11px] text-white/45 mb-1.5 block font-semibold tracking-wider uppercase">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[hsl(211,96%,60%)] transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  required
                  minLength={6}
                  className="pl-9 pr-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-11 focus:border-[hsla(211,96%,60%,.4)] focus:ring-[hsla(211,96%,60%,.2)] focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/45 mb-1.5 block font-semibold tracking-wider uppercase">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[hsl(211,96%,60%)] transition-colors" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                  className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 h-11 focus:border-[hsla(211,96%,60%,.4)] focus:ring-[hsla(211,96%,60%,.2)] focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-bold text-white border-0 relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, hsl(217 90% 54%), hsl(211 96% 52%), hsl(197 90% 50%))",
                backgroundSize: "200% 200%",
                boxShadow: "0 6px 28px -6px hsla(211,96%,56%,.5), inset 0 1px 0 0 hsla(0,0%,100%,.15)",
              }}
            >
              <span className="relative z-10">
                {loading ? "Activating…" : "Activate My Account"}
              </span>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(115deg, transparent 30%, hsla(0,0%,100%,.12) 48%, transparent 70%)",
                  backgroundSize: "250% 100%",
                  animation: "nl-shimmer 3s ease-in-out infinite",
                }}
              />
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
