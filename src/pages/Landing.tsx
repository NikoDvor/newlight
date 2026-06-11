import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { SessionGate } from "@/components/SessionGate";
import MarketingCanvas from "@/components/MarketingCanvas";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import StatsSnapshot from "@/components/StatsSnapshot";
import HowItWorks from "@/components/HowItWorks";
import BottomCTA from "@/components/BottomCTA";

export default function Landing() {
  const navigate = useNavigate();
  const go = () => navigate("/auth");

  // Intro phase: dark briefly, then transition to light to match the splash sequence
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <SessionGate>
      <div
        className="min-h-screen relative"
        style={{
          background: introDone
            ? "linear-gradient(180deg, #EDF6FF 0%, #DCEBFF 60%, #EDF6FF 100%)"
            : "#020814",
          color: "#001A3D",
          transition: "background 1.2s ease",
          overflowX: "hidden",
        }}
      >
        <MarketingCanvas />

        {/* Nav */}
        <motion.nav
          className="relative z-50 flex items-center justify-between px-6 sm:px-10 py-5"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: introDone
              ? "rgba(237,246,255,0.72)"
              : "rgba(2,8,20,0.6)",
            backdropFilter: "blur(14px) saturate(1.4)",
            WebkitBackdropFilter: "blur(14px) saturate(1.4)",
            color: introDone ? "#001A3D" : "#FFFFFF",
            borderBottom: introDone
              ? "1px solid hsla(211,96%,60%,.18)"
              : "1px solid rgba(255,255,255,0.08)",
            transition: "background 1.2s ease, color 1.2s ease, border-color 1.2s ease",
          }}
        >
          <img src={newlightLogo} alt="NewLight" className="h-8 sm:h-9 w-auto object-contain" />
          <motion.button
            onClick={go}
            className="text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-full transition-all duration-200"
            style={{
              background: introDone ? "#00B4FF" : "transparent",
              color: introDone ? "#FFFFFF" : "hsla(211,96%,70%,.9)",
              border: introDone
                ? "1px solid #00B4FF"
                : "1px solid hsla(211,96%,60%,.3)",
              boxShadow: introDone ? "0 6px 18px -6px rgba(0,180,255,0.45)" : "none",
            }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 24px -4px rgba(0,180,255,0.6)" }}
            whileTap={{ scale: 0.97 }}
          >
            Sign In
          </motion.button>
        </motion.nav>

        <HeroSection />
        <StatsSnapshot />
        <FeatureCards />
        <HowItWorks />
        <BottomCTA />
      </div>
    </SessionGate>
  );
}
