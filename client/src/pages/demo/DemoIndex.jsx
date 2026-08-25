import { Link } from 'react-router-dom'
import {
  Siren, Radio, Ambulance, Building2, Brain, Landmark, Video, ArrowRight, ArrowLeft,
} from 'lucide-react'
import BrandMark from '../../components/common/BrandMark.jsx'
import { ACCENTS } from '../../components/demo/DemoLayout.jsx'

const ROLES = [
  {
    path: '/demo/command-centre',
    icon: Radio,
    accent: 'blue',
    name: 'Command Centre',
    tagline: 'The hub — live cases, dispatch, and the Golden Window at a glance.',
  },
  {
    path: '/demo/ambulance',
    icon: Ambulance,
    accent: 'blue',
    name: 'Ambulance Crew',
    tagline: 'Tier 1 partnered ambulance and the Stroke AI ambulance, dispatched together.',
  },
  {
    path: '/demo/scan-lab',
    icon: Building2,
    accent: 'blue',
    name: 'Scan Lab',
    tagline: 'The case appears on the worklist the instant it is dispatched.',
  },
  {
    path: '/demo/ai-radiologist',
    icon: Brain,
    accent: 'purple',
    name: 'AI + Radiologist',
    tagline: 'AI inference and the radiologist read every scan in parallel.',
  },
  {
    path: '/demo/hospital-hub',
    icon: Landmark,
    accent: 'green',
    name: 'Hospital Hub',
    tagline: 'The case file is ready before the patient walks in.',
  },
  {
    path: '/demo/telehealth',
    icon: Video,
    accent: 'blue',
    name: 'Telehealth · Mobile AI Doctor',
    tagline: 'Doctor, ambulance, and neurologist in one live consultation.',
  },
]

const FLOW = ['Patient / Bystander', 'Command Centre', 'Ambulance + Scan Lab + Mobile AI Doctor', 'AI + Radiologist', 'Hospital Hub']

export default function DemoIndex() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <header className="border-b border-[#E8EDF2] bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 sm:px-6 py-4">
          <BrandMark size={16} />
          <span className="text-sm font-bold text-[#0F172A] tracking-tight">Stroke AI</span>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-sm font-semibold text-[#64748B]">Platform Preview</span>
          <Link
            to="/landing"
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            <ArrowLeft size={13} /> Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10 space-y-10">
        {/* Intro */}
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-semibold text-[#2563EB]">
            <Siren size={12} /> Hub-and-Spoke Stroke Response Network
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            One platform. Every role. One Golden Hour.
          </h1>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Stroke AI coordinates the patient, the ambulance crews, the scan lab, AI &amp; radiologist review, and the
            receiving hospital as one connected system — the Command Centre is the hub; everything below is a spoke.
            These previews show each role's experience. They're frontend-only demonstrations, not connected to any
            live system.
          </p>
        </div>

        {/* Flow strip */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8EDF2] bg-white p-4">
          {FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-lg bg-[#F8FAFC] border border-[#E8EDF2] px-3 py-1.5 text-xs font-semibold text-[#0F172A]">
                {step}
              </span>
              {i < FLOW.length - 1 && <ArrowRight size={14} className="text-[#CBD5E1] flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Role grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((role) => {
            const a = ACCENTS[role.accent]
            return (
              <Link
                key={role.path}
                to={role.path}
                className="group flex flex-col gap-3 rounded-xl border border-[#E8EDF2] bg-white p-5 transition-colors hover:border-[#BFDBFE] hover:bg-[#FAFBFC]"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: a.bg, color: a.color }}
                >
                  <role.icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#0F172A]">{role.name}</p>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{role.tagline}</p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#2563EB] group-hover:text-[#1D4ED8]">
                  View preview <ArrowRight size={13} />
                </span>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
