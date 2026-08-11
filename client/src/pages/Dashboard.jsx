import { motion } from 'framer-motion'
import { mockPatient } from '../data/mockPatients.js'
import OverviewCards from '../components/dashboard/OverviewCards.jsx'
import LiquidBiopsyCard from '../components/dashboard/LiquidBiopsyCard.jsx'
import QuickActions from '../components/dashboard/QuickActions.jsx'
import RecentReports from '../components/dashboard/RecentReports.jsx'
import TreatmentProgress from '../components/dashboard/TreatmentProgress.jsx'
import PatientVitals from '../components/dashboard/PatientVitals.jsx'
import AppointmentCard from '../components/dashboard/AppointmentCard.jsx'
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
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* Clean Professional Hero Header */}
      <HeroGreeting
        greeting={greeting}
        firstName={firstName}
        patient={patient}
      />

      {/* Primary Key Metric Cards */}
      <OverviewCards patient={patient} />

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <LiquidBiopsyCard />
          <TreatmentProgress patient={patient} />
          <RecentReports />
        </div>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
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

function HeroGreeting({ greeting, firstName, patient }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-white">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            {greeting}, {firstName}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Patient Telehealth Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Welcome to your healthcare portal. Manage your upcoming consultations, health records, and treatment updates easily in one place.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-left min-w-[140px]">
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Treatment Plan</span>
            <span className="text-base font-bold text-white mt-0.5 block">Cycle {patient.treatment.cycle} / 18</span>
            <span className="text-[11px] text-emerald-400 font-medium">On Schedule</span>
          </div>

          <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-left min-w-[140px]">
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Next Doctor Visit</span>
            <span className="text-base font-bold text-white mt-0.5 block">Oct 28, 2024</span>
            <span className="text-[11px] text-blue-400 font-medium">Dr. Priya Nair</span>
          </div>
        </div>
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
            <li>ctDNA levels reduced by 47% from peak</li>
            <li>No secondary resistance mutations detected</li>
            <li>Vital signs remain stable</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-600" />
            Upcoming Activities
          </p>
          <ul className="space-y-1 text-gray-600 list-disc list-inside">
            <li>Oct 28: Oncology Follow-up with Dr. Nair</li>
            <li>Nov 07: Cycle 13 Blood Collection</li>
            <li>Nov 15: Treatment Response Review</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <FileText size={14} className="text-gray-600" />
            Care Team Instructions
          </p>
          <p className="text-gray-600 leading-relaxed">
            Continue Osimertinib 80mg daily. Hydrate freely and bring updated symptom log to your next appointment.
          </p>
        </div>
      </div>
    </div>
  )
}
