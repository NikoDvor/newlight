
import { motion, useInView } from 'framer-motion';

import { useRef, useEffect, useState } from 'react';

interface Stat { label: string; value: number; prefix: string; suffix: string; accent: string; glow: string; }

const stats: Stat[] = [

  { label: 'Leads Captured',     value: 127,  prefix: '',  suffix: '',  accent: 'hsl(211,96%,60%)', glow: 'rgba(59,158,255,0.35)'  },

  { label: 'Calls Booked',       value: 34,   prefix: '',  suffix: '',  accent: 'hsl(152,76%,55%)', glow: 'rgba(52,211,153,0.35)'  },

  { label: 'Revenue Tracked',    value: 48.2, prefix: '$', suffix: 'K', accent: 'hsl(43,96%,65%)',  glow: 'rgba(245,158,11,0.35)'  },

  { label: 'Automations Active', value: 12,   prefix: '',  suffix: '',  accent: 'hsl(262,80%,72%)', glow: 'rgba(139,92,246,0.35)'  },

];

function useCountUp(target: number, active: boolean, duration = 1800) {

  const [count, setCount] = useState(0);

  const isDecimal = target % 1 !== 0;

  useEffect(() => {

    if (!active) { setCount(0); return; }

    let start: number | null = null, raf: number;

    const tick = (ts: number) => {

      if (!start) start = ts;

      const p = Math.min((ts - start) / duration, 1);

      const v = (1 - Math.pow(1-p, 3)) * target;

      setCount(isDecimal ? parseFloat(v.toFixed(1)) : Math.round(v));

      if (p < 1) raf = requestAnimationFrame(tick);

    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);

  }, [active, target, duration, isDecimal]);

  return count;

}

function StatCard({ stat, index, active }: { stat: Stat; index: number; active: boolean }) {

  const count = useCountUp(stat.value, active);

  const [hovered, setHovered] = useState(false);

  return (

    <motion.div

      initial={{ opacity: 0, y: 26 }}

      animate={active ? { opacity: 1, y: 0 } : {}}

      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: index * 0.1 }}

      onMouseEnter={() => setHovered(true)}

      onMouseLeave={() => setHovered(false)}

      style={{

        position: 'relative', background: 'rgba(255,255,255,0.025)',

        border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)',

        WebkitBackdropFilter: 'blur(12px)', borderRadius: 16, padding: '28px 24px',

        overflow: 'hidden',

        transform: hovered ? 'scale(1.03)' : 'scale(1)',

        boxShadow: hovered ? `0 16px 40px -8px ${stat.glow}` : 'none',

        transition: 'transform 0.22s ease, box-shadow 0.22s ease',

      }}

    >

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: stat.accent, borderRadius: '16px 16px 0 0' }} />

      <div style={{ fontSize: 36, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>

        {stat.prefix}{count}{stat.suffix}

      </div>

      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>

    </motion.div>

  );

}

export default function StatsSnapshot() {

  const ref = useRef<HTMLElement>(null);

  const inView = useInView(ref, { once: false, amount: 0.2 });

  return (

    <section ref={ref} style={{ position: 'relative', zIndex: 10, padding: '80px 24px', maxWidth: 960, margin: '0 auto', background: 'transparent' }}>

      <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}

        style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(197,92%,68%)', marginBottom: 12 }}>

        Live Business Snapshot

      </motion.p>

      <motion.h2 initial={{ opacity: 0, y: 18 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.08 }}

        style={{ textAlign: 'center', fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: 48, letterSpacing: '-0.02em' }}>

        Your Numbers, Right Now

      </motion.h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>

        {stats.map((s, i) => <StatCard key={s.label} stat={s} index={i} active={inView} />)}

      </div>

    </section>

  );

}

