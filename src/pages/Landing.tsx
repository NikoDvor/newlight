import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/nl-monogram.jpg";
import { HomeFX } from "@/components/HomeFX";

const NAVY = "#0A2540"; // headline only — kept dark for primary contrast
const ELECTRIC = "#1E6FD9"; // primary blue for buttons (unchanged)
const NEON_BLUE = "#00BFFF"; // bright neon-blue glow for highlights
const SKY = "#7CC7FF"; // light blue for FX linework
const BODY_BLUE = "#5A9BD8"; // lighter blue for secondary body/nav/footer text
const INK = BODY_BLUE; // blue default body color
const FG = NAVY; // headings (headline only on this page)
const FG_SOFT = BODY_BLUE; // blue-tinted body/nav/footer text
const BORDER_TINT = "rgba(30,111,217,0.28)";
const PAGE_BG = "#FFFFFF";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};


function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  navigate?: ReturnType<typeof useNavigate>;
}

function NavItem({ href, label, icon, navigate }: NavItemProps) {
  const isExternal = href.startsWith("mailto:") || href.startsWith("tel:");
  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors hover:bg-[rgba(33,150,243,0.08)]";
  const style: React.CSSProperties = {
    color: FG_SOFT,
    fontSize: 12,
    letterSpacing: "0.04em",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "6px 8px",
    whiteSpace: "nowrap",
  };

  if (isExternal) {
    return (
      <a href={href} className={baseClasses} style={style} aria-label={label}>
        <span className="flex-shrink-0">{icon}</span>
        <span className="hidden md:inline">{label}</span>
      </a>
    );
  }

  return (
    <button
      onClick={() => navigate?.(href)}
      className={baseClasses}
      style={style}
      aria-label={label}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = "nl-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const display = "'Rajdhani', 'Inter', system-ui, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ fontFamily: body, background: PAGE_BG, color: INK }}
    >
      {/* HomeFX — recolored via CSS filter only (geometry/animation untouched).
          Reduced opacity/contrast so it reads as a soft, low-contrast background texture. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          isolation: "isolate",
          pointerEvents: "none",
          animation: "nl-home-breath 4.6s ease-in-out infinite",
          willChange: "opacity",
          opacity: 0.36,
          filter: "invert(1) sepia(1) saturate(5) hue-rotate(178deg) brightness(1.2) contrast(0.85)",
          mixBlendMode: "multiply",
        }}
        aria-hidden
      >
        <style>{`
          @keyframes nl-home-breath {
            0%, 100% { opacity: 0.30; }
            50%      { opacity: 0.42; }
          }
        `}</style>
        <HomeFX />
      </div>


      {/* Single corner blue highlight streak — top-right only */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: -80,
          right: -80,
          width: 360,
          height: 360,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 70% 30%, rgba(30,111,217,0.35) 0%, rgba(124,199,255,0.18) 35%, rgba(255,255,255,0) 65%)",
          filter: "blur(20px)",
        }}
      />




      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 backdrop-blur-md border-b"
        style={{
          zIndex: 100,
          height: 64,
          background: "rgba(255,255,255,0.72)",
          borderColor: BORDER_TINT,
        }}
      >

        <nav className="relative h-full max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <a href="/" className="flex items-center" style={{ zIndex: 2 }}>
            <img
              src={newlightLogo}
              alt="NewLight"
              style={{ height: 40, width: "auto", background: "transparent" }}
            />
          </a>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
              color: FG,
              fontSize: 16,
              letterSpacing: "0.32em",
              fontWeight: 700,
              fontFamily: display,
              zIndex: 1,
            }}
          >
            NEWLIGHT
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <NavItem
              href="/get-started"
              label="Schedule a Walkthrough"
              icon={<CalendarIcon />}
              navigate={navigate}
            />
            <span className="hidden sm:block w-px h-4 bg-[rgba(33,150,243,0.25)]" />
            <NavItem
              href="mailto:team@newlightgen.com"
              label="Contact Support"
              icon={<SupportIcon />}
            />
            <span className="hidden sm:block w-px h-4 bg-[rgba(33,150,243,0.25)]" />
            <NavItem
              href="tel:+18058363557"
              label="Call Now"
              icon={<PhoneIcon />}
            />
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative" style={{ zIndex: 10 }}>
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-32">
          <motion.div
            className="text-[12px] font-bold tracking-[0.28em] uppercase mb-8"
            style={{
              color: NEON_BLUE,
              fontFamily: display,
              textShadow: "0 0 10px rgba(0,191,255,0.55), 0 0 22px rgba(0,191,255,0.30)",
            }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            // AI MODERN MARKETING SYSTEMS
          </motion.div>

          <motion.h1
            className="font-bold leading-[0.95] tracking-[-0.02em] mx-auto"
            style={{
              color: FG,
              fontSize: "clamp(40px, 6.8vw, 88px)",
              maxWidth: 960,
              fontFamily: display,
              textShadow: "0 1px 0 rgba(255,255,255,0.6)",
            }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
          >
            WE BRING YOU READY-TO-BUY CUSTOMERS.
          </motion.h1>

          <motion.div
            className="mt-8 mx-auto"
            style={{ width: 60, height: 2, background: ELECTRIC, opacity: 0.85 }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
          />

          <motion.p
            className="mt-7 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: FG_SOFT, fontFamily: body }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
          >
            One system. Every lead, appointment, and revenue stream — automated and
            tracked inside your branded Command Center.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={4}
          >
            <button
              onClick={() => navigate("/get-started")}
              className="inline-flex items-center justify-center font-bold transition-all hover:brightness-110"
              style={{
                background: ELECTRIC,
                color: "#FFFFFF",
                borderRadius: 24,
                padding: "16px 34px",
                fontSize: 13,
                letterSpacing: "0.14em",
                fontFamily: display,
                minWidth: 220,
                boxShadow: "0 12px 36px -10px rgba(30,111,217,0.55), 0 0 14px rgba(30,111,217,0.35)",
              }}
            >
              GET STARTED
            </button>


            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center justify-center font-bold transition-colors hover:bg-[rgba(33,150,243,0.08)]"
              style={{
                background: "transparent",
                color: ELECTRIC,
                border: `2px solid ${ELECTRIC}`,
                borderRadius: 24,
                padding: "12px 24px",
                fontSize: 12,
                letterSpacing: "0.12em",
                fontFamily: display,
                minWidth: 160,
              }}
            >
              LOG IN
            </button>

          </motion.div>

          <motion.div
            className="mt-16 text-xs"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={5}
          >
            <a
              href="https://newlightgen.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline"
              style={{ color: ELECTRIC, letterSpacing: "0.12em", fontFamily: display }}
            >
              VISIT NEWLIGHTGEN.COM →
            </a>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="relative w-full text-center py-5"
        style={{ zIndex: 10, borderTop: `1px solid ${BORDER_TINT}` }}
      >
        <p className="text-[11px]" style={{ color: FG_SOFT }}>
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
