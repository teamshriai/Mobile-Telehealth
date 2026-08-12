import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Video, Calendar, FileText, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────
   LandingHeader — full landing experience in one component.

   Scroll story:
     1.  User lands → sees the hero (gradient bg, headline, CTAs, SVG shapes).
     2.  A small white circle sits at the bottom-right corner, co-located
         with the SVG shape cluster.
     3.  As the user scrolls past the hero the circle grows from that corner,
         covering the entire viewport with white.
     4.  Simultaneously the content sections (Services, Steps, Specialists,
         FAQ) fade-up into view — appearing to emerge from inside the circle.
     5.  Content is on a white z-10 layer; the circle is fixed at z-50
         (below the navbar).
───────────────────────────────────────────────────────────────────────── */

/* ── Static data ── */
const SERVICES = [
  {
    icon: Video,
    title: 'HD Virtual Video Meetings',
    desc: 'Face-to-face consultations through browser-based, encrypted HD video — no app download.',
  },
  {
    icon: Calendar,
    title: 'Easy Online Booking',
    desc: 'Pick your specialist, choose a convenient slot, and book in under a minute.',
  },
  {
    icon: FileText,
    title: 'Medical Records & Reports',
    desc: 'Lab summaries, blood results, and care plans — all in your secure patient dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'HIPAA & Privacy Protection',
    desc: 'Medical-grade end-to-end security safeguards every session and health record.',
  },
]

const STEPS = [
  { step: '01', title: 'Create Your Account',       desc: 'Sign up in under 2 minutes with your name and contact details.' },
  { step: '02', title: 'Schedule a Consultation',   desc: 'Choose your specialist and a time slot that suits you.' },
  { step: '03', title: 'Join the Online Meeting',   desc: 'Click "Join Meeting" from your dashboard at appointment time.' },
]

const SPECIALISTS = [
  {
    name: 'Dr. Priya Nair',
    role: 'Lead Medical Oncologist',
    exp:  '14+ years experience',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Meera Pillai, NP',
    role: 'Oncology Nurse Specialist',
    exp:  '10+ years experience',
    avatar: 'https://images.unsplash.com/photo-1594824813566-78a933f2b606?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Dr. Rajan Mehta',
    role: 'Consultant Radiologist',
    exp:  '12+ years experience',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
  },
]

const FAQS = [
  {
    q: 'Do I need to download anything for video meetings?',
    a: 'No. Consultations run directly in your web browser on any device.',
  },
  {
    q: 'Is my health information secure?',
    a: 'Yes. All data and communications are HIPAA-compliant and fully encrypted.',
  },
  {
    q: 'How do I join a scheduled meeting?',
    a: 'Log in, go to "Online Meetings", and click "Join Meeting Now" at your scheduled time.',
  },
]

export default function LandingHeader() {
  const circleRef  = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    // The hero is 100vh. The portal runway is another 80vh of scrolling.
    // Total trigger window: 0 → 180vh (of scrollY).
    const HERO_H    = window.innerHeight
    const RUNWAY    = HERO_H * 0.8          // how much extra scroll to expand the circle

    // Content reveals during the last half of the runway
    const C_START   = HERO_H * 0.55
    const C_END     = HERO_H + RUNWAY * 0.6

    const diagonal  = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2)
    const MAX_DIAM  = diagonal * 2.4        // guarantees full coverage
    const BASE_DIAM = 80

    const onScroll = () => {
      const y = window.scrollY

      /* ── Circle expand ── */
      if (circleRef.current) {
        // progress 0 → 1 across [0, HERO_H + RUNWAY]
        const prog = Math.min(y / (HERO_H + RUNWAY), 1)
        const diam = BASE_DIAM + prog * (MAX_DIAM - BASE_DIAM)
        circleRef.current.style.width   = diam + 'px'
        circleRef.current.style.height  = diam + 'px'
        // Hide when fully expanded (avoids blocking mouse events)
        circleRef.current.style.opacity = prog >= 0.995 ? '0' : '1'
      }

      /* ── Content reveal ── */
      if (contentRef.current) {
        const p = Math.min(Math.max((y - C_START) / (C_END - C_START), 0), 1)
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - p, 3)
        contentRef.current.style.opacity   = String(ease)
        contentRef.current.style.transform = `translateY(${(1 - ease) * 40}px)`
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // initialise in case already scrolled
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ─────────────── GLOBAL STYLES ─────────────── */}
      <style>{`
        @keyframes lh-orb-a {
          0%,100%{ transform:translate(0,0) scale(1); }
          40%    { transform:translate(26px,-34px) scale(1.04); }
          70%    { transform:translate(-14px,16px) scale(0.97); }
        }
        @keyframes lh-orb-b {
          0%,100%{ transform:translate(0,0) scale(1); }
          35%    { transform:translate(-30px,24px) scale(1.05); }
          65%    { transform:translate(18px,-14px) scale(0.96); }
        }
        @keyframes lh-orb-c {
          0%,100%{ transform:translate(0,0) scale(1); }
          50%    { transform:translate(14px,22px) scale(1.03); }
        }
        .lh-orb-1{ animation:lh-orb-a 14s ease-in-out infinite; }
        .lh-orb-2{ animation:lh-orb-b 19s ease-in-out infinite; }
        .lh-orb-3{ animation:lh-orb-c 12s ease-in-out infinite; }

        .lh-dot-grid{
          background-image:radial-gradient(circle,rgba(37,99,235,.14) 1px,transparent 1px);
          background-size:28px 28px;
        }

        @keyframes lh-fu {
          from{ opacity:0; transform:translateY(18px); }
          to  { opacity:1; transform:translateY(0); }
        }
        .lh-fu-1{ animation:lh-fu 0.9s cubic-bezier(.22,1,.36,1) .05s both; }
        .lh-fu-2{ animation:lh-fu 0.9s cubic-bezier(.22,1,.36,1) .20s both; }
        .lh-fu-3{ animation:lh-fu 0.9s cubic-bezier(.22,1,.36,1) .36s both; }
        .lh-fu-4{ animation:lh-fu 0.9s cubic-bezier(.22,1,.36,1) .52s both; }

        @keyframes lh-ticker {
          from{ transform:translateX(0); }
          to  { transform:translateX(-50%); }
        }
        .lh-ticker-track{
          animation:lh-ticker 26s linear infinite;
          will-change:transform;
        }
        .lh-ticker-track:hover{ animation-play-state:paused; }

        /* Portal circle — starts small at bottom-right, expands on scroll */
        .lh-portal{
          position:fixed;
          border-radius:50%;
          background:#ffffff;
          pointer-events:none;
          z-index:50;
          bottom:clamp(40px,6vh,88px);
          right: clamp(14px,2.6vw,44px);
          transform:translate(50%,50%);
          width: 80px;
          height:80px;
          will-change:width,height,opacity;
          transition:width 36ms linear,height 36ms linear,opacity 80ms linear;
        }
      `}</style>

      {/* ─────────────── HERO SECTION ─────────────── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: '100svh' }}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg,#c7d9f8 0%,#dbeafe 45%,#eef4ff 100%)',
            }}
          />

          {/* Orb 1 — top-left blue */}
          <div
            className="lh-orb-1 absolute rounded-full"
            style={{
              width: 'clamp(280px,44vw,720px)', height: 'clamp(280px,44vw,720px)',
              top: '-18%', left: '-10%',
              background: 'radial-gradient(circle at 40% 40%,#60a5fa 0%,#2563eb 42%,#1d4ed8 64%,transparent 76%)',
              opacity: 0.34, filter: 'blur(68px)',
            }}
          />
          {/* Orb 2 — bottom-right indigo */}
          <div
            className="lh-orb-2 absolute rounded-full"
            style={{
              width: 'clamp(220px,36vw,600px)', height: 'clamp(220px,36vw,600px)',
              bottom: '-16%', right: '-10%',
              background: 'radial-gradient(circle at 58% 58%,#818cf8 0%,#6366f1 42%,#4338ca 64%,transparent 76%)',
              opacity: 0.26, filter: 'blur(76px)',
            }}
          />
          {/* Orb 3 — top-right sky */}
          <div
            className="lh-orb-3 absolute rounded-full"
            style={{
              width: 'clamp(120px,18vw,340px)', height: 'clamp(120px,18vw,340px)',
              top: '6%', right: '7%',
              background: 'radial-gradient(circle at 50% 50%,#7dd3fc 0%,#38bdf8 46%,transparent 70%)',
              opacity: 0.20, filter: 'blur(52px)',
            }}
          />

          <div className="lh-dot-grid absolute inset-0 opacity-25" />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 50%,transparent 50%,rgba(191,219,254,.38) 100%)' }}
          />
        </div>

        {/* Hero content */}
        <div
          className="relative z-10 w-full max-w-7xl mx-auto
                     px-5 sm:px-10 lg:px-16
                     pt-[clamp(5.5rem,13vh,9rem)]
                     pb-[clamp(5rem,12vh,8rem)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* ─ Left: headline + CTAs ─ */}
            <div className="space-y-6 max-w-xl">
              {/* Badge */}
              <div className="lh-fu-1 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/60 border border-blue-200/70 backdrop-blur-sm text-blue-800 text-xs font-semibold">
                <ShieldCheck size={13} className="text-blue-600" />
                HIPAA-Compliant Telehealth Portal
              </div>

              {/* Headline */}
              <h1
                className="lh-fu-2 font-extrabold text-gray-900 tracking-tight leading-[1.07]"
                style={{ fontSize: 'clamp(2.1rem,5.2vw,3.8rem)' }}
              >
                Your Care,<br className="hidden sm:block" /> Connected.
              </h1>

              {/* Sub-text */}
              <p className="lh-fu-3 text-sm sm:text-base text-gray-700/80 leading-relaxed">
                HD video consultations, lab reports, and scheduling — from the comfort of home, on any device.
              </p>

              {/* CTA buttons */}
              <div className="lh-fu-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2
                             px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700
                             text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  Register for Portal Access
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center
                             px-6 py-3 rounded-lg bg-white/80 hover:bg-white
                             text-gray-800 text-sm font-semibold
                             border border-gray-300/80 backdrop-blur-sm transition-colors"
                >
                  Sign In
                </Link>
              </div>

              {/* Assurance bullets */}
              <div className="lh-fu-4 pt-5 border-t border-white/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {['No App Download Needed', 'Secure HD Encrypted Video', 'Direct Specialist Access'].map(txt => (
                  <div key={txt} className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                    <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                    {txt}
                  </div>
                ))}
              </div>
            </div>

            {/* ─ Right: Preview card (desktop only) ─ */}
            <div className="hidden lg:block">
              <div className="rounded-xl bg-white/72 border border-white/80 backdrop-blur-md shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">PN</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none">Dr. Priya Nair</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Lead Medical Oncologist</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    Available Online
                  </span>
                </div>

                <div className="rounded-lg bg-slate-900 p-4 space-y-2.5 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Next Available Slot</span>
                    <span className="text-white font-semibold">Today · 2:00 PM</span>
                  </div>
                  <div className="rounded bg-slate-800 border border-slate-700 p-3 text-[11px] text-slate-300">
                    <span className="text-white font-semibold">Topic: </span>
                    Post-treatment follow-up &amp; recent lab results review.
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-bold text-gray-900">Existing patient?</p>
                    <p className="text-[11px] text-gray-500">View upcoming appointments</p>
                  </div>
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 rounded text-xs font-semibold text-blue-700
                               bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Log In
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─ SVG shape cluster — same anchor point as the portal circle ─ */}
        <div
          aria-hidden="true"
          className="absolute z-20 pointer-events-none"
          style={{
            bottom: 'clamp(40px,6vh,88px)',
            right:  'clamp(14px,2.6vw,44px)',
            transform: 'translate(50%,50%)',
          }}
        >
          <svg
            viewBox="0 0 160 160" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 'clamp(88px,8.5vw,136px)', height: 'clamp(88px,8.5vw,136px)', overflow: 'visible' }}
          >
            <circle  cx="110" cy="36" r="22"               fill="rgba(196,181,253,.62)" />
            <rect    x="8"   y="20" width="38" height="38" rx="5" fill="rgba(147,197,253,.56)" />
            <polygon points="68,8 100,58 36,58"             fill="rgba(252,165,165,.42)" />
            <circle  cx="30"  cy="110" r="14"              fill="rgba(110,231,183,.52)" />
            <rect    x="72"  y="90" width="54" height="28" rx="14" fill="rgba(253,186,116,.48)" />
            <rect    x="128" y="100" width="20" height="20" rx="3"
              fill="rgba(167,139,250,.44)" transform="rotate(45 138 110)" />
            <circle  cx="100" cy="130" r="18"
              stroke="rgba(99,102,241,.28)" strokeWidth="2" fill="none" />
            <circle  cx="55"  cy="145" r="6"               fill="rgba(251,146,60,.42)" />
          </svg>
        </div>

        {/* ─ Ticker strip ─ */}
        <div
          className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden"
          style={{
            borderTop: '1px solid rgba(255,255,255,.4)',
            background: 'rgba(255,255,255,.14)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            paddingTop:    'clamp(7px,1.1vh,11px)',
            paddingBottom: 'clamp(7px,1.1vh,11px)',
          }}
        >
          <div className="lh-ticker-track flex items-center whitespace-nowrap" style={{ width: 'max-content' }}>
            {[
              'HIPAA Compliant','·','Secure Video','·','24/7 Access','·',
              'Encrypted Records','·','Oncology Focused','·','End-to-End Encrypted','·',
              'HIPAA Compliant','·','Secure Video','·','24/7 Access','·',
              'Encrypted Records','·','Oncology Focused','·','End-to-End Encrypted','·',
            ].map((item, i) => (
              <span key={i} style={{
                fontSize:      'clamp(8px,.72vw,10px)',
                fontWeight:    item === '·' ? 300 : 600,
                letterSpacing: '.15em',
                textTransform: 'uppercase',
                color:         item === '·' ? 'rgba(37,99,235,.22)' : 'rgba(15,23,42,.44)',
                padding:       item === '·' ? '0 clamp(12px,1.8vw,26px)' : '0',
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* ─────────────── PORTAL CIRCLE ─────────────── */}
      {/* Fixed, co-located with the SVG shapes. Grows on scroll to cover the hero. */}
      <div ref={circleRef} className="lh-portal" />

      {/* ─────────────── CONTENT REVEALED BY THE CIRCLE ─────────────── */}
      {/* Sits in normal document flow below the hero.
          The white portal circle grows to cover the hero gradient,
          visually merging into this white section.
          The content fades + slides up into view as the circle expands. */}
      <div
        ref={contentRef}
        className="relative z-10 bg-white font-sans text-gray-800"
        style={{
          opacity:    0,
          transform:  'translateY(40px)',
          transition: 'opacity 80ms linear, transform 80ms linear',
          willChange: 'opacity, transform',
        }}
      >

        {/* ── Services ── */}
        <section id="services" className="py-16 sm:py-20 border-b border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Comprehensive Telehealth Services
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Everything you need for online consultations and health management.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SERVICES.map((s, i) => {
                const Icon = s.icon
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 bg-white p-5 space-y-3
                               hover:border-blue-500 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{s.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-16 sm:py-20 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                3 Simple Steps to Access Care
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Designed for patients and family caregivers of all ages.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {STEPS.map((st, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-3">
                  <span className="text-2xl font-extrabold text-blue-600 font-mono">{st.step}</span>
                  <h3 className="text-sm font-bold text-gray-900">{st.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Specialists ── */}
        <section id="doctors" className="py-16 sm:py-20 border-b border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Our Healthcare Specialists
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Experienced physicians ready for your online consultation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SPECIALISTS.map((doc, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4">
                  <img
                    src={doc.avatar}
                    alt={doc.name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{doc.name}</h3>
                    <p className="text-xs font-semibold text-blue-600">{doc.role}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.exp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-16 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Common questions about using our patient portal.
              </p>
            </div>
            <div className="space-y-4">
              {FAQS.map((f, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-5 bg-gray-50 space-y-1.5">
                  <h3 className="text-sm font-bold text-gray-900">{f.q}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  )
}