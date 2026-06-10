
import { motion, useInView } from 'framer-motion';

import { useRef, useState } from 'react';

import { CheckCircle, ArrowRight } from 'lucide-react';

export default function BottomCTA() {

  const ref = useRef<HTMLElement>(null);

  const inView = useInView(ref, { once: false, amount: 0.2 });

  const [hovered, setHovered] = useState(false);

  return (

    <section ref={ref} style={{ position: 'relative', zIndex: 10, padding: '80px 24px 140px', maxWidth: 640, margin: '0 auto', background: 'transparent' }}>

      <motion.div

        initial={{ opacity: 0, scale: 0.94 }}

        animate={inView ? { opacity: 1, scale: 1 } : {}}

        transition={{ type: 'spring', stiffness: 260, damping: 24 }}

        style={{

          position: 'relative', background: 'rgba(59,158,255,0.04)',

          border: '1px solid rgba(59,158,255,0.18)', backdropFilter: 'blur(16px)',

          WebkitBackdropFilter: 'blur(16px)', borderRadius: 24,

          padding: '48px 40px', textAlign: 'center', overflow: 'hidden',

        }}

      >

        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '60%', height: 200, background: 'radial-gradient(ellipse,rgba(59,158,255,0.18),transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />

        <CheckCircle size={36} color="hsl(197,92%,68%)" strokeWidth={1.5} aria-hidden="true" style={{ marginBottom: 20 }} />

        <h2 style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg,hsl(211,96%,60%),hsl(250,80%,68%),hsl(197,92%,68%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 12 }}>

          Your System is Ready

        </h2>

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65, maxWidth: 360, margin: '0 auto 32px' }}>

          Everything is configured and waiting for you. Log in and start growing today.

        </p>

        <motion.button

          onMouseEnter={() => setHovered(true)}

          onMouseLeave={() => setHovered(false)}

          whileTap={{ scale: 0.97 }}

          style={{

            display: 'inline-flex', alignItems: 'center', gap: 8,

            minHeight: 44, padding: '0 32px', borderRadius: 9999,

            background: 'linear-gradient(135deg,hsl(211,96%,60%),hsl(197,92%,68%))',

            color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',

            transform: hovered ? 'scale(1.05)' : 'scale(1)',

            boxShadow: hovered ? '0 8px 32px rgba(59,158,255,0.45)' : 'none',

            transition: 'transform 0.2s ease, box-shadow 0.2s ease',

          }}

        >

          Access My System <ArrowRight size={16} aria-hidden="true" />

        </motion.button>

      </motion.div>

    </section>

  );

}

