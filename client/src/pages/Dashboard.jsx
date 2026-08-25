import { mockPatient } from '../data/mockPatients.js'
import OverviewCards from '../components/dashboard/OverviewCards.jsx'
import LiquidBiopsyCard from '../components/dashboard/LiquidBiopsyCard.jsx'
import QuickActions from '../components/dashboard/QuickActions.jsx'
import RecentReports from '../components/dashboard/RecentReports.jsx'
import TreatmentProgress from '../components/dashboard/TreatmentProgress.jsx'
import PatientVitals from '../components/dashboard/PatientVitals.jsx'
import AppointmentCard from '../components/dashboard/AppointmentCard.jsx'
import EmergencyAlert from '../components/dashboard/EmergencyAlert.jsx'
import SpokeRail from '../components/dashboard/SpokeRail.jsx'
import { mockAppointments } from '../data/mockAppointments.js'
import { FileText, Calendar, CheckCircle } from 'lucide-react'

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
    <div className="w-full space-y-5">
      {/* Hero + hub-and-spoke nav are one visual group */}
      <div className="space-y-3">
        <HeroGreeting
          greeting={greeting}
          firstName={firstName}
        />
        <SpokeRail />
      </div>

      {/* Primary Key Metric Cards */}
      <OverviewCards patient={patient} />

      {/* Main Content Layout Grid — two columns from lg: up, so the
          collapsed-sidebar/1024-1280px range doesn't fall back to a single
          narrow column with the rest of the viewport sitting empty. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <LiquidBiopsyCard />
          <TreatmentProgress patient={patient} />
          <RecentReports />
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
          <AppointmentCard appointment={nextAppointment} />
          <PatientVitals vitals={patient.vitals} />
          <QuickActions />
        </aside>
      </div>

      {/* Simple Patient Health Summary (Clean, non-glowing) */}
      <PatientHealthSummary patient={patient} />
    </div>
  )
}

function HeroGreeting({ greeting, firstName }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-800 p-6 text-white"
      style={{
        background: 'radial-gradient(900px circle at 100% -10%, rgba(59,130,246,0.28), transparent 55%), #0B1220',
      }}
    >
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="space-y-2 lg:flex-1">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            {greeting}, {firstName}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            AI Powered Command Centre
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Your recovery, care team, and appointments in one place — with emergency stroke response one tap away.
          </p>
        </div>

        {/* Divider unifies the greeting and the alert action as one panel */}
        <div className="hidden lg:block h-16 w-px bg-white/10 flex-shrink-0" />

        <EmergencyAlert />
      </div>
    </div>
  )
}

function PatientHealthSummary({ patient }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Care Plan & Health Summary</h3>
          <p className="text-xs text-gray-500">Summary of current medical observations and next steps.</p>
        </div>
        <span className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          Status: Responding Well
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-600" />
            Key Clinical Points
          </p>
          <ul className="space-y-1 text-gray-600 list-disc list-inside">
            <li>NIHSS score improved from 8 to 3 since admission</li>
            <li>No hemorrhagic transformation on follow-up CT</li>
            <li>Blood pressure remains within target range</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-600" />
            Upcoming Activities
          </p>
          <ul className="space-y-1 text-gray-600 list-disc list-inside">
            <li>Oct 28: Neurology Follow-up with Dr. Nair</li>
            <li>Nov 07: Speech Therapy Session</li>
            <li>Nov 15: Repeat Carotid Doppler Ultrasound</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <FileText size={14} className="text-gray-600" />
            Care Team Instructions
          </p>
          <p className="text-gray-600 leading-relaxed">
            Continue Clopidogrel 75mg and Atorvastatin 40mg daily. Attend all scheduled rehabilitation sessions and monitor blood pressure twice daily.
          </p>
        </div>
      </div>
    </div>
  )
}
