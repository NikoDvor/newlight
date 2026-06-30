import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { HomeFX } from "@/components/HomeFX";

const ELECTRIC = "#00B4FF";
const FG = "#ffffff";
const FG_SOFT = "rgba(255,255,255,0.72)";
const BORDER_TINT = "rgba(0,180,255,0.4)";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

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
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors hover:text-white/90 hover:bg-white/5";
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
      style={{ fontFamily: body, background: "#000000", color: FG }}
    >
      {/* HomeFX — sole background layer. Wrapped in an isolated stacking context
          so its internal z-index:-1 renders above the black page fallback but
          below page content (which sits at z-index 10+). */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          isolation: "isolate",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <HomeFX />
      </div>

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 backdrop-blur-md border-b"
        style={{
          zIndex: 100,
          height: 64,
          background: "rgba(0,0,0,0.4)",
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
              label="Download the App"
              icon={<DownloadIcon />}
              navigate={navigate}
            />
            <span className="hidden sm:block w-px h-4 bg-white/10" />
            <NavItem
              href="/get-started"
              label="Schedule a Walkthrough"
              icon={<CalendarIcon />}
              navigate={navigate}
            />
            <span className="hidden sm:block w-px h-4 bg-white/10" />
            <NavItem
              href="mailto:team@newlightgen.com"
              label="Contact Support"
              icon={<SupportIcon />}
            />
            <span className="hidden sm:block w-px h-4 bg-white/10" />
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
            style={{ color: ELECTRIC, fontFamily: display }}
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
              textShadow: "0 0 30px rgba(0,180,255,0.25)",
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
                boxShadow: "0 12px 36px -10px rgba(0,180,255,0.65), 0 0 14px rgba(0,180,255,0.4)",
              }}
            >
              GET STARTED
            </button>

            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center justify-center font-bold transition-colors"
              style={{
                background: "transparent",
                color: FG,
                border: `2px solid ${FG}`,
                borderRadius: 24,
                padding: "12px 24px",
                fontSize: 12,
                letterSpacing: "0.12em",
                fontFamily: display,
                minWidth: 160,
                opacity: 0.85,
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
