
import { motion } from 'framer-motion';

const lines = [

  { words: ['Your','Entire','Business,'], gradient: false },

  { words: ['Automated','&','Tracked'],   gradient: true  },

  { words: ['in','One','System'],         gradient: false },

];

export default function HeroSection() {

  let idx = 0;

  return (

    <section style={{

      position: 'relative', zIndex: 10, display: 'flex',

      flexDirection: 'column', alignItems: 'center',

      padding: '100px 24px 80px', textAlign: 'center', background: 'transparent',

    }}>

      <div style={{

        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',

        width: 500, height: 400, borderRadius: '50%',

        background: 'radial-gradient(ellipse,rgba(30,100,220,0.09),transparent 70%)',

        filter: 'blur(60px)', pointerEvents: 'none', zIndex: -1,

      }} />

      <motion.div

        initial={{ opacity: 0, scale: 0.82 }}

        animate={{ opacity: 1, scale: 1 }}

        transition={{ type: 'spring', stiffness: 420, damping: 22 }}

        style={{

          display: 'inline-flex', alignItems: 'center', gap: 6,

          padding: '6px 16px', background: 'rgba(59,158,255,0.10)',

          border: '1px solid rgba(59,158,255,0.22)', borderRadius: 9999,

          color: 'hsl(197,92%,68%)', fontSize: 9,

          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 28,

        }}

      >

        ⚡ Your system is already live

      </motion.div>

      <h1 style={{

        fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800,

        letterSpacing: '-0.03em', lineHeight: 1.15,

        marginBottom: 20, maxWidth: 680,

      }}>

        {lines.map((line, li) => (

          <span key={li} style={{ display: 'block' }}>

            {line.words.map((w) => {

              const delay = 0.12 + idx++ * 0.07;

              return (

                <motion.span

                  key={w + li}

                  initial={{ opacity: 0, y: 22 }}

                  animate={{ opacity: 1, y: 0 }}

                  transition={{ type: 'spring', stiffness: 300, damping: 24, delay }}

                  style={{

                    display: 'inline-block', marginRight: '0.25em',

                    ...(line.gradient ? {

                      background: 'linear-gradient(135deg,hsl(211,96%,60%),hsl(250,80%,68%),hsl(197,92%,68%))',

                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',

                    } : { color: 'rgba(255,255,255,0.95)' }),

                  }}

                >

                  {w}

                </motion.span>

              );

            })}

          </span>

        ))}

      </h1>

      <motion.p

        initial={{ opacity: 0, y: 18 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.82 }}

        style={{

          color: 'rgba(255,255,255,0.48)', maxWidth: 440,

          lineHeight: 1.65, fontSize: 15, marginBottom: 36,

        }}

      >

        NewLight Command Center brings every lead, appointment, and revenue stream

        into one intelligent system — so you focus on growth, not chaos.

      </motion.p>

      <motion.div

        initial={{ opacity: 0, scale: 0.9 }}

        animate={{ opacity: 1, scale: 1 }}

        transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.96 }}

        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}

      >

        <motion.button

          whileHover={{ scale: 1.05, boxShadow: '0 8px 32px rgba(59,158,255,0.42)' }}

          whileTap={{ scale: 0.97 }}

          style={{

            minHeight: 44, padding: '0 30px', borderRadius: 9999,

            background: 'linear-gradient(135deg,hsl(211,96%,60%),hsl(250,80%,68%))',

            color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',

          }}

        >

          Get Started Free

        </motion.button>

        <motion.button

          whileHover={{ scale: 1.04 }}

          whileTap={{ scale: 0.97 }}

          style={{

            minHeight: 44, padding: '0 30px', borderRadius: 9999,

            background: 'transparent', color: 'rgba(255,255,255,0.82)',

            fontWeight: 700, fontSize: 14,

            border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer',

          }}

        >

          See How It Works

        </motion.button>

      </motion.div>

    </section>

  );

}

