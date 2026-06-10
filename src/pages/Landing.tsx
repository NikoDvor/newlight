import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { SessionGate } from "@/components/SessionGate";
import ParticleBackground from '@/components/ParticleBackground';
import HeroSection from '@/components/HeroSection';
import FeatureCards from '@/components/FeatureCards';
import StatsSnapshot from '@/components/StatsSnapshot';
import HowItWorks from '@/components/HowItWorks';
import BottomCTA from '@/components/BottomCTA';

export default function Landing() {
  const navigate = useNavigate();
  const go = () => navigate("/auth");

  return (
    <SessionGate>
      <div className="min-h-screen text-white" style={{ background: '#060d18', position: 'relative', overflowX: 'hidden' }}>
        <ParticleBackground />

        {/* Nav */}
        <motion.nav
          className="relative z-50 flex items-center justify-between px-6 sm:px-10 py-5"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img src={newlightLogo} alt="NewLight" className="h-8 sm:h-9 w-auto object-contain" />
          <motion.button
            onClick={go}
            className="text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-full border transition-all duration-200"
            style={{ borderColor: "hsla(211,96%,60%,.3)", color: "hsla(211,96%,70%,.9)" }}
            whileHover={{ scale: 1.05, borderColor: "hsla(211,96%,60%,.5)", boxShadow: "0 0 20px -4px hsla(211,96%,60%,.3)" }}
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

