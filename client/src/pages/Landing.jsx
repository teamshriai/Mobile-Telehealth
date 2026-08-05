import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowRight, Heart } from 'lucide-react'

/* ─── Data (CONTENT UNCHANGED) ──────────────────────────────── */
const NAV_LINKS = ['about', 'features', 'pricing', 'contact']

const STATS = [
  { value: '50K+', label: 'Patients Served' },
  { value: '99.9%', label: 'Uptime' },
  { value: '500+', label: 'Providers' },
]

const PILLAR_LABELS = [
  { text: 'HIPAA\nCompliant', position: 'top-[20%]', align: 'text-center' },
  { text: 'Modern\nEquipment', position: 'bottom-[20%]', align: 'text-center' },
  { text: '', position: '', align: '' },
  { text: 'Individual approach\nto each client', position: 'bottom-[18%]', align: 'text-center' },
]

/* ─── Motion variants ───────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
}

/* ═══════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const heroRef = useRef(null)
  const isInView = useInView(heroRef, { once: true, margin: '-10% 0px -10% 0px' })

  return (
    <div
      className="relative w-full min-h-[100svh] overflow-hidden flex items-center justify-center px-4 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14"
      style={{
        background:
          'radial-gradient(1100px 760px at 55% 40%, #7aa7ff 0%, #3b82f6 30%, #2563eb 55%, #1e40af 100%)',
      }}
    >
      {/* background haze + bottom beams */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full bg-white/15 blur-[130px]" />
        <div className="absolute -bottom-28 -right-28 h-[520px] w-[520px] rounded-full bg-indigo-300/15 blur-[130px]" />

        <div
          className="absolute inset-x-0 bottom-[-12%] h-[60%] opacity-30 blur-[10px]"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.34) 0px, rgba(255,255,255,0.34) 16px, rgba(255,255,255,0) 64px, rgba(255,255,255,0) 120px)',
            WebkitMaskImage:
              'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
            maskImage:
              'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
          }}
        />
      </div>

      {/* CARD */}
      <motion.div
        ref={heroRef}
        initial={{ opacity: 0, scale: 0.985, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-6xl overflow-hidden
                   rounded-[28px] sm:rounded-[38px] lg:rounded-[46px]
                   bg-[#f6f0ee] ring-1 ring-black/5
                   shadow-[0_30px_95px_rgba(0,0,0,0.30)]"
        style={{ minHeight: 'clamp(540px, 56vw, 740px)' }}
      >
        <Navbar />

        <div className="relative grid h-full grid-cols-1 md:grid-cols-[0.47fr_0.53fr]">
          <LeftPanel isInView={isInView} />
          <RightPanel />
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════════ */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="relative z-30 flex items-center px-6 py-6 sm:px-8 md:px-10">
      {/* Brand (content unchanged) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
          <Heart size={16} strokeWidth={2.5} className="text-white" />
        </div>
        <span className="font-black text-sm tracking-[0.22em] uppercase text-gray-900 select-none">
          CareFlow
        </span>
      </div>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-10 lg:gap-14 ml-auto">
        <ul className="flex items-center gap-8 lg:gap-12">
          {NAV_LINKS.map((l) => (
            <li key={l}>
              <a
                href={`#${l}`}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200 tracking-wide capitalize"
              >
                {l}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA pair (content unchanged) */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200 px-2"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-gray-900 text-white px-5 py-2.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all duration-200 tracking-wide"
          >
            Get started
          </Link>
        </div>
      </div>

      {/* Hamburger */}
      <button
        className="md:hidden ml-auto flex flex-col justify-center gap-[5px] w-9 h-9 rounded-xl hover:bg-black/5 transition-colors"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((p) => !p)}
      >
        <span
          className={`block mx-auto w-5 h-0.5 bg-gray-800 transition-all duration-300 origin-center ${
            menuOpen ? 'rotate-45 translate-y-[7px]' : ''
          }`}
        />
        <span
          className={`block mx-auto w-5 h-0.5 bg-gray-800 transition-all duration-200 ${
            menuOpen ? 'opacity-0 scale-x-0' : ''
          }`}
        />
        <span
          className={`block mx-auto w-5 h-0.5 bg-gray-800 transition-all duration-300 origin-center ${
            menuOpen ? '-rotate-45 -translate-y-[7px]' : ''
          }`}
        />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 bg-[#f6f0ee]/96 backdrop-blur-xl border-t border-black/5 shadow-xl z-50 px-6 py-5 flex flex-col gap-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l}
                href={`#${l}`}
                className="text-gray-700 hover:text-gray-950 text-sm py-1.5 tracking-wide transition-colors capitalize"
                onClick={() => setMenuOpen(false)}
              >
                {l}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-black/5">
              <Link
                to="/login"
                className="text-center text-sm border border-black/10 text-gray-800 px-4 py-2.5 rounded-full hover:bg-white/40 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-center text-sm font-semibold bg-gray-900 text-white px-4 py-2.5 rounded-full hover:bg-gray-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LEFT PANEL
═══════════════════════════════════════════════════════════════ */
function LeftPanel({ isInView }) {
  return (
    <section className="relative z-10 flex flex-col justify-between px-6 sm:px-8 md:px-10 pb-10 sm:pb-12 md:pb-12 pt-2">
      <div className="pt-2 sm:pt-4 md:pt-6">
        <motion.h1
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="text-[2.35rem] sm:text-5xl lg:text-[3.65rem] font-black leading-[1.06] tracking-tight text-gray-950 uppercase mt-4 mb-9 md:mb-10"
        >
          Welcome to
          <br />
          CareFlow
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="text-sm sm:text-[0.95rem] text-gray-700 leading-relaxed max-w-sm mb-3"
        >
          We deliver clean, seamless, and secure healthcare management for your practice.
        </motion.p>

        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="text-sm sm:text-[0.95rem] text-gray-600 leading-relaxed max-w-md"
        >
          Appointments, records, and provider connections — everything you need to bring modern care to life.
        </motion.p>
      </div>

      <div className="mt-10 sm:mt-12 md:mt-14 flex flex-col gap-7">
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-7 py-3.5 rounded-full
                       hover:bg-gray-800 active:scale-[0.97] transition-all duration-200 tracking-wide group w-fit"
          >
            sign up
            <ArrowRight
              size={15}
              strokeWidth={2.5}
              className="group-hover:translate-x-0.5 transition-transform duration-200"
            />
          </Link>
        </motion.div>

        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="flex flex-wrap items-start gap-x-10 gap-y-6"
        >
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="text-2xl sm:text-[1.7rem] font-black text-gray-950 tracking-tight leading-none">
                {s.value}
              </span>
              <span className="text-[11px] sm:text-xs text-gray-500 tracking-wide mt-1">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   RIGHT PANEL — tuned to match the screenshot
═══════════════════════════════════════════════════════════════ */
function RightPanel() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: 'clamp(320px, 40vw, 680px)' }}
      aria-hidden="true"
    >
      {/* ORB (position + feather like reference) */}
      <div className="pointer-events-none absolute inset-0">
        {/* blue outer glow */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full blur-[38px] opacity-70"
          style={{
            width: 'clamp(520px, 60vw, 920px)',
            height: 'clamp(520px, 60vw, 920px)',
            right: 'clamp(-140px, -10vw, -40px)',
            background:
              'radial-gradient(circle at 32% 50%, rgba(37,99,235,1) 0%, rgba(37,99,235,0.85) 44%, rgba(37,99,235,0) 70%)',
          }}
        />

        {/* main orb (crisper edge but still soft) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full blur-[2px] opacity-95"
          style={{
            width: 'clamp(480px, 56vw, 860px)',
            height: 'clamp(480px, 56vw, 860px)',
            right: 'clamp(-120px, -9vw, -28px)',
            background:
              'radial-gradient(circle at 30% 48%, #93c5fd 0%, #3b82f6 24%, #2563eb 52%, #1d4ed8 72%, rgba(29,78,216,0) 78%)',
          }}
        />

        {/* inner highlight */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full blur-[10px] opacity-60"
          style={{
            width: 'clamp(220px, 26vw, 420px)',
            height: 'clamp(240px, 28vw, 460px)',
            right: 'clamp(20px, 3vw, 90px)',
            background:
              'radial-gradient(ellipse at 42% 46%, rgba(219,234,254,0.95) 0%, rgba(147,197,253,0.55) 35%, rgba(147,197,253,0) 70%)',
          }}
        />

        {/* feather-to-card overlay (this is what makes the left edge blend like the screenshot) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(246,240,238,1) 0%, rgba(246,240,238,1) 30%, rgba(246,240,238,0.65) 44%, rgba(246,240,238,0) 62%)',
          }}
        />
      </div>

      {/* PILLARS (fixed group on the right like the reference) */}
      <div className="absolute inset-0 z-10 flex items-center justify-end pr-[clamp(14px,3vw,44px)]">
        <div className="h-[82%] flex items-stretch gap-[clamp(12px,1.9vw,22px)]">
          {PILLAR_LABELS.map((pillar, i) => (
            <PillarStrip
              key={i}
              label={pillar.text}
              labelPos={pillar.position}
              labelAlign={pillar.align}
              delay={i * 0.08}
            />
          ))}
        </div>
      </div>

      {/* Center wordmark */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <motion.span
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.72, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="select-none font-black tracking-[0.14em] uppercase text-white/90"
          style={{
            fontSize: 'clamp(1.45rem, 3.6vw, 3.05rem)',
            textShadow: '0 10px 40px rgba(0,0,0,0.22)',
          }}
        >
          CAREFLOW
        </motion.span>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PILLAR STRIP — “glass slice” look (stronger like screenshot)
═══════════════════════════════════════════════════════════════ */
function PillarStrip({ label, labelPos, labelAlign, delay }) {
  const lines = label ? label.split('\n') : []

  return (
    <motion.div
      className={[
        'relative h-full',
        'w-[clamp(74px,8vw,128px)]',
        'rounded-[26px]',
        // glass surface
        'bg-white/12 backdrop-blur-[22px]',
        'ring-1 ring-white/22',
        // outer depth
        'shadow-[0_18px_55px_rgba(0,0,0,0.18)]',
        // inner edge highlights (mimics the “slice” separators)
        "before:content-[''] before:absolute before:inset-y-[12px] before:left-[10px] before:w-[2px] before:rounded-full before:bg-white/35 before:opacity-90",
        "after:content-[''] after:absolute after:inset-0 after:rounded-[26px] after:bg-[linear-gradient(90deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.06)_24%,rgba(255,255,255,0)_62%)]",
      ].join(' ')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 + delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {lines.length > 0 && labelPos && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62 + delay, duration: 0.5, ease: 'easeOut' }}
          className={`absolute z-20 left-1/2 -translate-x-1/2 ${labelPos} ${labelAlign} px-2`}
        >
          {lines.map((line, i) => (
            <span
              key={i}
              className="block text-white/85 font-light leading-snug whitespace-nowrap"
              style={{ fontSize: 'clamp(9px, 1.05vw, 12px)' }}
            >
              {line}
            </span>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}