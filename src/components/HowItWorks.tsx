
import { motion, useInView } from 'framer-motion';

import { useRef } from 'react';

const steps = [

  { number: '01', title: 'We Build It',    description: 'Our team sets up your entire command center — CRM, automations, pipelines, and integrations — fully configured for your business.' },

  { number: '02', title: 'You Get Access', description: 'Log in to your branded portal. Everything is live, connected, and ready to capture leads and book appointments from day one.' },

  { number: '03', title: 'System Runs',    description: 'Your automations work around the clock. Leads flow in, follow-ups go out, and you watch your pipeline grow in real-time.' },

];

const glass: React.CSSProperties = {

  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',

  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',

  borderRadius: 16, padding: 20,

};

export default function HowItWorks() {

  const ref = useRef<HTMLElement>(null);

  const inView = useInView(ref, { once: false, amount: 0.2 });

  return (

    <section ref={ref} style={{ position: 'relative', zIndex: 10, padding: '80px 24px', maxWidth: 960, margin: '0 auto', background: 'transparent' }}>

      <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}

        style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'hsl(197,92%,68%)', marginBottom: 12 }}>

        The Process

      </motion.p>

      <motion.h2 initial={{ opacity: 0, y: 18 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.08 }}

        style={{ textAlign: 'center', fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: 64, letterSpacing: '-0.02em' }}>

        Up and Running in Days

      </motion.h2>

      <div style={{ position: 'relative' }}>

        <svg aria-hidden="true" style={{ position: 'absolute', top: 27, left: '18%', width: '64%', height: 2, overflow: 'visible', zIndex: 0 }} viewBox="0 0 100 1" preserveAspectRatio="none">

          <motion.line

            x1="0" y1="0.5" x2="100" y2="0.5"

            stroke="rgba(59,158,255,0.38)" strokeWidth="1"

            strokeDasharray="100"

            initial={{ strokeDashoffset: 100 }}

            animate={inView ? { strokeDashoffset: 0 } : { strokeDashoffset: 100 }}

            transition={{ duration: 1.1, delay: 0.5, ease: 'easeInOut' }}

            vectorEffect="non-scaling-stroke"

          />

        </svg>

        <div style={{ display: 'flex', gap: 20, position: 'relative', flexWrap: 'wrap' }}>

          {steps.map((step, i) => (

            <motion.div key={step.number}

              initial={{ opacity: 0, y: 28 }}

              animate={inView ? { opacity: 1, y: 0 } : {}}

              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.18 + i * 0.15 }}

              style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}

            >

              <div style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: 12, background: 'hsl(218,38%,6%)', border: '1px solid rgba(59,158,255,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'hsl(211,96%,60%)', letterSpacing: '0.04em', marginBottom: 20, flexShrink: 0, boxShadow: '0 0 18px rgba(59,158,255,0.12)' }}>

                {step.number}

              </div>

              <div style={{ ...glass, width: '100%' }}>

                <h3 style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.92)', marginBottom: 10 }}>{step.title}</h3>

                <p  style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.62, margin: 0 }}>{step.description}</p>

              </div>

            </motion.div>

          ))}

        </div>

      </div>

    </section>

  );

}

