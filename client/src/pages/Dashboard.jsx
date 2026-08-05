import { motion } from 'framer-motion'
import { mockPatient } from '../data/mockPatients.js'
import { healthSummary } from '../data/mockAI.js'
import OverviewCards from '../components/dashboard/OverviewCards.jsx'
import LiquidBiopsyCard from '../components/dashboard/LiquidBiopsyCard.jsx'
import AIInsights from '../components/dashboard/AIInsights.jsx'
import QuickActions from '../components/dashboard/QuickActions.jsx'
import RecentReports from '../components/dashboard/RecentReports.jsx'
import TreatmentProgress from '../components/dashboard/TreatmentProgress.jsx'
import PatientVitals from '../components/dashboard/PatientVitals.jsx'
import AppointmentCard from '../components/dashboard/AppointmentCard.jsx'
import { mockAppointments } from '../data/mockAppointments.js'

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08 },
  },
}

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Dashboard() {
  const patient   = mockPatient
  const firstName = patient.personalInfo.firstName
  const hour      = new Date().getHours()

  const greeting =
    hour < 12 ? 'Good morning'
    : hour < 17 ? 'Good afternoon'
    : 'Good evening'

  const nextAppointment = mockAppointments.find(
    (a) => a.status === 'upcoming'
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="mx-auto w-full max-w-[1400px] space-y-5 sm:space-y-6"
    >
      <motion.div variants={sectionVariants}>
        <HeroGreeting
          greeting={greeting}
          firstName={firstName}
          patient={patient}
        />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <OverviewCards patient={patient} />
      </motion.div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-8">
        <div className="min-w-0 space-y-6">
          <motion.div variants={sectionVariants} className="min-w-0">
            <LiquidBiopsyCard />
          </motion.div>
          <motion.div variants={sectionVariants} className="min-w-0">
            <TreatmentProgress patient={patient} />
          </motion.div>
          <motion.div variants={sectionVariants} className="min-w-0">
            <RecentReports />
          </motion.div>
        </div>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
          <motion.div variants={sectionVariants} className="min-w-0">
            <AppointmentCard appointment={nextAppointment} />
          </motion.div>
          <motion.div variants={sectionVariants} className="min-w-0">
            <PatientVitals vitals={patient.vitals} />
          </motion.div>
          <motion.div variants={sectionVariants} className="min-w-0">
            <QuickActions />
          </motion.div>
        </aside>
      </div>

      <motion.div variants={sectionVariants} className="min-w-0">
        <AIInsights summary={healthSummary} />
      </motion.div>
    </motion.div>
  )
}

function HeroGreeting({ greeting, firstName, patient }) {
  const { current } = patient.healthScore
  const { current: ctDNA, trend: ctDNATrend } = patient.ctDNA

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 px-5 py-6 text-white sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_28%)]" />
      <div className="absolute inset-x-0 top-0 h-2 bg-white/10" />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1.5fr_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0 space-y-4">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
              {greeting}, {firstName}
            </span>
          </div>

          <div className="space-y-3">
            <span className="block text-xs uppercase tracking-[0.18em] text-sky-200">
              Your health at a glance
            </span>
            <h1 className="max-w-2xl text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
              Everything for your care, in one quiet place.
            </h1>
            <span className="block max-w-xl text-sm leading-7 text-slate-200/90">
              Keep appointments, records, wellbeing signals, and specialist care organized without the noise.
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-sky-100/70">
                Care plan
              </span>
              <span className="mt-2 block text-xl font-semibold text-white">
                {patient.treatment.cycle}/18
              </span>
              <span className="mt-2 block text-sm text-slate-200/80">
                Review and specialist support are on track.
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-sky-100/70">
                Next check-in
              </span>
              <span className="mt-2 block text-xl font-semibold text-white">
                Nov 15, 2024
              </span>
              <span className="mt-2 block text-sm text-slate-200/80">
                Bring notes or questions for your care team.
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-3xl bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/80">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
              <span className="text-base font-semibold">{current}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Health overview
              </span>
              <span className="mt-1 block text-xl font-semibold text-slate-950">
                {current}/100
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <HeroStatPill
              label="Specialist monitoring"
              value={`${ctDNA}%`}
              trend={ctDNATrend}
              delta="Progress improving"
              color="#38BDF8"
            />
            <HeroStatPill
              label="Focused care"
              value="Oncology support"
              sub="One part of your overall plan"
              color="#EAB308"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroStatPill({ label, value, sub, trend, delta, color }) {
  const trendColor =
    trend === 'improving' || trend === 'decreasing' ? '#16A34A' : '#D97706'

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div
        className="h-8 w-1.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="block text-sm font-bold leading-tight text-slate-900">
          {value}
        </span>
        {delta && (
          <span
            className="mt-0.5 block text-[10px] font-medium"
            style={{ color: trendColor }}
          >
            {delta}
          </span>
        )}
        {sub && (
          <span className="mt-0.5 block text-[10px] text-slate-500">{sub}</span>
        )}
      </div>
    </div>
  )
}
