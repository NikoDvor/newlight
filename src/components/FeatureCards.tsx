
import { motion, useInView } from 'framer-motion';

import { useRef, useState } from 'react';

import { Zap, Users, Calendar, TrendingUp, type LucideIcon } from 'lucide-react';

interface Feature { icon: LucideIcon; title: string; description: string; }

const features: Feature[] = [

  { icon: Zap,        title: 'Smart Automations',  description: 'Build powerful workflows that handle follow-ups, reminders, and nurture sequences automatically — 24/7.' },

  { icon: Users,      title: 'Lead Tracking',       description: 'Every lead captured and tracked through your pipeline with full visibility from first touch to close.' },

  { icon: Calendar,   title: 'Appointment Engine',  description: 'Frictionless booking with automated confirmations, reminders, and rescheduling built right in.' },

  { icon: TrendingUp, title: 'Revenue Visibility',  description: 'See exactly where your revenue stands in real-time — deals won, pending, and projected all in one view.' },

];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {

  const ref = useRef<HTMLDivElement>(null);

  const [hovered, setHovered] = useState(false);

  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const Icon = feature.icon;

  return (

    <motion.div

      ref={ref}

      initial={{ opacity: 0, y: 32 }}

      whileInView={{ opacity: 1, y: 0 }}

      viewport={{ once: false, amount: 0.1 }}

      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: index * 0.09 }}

      onMouseMove={e => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); setCursor({ x: e.clientX-r.left, y: e.clientY-r.top }); }}

      onMouseEnter={() => setHovered(true)}

      onMouseLeave={() => setHovered(false)}

      style={{

        position: 'relative', overflow: 'hidden', cursor: 'default',

        background: 'rgba(255,255,255,0.025)',

        border: `1px solid ${hovered ? 'rgba(59,158,255,0.35)' : 'rgba(255,255,255,0.07)'}`,

        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',

        borderRadius: 16, padding: 24,

        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',

        boxShadow: hovered ? '0 20px 40px -12px rgba(59,158,255,0.25)' : 'none',

        transition: 'transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',

      }}

    >

      {hovered && (

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: `radial-gradient(180px circle at ${cursor.x}px ${cursor.y}px,rgba(59,158,255,0.07),transparent 80%)` }} />

      )}

      <div style={{ position: 'relative', zIndex: 1, width: 44, height: 44, borderRadius: 10, background: 'rgba(59,158,255,0.10)', border: '1px solid rgba(59,158,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>

        <Icon size={20} color="hsl(211,96%,60%)" strokeWidth={1.8} aria-hidden="true" />

      </div>

      <h3 style={{ position: 'relative', zIndex: 1, fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.92)', marginBottom: 8 }}>{feature.title}</h3>

      <p  style={{ position: 'relative', zIndex: 1, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.62, margin: 0 }}>{feature.description}</p>

    </motion.div>

  );

}

export default function FeatureCards() {

  const ref = useRef<HTMLElement>(null);

  const inView = useInView(ref, { once: false, amount: 0.1 });

  return (

    <section ref={ref} style={{ position: 'relative', zIndex: 10, padding: '80px 24px', maxWidth: 960, margin: '0 auto', background: 'transparent' }}>

      <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}

        style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(197,92%,68%)', marginBottom: 12 }}>

        What's Inside

      </motion.p>

      <motion.h2 initial={{ opacity: 0, y: 18 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.08 }}

        style={{ textAlign: 'center', fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: 48, letterSpacing: '-0.02em' }}>

        Everything You Need to Run Your Business

      </motion.h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>

        {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}

      </div>

    </section>

  );

}

