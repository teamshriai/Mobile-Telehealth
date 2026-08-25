import { useState } from 'react'
import DemoLayout from '../../components/demo/DemoLayout.jsx'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import {
  Ambulance as AmbulanceIcon,
  MapPin,
  Navigation,
  HeartPulse,
  Pill,
  CheckCircle2,
  Circle,
  Clock,
  Radio,
  Activity,
  Users,
  Droplet,
  Gauge,
  Timer,
  Truck,
  Syringe,
  Scale,
  Brain,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CASE_REF = 'SA-2418'

const MILESTONES = [
  { key: 'en-route', label: 'En Route' },
  { key: 'at-patient', label: 'At Patient' },
  { key: 'onboard', label: 'Onboard' },
  { key: 'to-lab', label: 'To Lab' },
  { key: 'at-lab', label: 'At Lab' },
  { key: 'handed-off', label: 'Handed Off' },
]
const CURRENT_MILESTONE_INDEX = 2 // "Onboard"

const TIER1 = {
  unit: 'Unit PA-07',
  tier: 'Partnered Ambulance',
  crew: ['Ravi Kumar (Driver)', 'S. Meenakshi (EMT)'],
  destination: 'En route to Scan Lab — Coimbatore Diagnostics',
  vitals: [
    { label: 'Blood Pressure', value: '162 / 94', unit: 'mmHg', icon: Activity, tone: 'warning' },
    { label: 'SpO₂', value: '96', unit: '%', icon: Droplet, tone: 'success' },
    { label: 'Glucose', value: '118', unit: 'mg/dL', icon: Gauge, tone: 'success' },
    { label: 'GCS', value: '14', unit: '/ 15', icon: Brain, tone: 'warning' },
  ],
}

const TIER2 = {
  unit: 'Unit SA-03',
  tier: 'Stroke AI Ambulance',
  crew: ['A. Balamurugan (Driver)', 'Dr. Priya N. (Onboard Paramedic)'],
  destination: 'En route to patient — rendezvous with Tier 1',
}

const PROTOCOL = {
  name: 'Alteplase (tPA)',
  dose: '0.9 mg/kg — 10% bolus over 1 min, then infusion over 60 min',
  receivedAt: '10:42 AM',
  from: 'Mobile AI Doctor',
}

const CHECKLIST_STEPS = [
  { id: 'weight', label: 'Confirm patient weight', icon: Scale },
  { id: 'bolus-prep', label: 'Prepare bolus dose', icon: Syringe },
  { id: 'bolus-admin', label: 'Administer bolus', icon: Pill },
  { id: 'infusion', label: 'Start infusion pump', icon: Timer },
]

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function TierToggle({ activeTier, onChange }) {
  return (
    <div className="flex flex-col sm:inline-flex sm:flex-row w-full sm:w-auto rounded-xl border border-[#E8EDF2] bg-[#F1F5F9] p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
          activeTier === 1
            ? 'bg-white text-[#2563EB] shadow-[0_1px_3px_0_rgba(15,23,42,0.08)]'
            : 'text-[#64748B] hover:text-[#0F172A]'
        }`}
      >
        <Truck size={15} className="flex-shrink-0" />
        <span className="sm:hidden">Tier 1</span>
        <span className="hidden sm:inline">Tier 1 — Partnered Ambulance</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(2)}
        className={`flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
          activeTier === 2
            ? 'bg-white text-[#2563EB] shadow-[0_1px_3px_0_rgba(15,23,42,0.08)]'
            : 'text-[#64748B] hover:text-[#0F172A]'
        }`}
      >
        <AmbulanceIcon size={15} className="flex-shrink-0" />
        <span className="sm:hidden">Tier 2</span>
        <span className="hidden sm:inline">Tier 2 — Stroke AI Ambulance</span>
      </button>
    </div>
  )
}

function DispatchInfoCard({ unit, tier, crew, destination, badge }) {
  return (
    <Card variant="default" padding="lg" radius="md">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <AmbulanceIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#0F172A]">{unit}</h3>
              <StatusBadge variant="muted" size="xs">{tier}</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">{crew.join(' · ')}</p>
          </div>
        </div>
        <StatusBadge variant="success" size="sm" dot pulse>Active</StatusBadge>
      </div>

      {badge && (
        <div className="mt-3">
          <StatusBadge variant="primary" size="xs" dot>{badge}</StatusBadge>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F8FAFC] border border-[#E8EDF2] px-3 py-2.5">
        <Navigation size={15} className="flex-shrink-0 text-[#2563EB]" />
        <span className="text-xs font-medium text-[#0F172A]">{destination}</span>
      </div>
    </Card>
  )
}

function MilestoneStepper() {
  return (
    <Card variant="default" padding="lg" radius="md">
      <h3 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
        <MapPin size={15} className="text-[#2563EB]" />
        Transport Milestones
      </h3>
      <div className="flex items-start">
        {MILESTONES.map((m, i) => {
          const done = i < CURRENT_MILESTONE_INDEX
          const current = i === CURRENT_MILESTONE_INDEX
          const isLast = i === MILESTONES.length - 1
          return (
            <div key={m.key} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center gap-1.5 min-w-[40px] sm:min-w-[64px]">
                <div
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                    done
                      ? 'bg-[#16A34A] border-[#16A34A] text-white'
                      : current
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-white border-[#E8EDF2] text-[#94A3B8]'
                  }`}
                >
                  {done ? <CheckCircle2 size={16} /> : <Circle size={12} className={current ? 'fill-white' : ''} />}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold text-center leading-tight ${
                    current ? 'text-[#2563EB]' : done ? 'text-[#16A34A]' : 'text-[#94A3B8]'
                  }`}
                >
                  {m.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 -mt-5 ${done ? 'bg-[#16A34A]' : 'bg-[#E8EDF2]'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function VitalsCard() {
  const toneStyles = {
    success: { bg: '#DCFCE7', color: '#16A34A' },
    warning: { bg: '#FEF3C7', color: '#D97706' },
    danger: { bg: '#FEE2E2', color: '#DC2626' },
  }
  return (
    <Card variant="default" padding="lg" radius="md">
      <h3 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
        <HeartPulse size={15} className="text-[#2563EB]" />
        Vitals Captured En Route
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TIER1.vitals.map((v) => {
          const Icon = v.icon
          const tone = toneStyles[v.tone] || toneStyles.success
          return (
            <div key={v.label} className="rounded-lg border border-[#E8EDF2] bg-[#F8FAFC] p-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg mb-2"
                style={{ background: tone.bg, color: tone.color }}
              >
                <Icon size={14} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">{v.label}</p>
              <p className="mt-0.5 text-base font-bold text-[#0F172A]">
                {v.value} <span className="text-[11px] font-medium text-[#64748B]">{v.unit}</span>
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#94A3B8]">Last recorded 2 minutes ago · read-only mock capture</p>
    </Card>
  )
}

function MedicationProtocolCard() {
  return (
    <Card variant="primary" padding="lg" radius="md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] border border-[#BFDBFE]">
          <Pill size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#2563EB]">Medication Protocol</p>
          <h3 className="mt-0.5 text-sm font-bold text-[#0F172A]">{PROTOCOL.name}</h3>
          <p className="mt-1 text-xs text-[#334155]">{PROTOCOL.dose}</p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
            <Radio size={12} className="text-[#2563EB]" />
            Received from {PROTOCOL.from} at {PROTOCOL.receivedAt}
          </div>
        </div>
      </div>
    </Card>
  )
}

function MedicationChecklist() {
  const [checked, setChecked] = useState({})
  const [timestamps, setTimestamps] = useState({})

  const toggle = (id) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      if (next[id] && !timestamps[id]) {
        const now = new Date()
        setTimestamps((t) => ({
          ...t,
          [id]: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
      }
      return next
    })
  }

  const completedCount = CHECKLIST_STEPS.filter((s) => checked[s.id]).length

  return (
    <Card variant="default" padding="lg" radius="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <Syringe size={15} className="text-[#2563EB]" />
          En-Route Medication Checklist
        </h3>
        <StatusBadge variant={completedCount === CHECKLIST_STEPS.length ? 'success' : 'muted'} size="xs">
          {completedCount} / {CHECKLIST_STEPS.length} complete
        </StatusBadge>
      </div>

      <div className="space-y-2">
        {CHECKLIST_STEPS.map((step, i) => {
          const Icon = step.icon
          const isChecked = !!checked[step.id]
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => toggle(step.id)}
              className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                isChecked
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-white border-[#E8EDF2] hover:bg-[#F8FAFC]'
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 ${
                  isChecked ? 'bg-[#16A34A] border-[#16A34A] text-white' : 'border-[#CBD5E1] text-transparent'
                }`}
              >
                <CheckCircle2 size={14} />
              </span>
              <Icon size={15} className={isChecked ? 'text-[#16A34A]' : 'text-[#64748B]'} />
              <span className={`flex-1 text-sm font-medium ${isChecked ? 'text-[#166534] line-through' : 'text-[#0F172A]'}`}>
                Step {i + 1}. {step.label}
              </span>
              {isChecked && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] flex-shrink-0">
                  <Clock size={11} />
                  Signed off — {timestamps[step.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Ambulance() {
  const [activeTier, setActiveTier] = useState(1)
  const [handoffNotesSent, setHandoffNotesSent] = useState(false)

  return (
    <DemoLayout role="Ambulance Crew" accent="blue">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A]">Active Dispatch</h1>
            <StatusBadge variant="danger" size="sm" dot pulse>Live Case</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-[#64748B]">
            Case #{CASE_REF} — same case shown on the Command Centre preview
          </p>
        </div>
      </div>

      {/* Tier toggle + parallel-dispatch explainer */}
      <Card variant="ghost" padding="md" radius="md">
        <div className="flex items-start gap-2 mb-3 text-xs text-[#334155]">
          <Radio size={14} className="mt-0.5 flex-shrink-0 text-[#2563EB]" />
          <p>
            <span className="font-semibold text-[#0F172A]">Both tiers are dispatched in parallel</span> the instant
            the alert is received — Tier 2 does not wait for imaging.
          </p>
        </div>
        <TierToggle activeTier={activeTier} onChange={setActiveTier} />
      </Card>

      {/* Tier 1 */}
      {activeTier === 1 && (
        <div className="space-y-6">
          <DispatchInfoCard
            unit={TIER1.unit}
            tier={TIER1.tier}
            crew={TIER1.crew}
            destination={TIER1.destination}
          />
          <MilestoneStepper />
          <VitalsCard />
        </div>
      )}

      {/* Tier 2 */}
      {activeTier === 2 && (
        <div className="space-y-6">
          <DispatchInfoCard
            unit={TIER2.unit}
            tier={TIER2.tier}
            crew={TIER2.crew}
            destination={TIER2.destination}
            badge="Dispatched simultaneously with Tier 1"
          />
          <MedicationProtocolCard />
          <MedicationChecklist />

          <Card variant="ghost" padding="md" radius="md">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-[#334155]">
                <ChevronRight size={14} className="text-[#2563EB]" />
                <span>Hub pre-alerted on departure from scan lab</span>
              </div>
              <StatusBadge variant="info" size="sm" dot pulse>Auto-alert armed</StatusBadge>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {handoffNotesSent && (
          <span className="text-xs font-medium text-[#16A34A]">Handoff notes sent to the receiving hospital.</span>
        )}
        <Button
          variant="outline"
          size="sm"
          icon={<Users size={14} />}
          onClick={() => setHandoffNotesSent(true)}
          disabled={handoffNotesSent}
        >
          Crew Handoff Notes
        </Button>
      </div>
    </DemoLayout>
  )
}
