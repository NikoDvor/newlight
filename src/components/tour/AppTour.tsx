import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Live app tour — walks a salesman through the REAL screens, one frame at a time.
 * Start it by opening any employee page with ?tour=app (Training → Module 2 has the button).
 * Each step: go to a route, find an element (data-tour="…" or a nav link), light it up with glowing
 * lines, and explain it. If the element isn't on screen (e.g. the phone menu is closed), the step
 * shows as a centered card instead — the tour never gets stuck.
 */

interface Step { route: string; target?: string; title: string; body: string }

export const APP_TOUR: Step[] = [
  { route: "/employee/generic", title: "Welcome to your app", body: "This is My Pipeline — home. Everything you need today starts here. Tap Next to walk through every screen." },
  { route: "/employee/generic", target: '[data-tour="why"]', title: "Your goal, every day", body: "Your countdown and today's quote from Training Module 9. Only you can see them." },
  { route: "/employee/generic", target: '[data-tour="today"]', title: "Today strip", body: "Meetings today, outcomes overdue, Form 1s and Form 2s this week, Pay & Signs waiting, wins this month. Tap any tile." },
  { route: "/employee/generic", target: '[data-tour="board"]', title: "Your board", body: "Every lead by stage: Cold → Warm → Hot → Won. Red flags tell you what needs you. Tap a lead to open its profile." },
  { route: "/employee/generic", target: '[data-tour="forms"]', title: "Your Forms", body: "Form 1 is your booking link. Form 2 is Close Prep. Form 3 is Pay & Sign. Only forms move a lead up." },
  { route: "/employee/lead-sourcing", target: '[data-tour="pull"]', title: "Pull leads", body: "Pick a territory, a firm type and how many. They land in your Dialer and My Leads right away." },
  { route: "/employee/dialer", title: "The Dialer", body: "Each row is a firm. Tap a row for every decision maker with their own numbers. Calls you make here count toward your 250. Pick an outcome after every call, then Mark Dialed." },
  { route: "/employee/leads", title: "My Leads", body: "Every lead you own. Buttons on each lead: Numbers (Discovery), + Meeting, Booked elsewhere, Close Prep." },
  { route: "/employee/calendar", title: "My Calendar", body: "Your meetings. Open one to switch it to 'away from our Zoom', add attendees, or log the outcome." },
  { route: "/employee/my-stats", title: "My Stats", body: "Dials, meetings, close rates and meeting effort — next to the team average." },
  { route: "/employee/recordings", title: "My Recordings", body: "Every meeting on our Zoom saves here by itself — video, audio and transcript. Upload anything else." },
  { route: "/employee/training", title: "You're done", body: "That's the whole app. Back to training — and come back to this tour anytime from Module 2." },
];

type Rect = { top: number; left: number; width: number; height: number };

export function AppTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Start from ?tour=app
  useEffect(() => {
    if (params.get("tour") === "app" && !active) {
      setActive(true); setI(0);
      navigate(APP_TOUR[0].route, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const step = APP_TOUR[i];

  // Go to the step's route
  useEffect(() => {
    if (!active || !step) return;
    if (location.pathname !== step.route) navigate(step.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, i]);

  // Find the target (poll — pages load data first)
  useLayoutEffect(() => {
    if (!active || !step) return;
    setRect(null);
    if (!step.target || location.pathname !== step.route) return;
    let tries = 0, cancelled = false;
    const find = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (el && el.offsetParent !== null) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }, 350);
      } else if (tries++ < 20) setTimeout(find, 200);
    };
    find();
    const onMove = () => {
      const el = step.target ? document.querySelector(step.target) as HTMLElement | null : null;
      if (el) { const r = el.getBoundingClientRect(); setRect({ top: r.top, left: r.left, width: r.width, height: r.height }); }
    };
    window.addEventListener("resize", onMove);
    document.querySelector("main")?.addEventListener("scroll", onMove, { passive: true });
    return () => { cancelled = true; window.removeEventListener("resize", onMove); document.querySelector("main")?.removeEventListener("scroll", onMove); };
  }, [active, i, location.pathname]);

  if (!active || !step) return null;
  const end = () => { setActive(false); setI(0); };
  const last = i === APP_TOUR.length - 1;
  const pad = 8;

  // Place the card below the target if there's room, else above; centered when no target.
  const vh = window.innerHeight, vw = window.innerWidth;
  const cardW = Math.min(360, vw - 32);
  let cardStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: vh / 2 - 110, width: cardW };
  if (rect) {
    const below = rect.top + rect.height + pad + 16;
    const top = below + 200 < vh ? below : Math.max(16, rect.top - pad - 16 - 200);
    cardStyle = { width: cardW, top, left: Math.max(16, Math.min(vw - cardW - 16, rect.left + rect.width / 2 - cardW / 2)) };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      <style>{`@keyframes nlBreathe{0%,100%{opacity:.25}50%{opacity:1}}.nl-academy-breathe{animation:nlBreathe 5.5s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.nl-academy-breathe{animation:none}}`}</style>
      {/* dim everything; the highlighted frame is drawn on top */}
      <div className="absolute inset-0 bg-[hsla(222,50%,3%,.72)]" onClick={end} />
      <AnimatePresence>
        {rect && (
          <motion.div key={i} className="pointer-events-none absolute rounded-xl"
            initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
              boxShadow: "0 0 0 2px hsl(197,100%,60%), 0 0 24px 2px hsla(197,100%,55%,.55), 0 0 0 9999px hsla(222,50%,3%,.15)" }}>
            <span className="absolute inset-x-6 -top-px h-px nl-academy-breathe" style={{ background: "linear-gradient(90deg, transparent, white, transparent)" }} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div key={"c" + i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="absolute rounded-2xl border border-[hsla(197,100%,55%,.45)] bg-[hsl(222,42%,8%)] p-4 shadow-[0_20px_60px_-20px_hsla(197,100%,50%,.6)]" style={cardStyle}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(197,100%,62%)]">Tour · {i + 1} / {APP_TOUR.length}</span>
          <button type="button" onClick={end} aria-label="End tour"><X className="h-4 w-4 text-white/50" /></button>
        </div>
        <div className="mt-2 text-[16px] font-semibold text-white">{step.title}</div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/75">{step.body}</p>
        <div className="mt-3 flex gap-1">
          {APP_TOUR.map((_, k) => <span key={k} className="h-[3px] flex-1 rounded-full" style={{ background: k <= i ? "hsl(197,100%,58%)" : "hsla(0,0%,100%,.12)" }} />)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="inline-flex items-center gap-1 text-[12px] text-white/60 disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" />Back</button>
          <button type="button" onClick={() => (last ? end() : setI(i + 1))}
            className="inline-flex items-center gap-1 rounded-lg bg-[hsl(197,100%,50%)] px-3 py-1.5 text-[12px] font-semibold text-[hsl(222,50%,6%)]">
            {last ? "Finish" : "Next"}{!last && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

export default AppTour;
