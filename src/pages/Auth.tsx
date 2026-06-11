import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SessionGate } from "@/components/SessionGate";
import MarketingCanvas from "@/components/MarketingCanvas";

type AuthMode = "signin" | "signup" | "forgot";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [lit, setLit] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setLit(true), 60);
    return () => clearTimeout(t);
  }, []);

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
    }
    setLoading(false);
  };

  return (
    <SessionGate>
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          background: lit ? "#EDF6FF" : "#020814",
          transition: "background 1.5s ease",
        }}
      >
        <MarketingCanvas />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo area */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center mb-3 relative"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ease: [0.34, 1.4, 0.64, 1], duration: 0.5, delay: 0.5 }}
            >
              <img
                src={newlightLogo}
                alt="NewLight"
                className="h-16 sm:h-20 w-auto object-contain relative z-10"
                style={{ filter: "drop-shadow(0 0 20px hsla(211,96%,56%,.4))" }}
              />
            </motion.div>
            <motion.p
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: "rgba(0,26,61,0.6)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              {mode === "forgot" ? "Reset your password" : mode === "signup" ? "Create your account" : "Sign in to your account"}
            </motion.p>
          </div>

          {/* Card */}
          <motion.div
            className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid hsla(211,96%,60%,.15)",
              boxShadow:
                "0 24px 80px -16px hsla(211,96%,56%,.18), 0 4px 14px -4px rgba(0,26,61,0.08)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.4 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85, duration: 0.38 }}
              >
                <div>
                  <label
                    className="text-[11px] mb-1.5 block font-semibold tracking-wider uppercase"
                    style={{ color: "rgba(0,26,61,0.55)" }}
                  >
                    Email
                  </label>
                  <div className="relative group">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                      style={{ color: "rgba(0,26,61,0.35)" }}
                    />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="pl-9 h-11 transition-all"
                      style={{
                        background: "#F6FAFF",
                        border: "1px solid hsla(211,96%,60%,.3)",
                        color: "#001A3D",
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {mode !== "forgot" && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.98, duration: 0.38 }}
                >
                  <div>
                    <label
                      className="text-[11px] mb-1.5 block font-semibold tracking-wider uppercase"
                      style={{ color: "rgba(0,26,61,0.55)" }}
                    >
                      Password
                    </label>
                    <div className="relative group">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                        style={{ color: "rgba(0,26,61,0.35)" }}
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pl-9 pr-10 h-11 transition-all"
                        style={{
                          background: "#F6FAFF",
                          border: "1px solid hsla(211,96%,60%,.3)",
                          color: "#001A3D",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: "rgba(0,26,61,0.4)" }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 22, delay: 1.1 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-sm font-bold border-0 relative overflow-hidden group"
                  style={{
                    background: "#00B4FF",
                    color: "#FFFFFF",
                    boxShadow: "0 6px 24px -6px rgba(0,180,255,0.5)",
                  }}
                >
                  <span className="relative z-10">
                    {loading ? "Please wait..." : mode === "forgot" ? "Send Reset Link" : mode === "signup" ? "Create Account" : "Sign In"}
                  </span>
                </Button>
              </motion.div>
            </form>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mt-5 flex flex-col items-center gap-2 relative z-10">
                  {mode === "signin" && (
                    <>
                      <button
                        onClick={() => setMode("forgot")}
                        className="text-xs transition-colors"
                        style={{ color: "rgba(0,26,61,0.5)" }}
                      >
                        Forgot your password?
                      </button>
                      <button
                        onClick={() => setMode("signup")}
                        className="text-xs transition-colors"
                        style={{ color: "rgba(0,26,61,0.5)" }}
                      >
                        Don't have an account?{" "}
                        <span style={{ color: "#00B4FF", fontWeight: 600 }}>Sign Up</span>
                      </button>
                    </>
                  )}
                  {mode === "signup" && (
                    <button
                      onClick={() => setMode("signin")}
                      className="text-xs transition-colors inline-flex items-center gap-1"
                      style={{ color: "rgba(0,26,61,0.5)" }}
                    >
                      <ArrowLeft className="h-3 w-3" /> Back to Sign In
                    </button>
                  )}
                  {mode === "forgot" && (
                    <button
                      onClick={() => setMode("signin")}
                      className="text-xs transition-colors inline-flex items-center gap-1"
                      style={{ color: "rgba(0,26,61,0.5)" }}
                    >
                      <ArrowLeft className="h-3 w-3" /> Back to Sign In
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Bottom links */}
          <div className="text-center mt-6 space-y-3">
            <Link
              to="/get-started"
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "#00B4FF" }}
            >
              <Rocket className="h-3.5 w-3.5" /> New business? Get Started
            </Link>
          </div>
        </motion.div>
      </div>
    </SessionGate>
  );
}
