import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, userRole } = useWorkspace();

  useEffect(() => {
    if (user && userRole) {
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, isAdmin, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset link sent to your email");
        setForgotMode(false);
      }
      setLoading(false);
      return;
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signInData.user.id)
        .limit(1)
        .maybeSingle();
      if (roleData && ["admin", "operator"].includes(roleData.role)) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            top: "-150px",
            right: "-100px",
            background: "radial-gradient(circle, hsla(211,96%,62%,.12), transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            bottom: "-100px",
            left: "-80px",
            background: "radial-gradient(circle, hsla(197,92%,68%,.09), transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
                boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
              }}
            >
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">NewLight</span>
          </div>
          <p className="text-sm text-white/40">
            {forgotMode ? "Reset your password" : "Sign in to your account"}
          </p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: "hsla(218,35%,14%,.8)",
            backdropFilter: "blur(24px)",
            border: "1px solid hsla(211,96%,60%,.12)",
            boxShadow: "0 20px 60px -15px hsla(211,96%,56%,.2)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 h-11"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1.5 block font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pl-9 pr-10 bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold text-white border-0"
              style={{
                background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
                boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
              }}
            >
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-white/20 mt-6 tracking-wide">
          Powered by <span className="font-semibold">NewLight</span>
        </p>
      </motion.div>
    </div>
  );
}
