import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"recovery" | "force" | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("recovery");
      return;
    }
    // Forced first-login password change: authenticated user with must_change_password flag.
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.user_metadata?.must_change_password || params.get("force") === "1") {
        setMode("force");
      } else {
        navigate("/auth");
      }
    })();
  }, [navigate, params]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const heading = mode === "force" ? "Set your new password" : "Set your new password";
  const subtitle =
    mode === "force"
      ? "For your security, please change your temporary password before continuing."
      : "Enter a new password to finish resetting your account.";

  if (!mode) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
              }}
            >
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">NewLight</span>
          </div>
          <p className="text-sm text-white/60">{heading}</p>
          <p className="text-xs text-white/40 mt-1">{subtitle}</p>
        </div>
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: "hsla(218,35%,14%,.8)",
            backdropFilter: "blur(24px)",
            border: "1px solid hsla(211,96%,60%,.12)",
          }}
        >
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/25 h-11"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-white border-0"
              style={{
                background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
              }}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
