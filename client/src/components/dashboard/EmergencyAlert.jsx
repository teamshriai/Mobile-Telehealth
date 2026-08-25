import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Circle, Siren, MapPin, Ambulance,
  Building2, Activity, Pencil, WifiOff, Users,
} from 'lucide-react'
import Modal from '../common/Modal.jsx'
import Button from '../common/Button.jsx'
import { mockPatient, emergencyContacts } from '../../data/mockPatients.js'

const FAST_CHECKLIST = [
  { key: 'face',    label: 'Face drooping',        hint: 'One side of the face droops or feels numb' },
  { key: 'arm',     label: 'Arm weakness',         hint: 'One arm drifts downward when raised' },
  { key: 'speech',  label: 'Speech difficulty',    hint: 'Speech is slurred or hard to understand' },
  { key: 'balance', label: 'Sudden loss of balance', hint: 'Sudden dizziness or loss of coordination' },
  { key: 'eyes',    label: 'Sudden vision trouble', hint: 'Sudden trouble seeing in one or both eyes' },
]

const ONSET_OPTIONS = [
  { key: 'now', label: 'Just now' },
  { key: '15m', label: '15 min ago' },
  { key: '1h',  label: '1 hr+ ago' },
  { key: 'custom', label: 'Custom' },
]

const STAGES = [
  { key: 'dispatched',      label: 'Alert Received',       icon: Siren,      detail: 'Nearest ambulance is being dispatched to your location.' },
  { key: 'en-route',        label: 'Ambulance En Route',    icon: MapPin,     detail: 'Ambulance is on the way to you.' },
  { key: 'arrived',         label: 'Ambulance Arrived',     icon: Ambulance,  detail: 'Crew is on scene providing initial care.' },
  { key: 'transport-to-lab',label: 'Transport to Scan Lab', icon: Building2,  detail: 'En route to the nearest partnered scan lab.' },
  { key: 'scanning',        label: 'Scanning',              icon: Activity,   detail: 'CT/MRI in progress — AI analysis and radiologist review running in parallel.' },
  { key: 'decision-ready',  label: 'Treatment Decision Ready', icon: CheckCircle2, detail: 'Care team has a treatment plan ready.' },
  { key: 'arriving-at-hub', label: 'Arriving at Hospital',  icon: Building2,  detail: 'Hospital has been pre-notified and is ready to receive you.' },
]

const ETA_START_SECONDS = 8 * 60

function formatEta(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Small, always-visible reminder that this is a preview flow, not a live dispatch. */
export function SafetyDisclaimer({ className = '' }) {
  return (
    <p className={`text-[11px] leading-snug ${className}`}>
      For a real emergency, call your local emergency number immediately. This is a preview of an upcoming Stroke AI feature.
    </p>
  )
}

export default function EmergencyAlert() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('checklist') // 'checklist' | 'queued' | 'status'
  const [checked, setChecked] = useState({})
  const [bystander, setBystander] = useState(false)
  const [onset, setOnset] = useState('now')
  const [customOnset, setCustomOnset] = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [location, setLocation] = useState(mockPatient.personalInfo.address)
  const [activeStage, setActiveStage] = useState(0)
  const [eta, setEta] = useState(ETA_START_SECONDS)

  const stageTimerRef = useRef(null)
  const etaTimerRef = useRef(null)

  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }))

  const clearTimers = () => {
    clearInterval(stageTimerRef.current)
    clearInterval(etaTimerRef.current)
  }

  const startStatusFlow = () => {
    setStep('status')
    setActiveStage(0)
    setEta(ETA_START_SECONDS)

    stageTimerRef.current = setInterval(() => {
      setActiveStage((i) => {
        if (i >= STAGES.length - 1) {
          clearInterval(stageTimerRef.current)
          return i
        }
        return i + 1
      })
    }, 3200)

    etaTimerRef.current = setInterval(() => {
      setEta((s) => {
        if (s <= 0) {
          clearInterval(etaTimerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const handleSendAlert = () => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (!isOnline) {
      setStep('queued')
      return
    }
    startStatusFlow()
  }

  const closeAndReset = () => {
    setOpen(false)
    clearTimers()
    setTimeout(() => {
      setStep('checklist')
      setChecked({})
      setBystander(false)
      setOnset('now')
      setCustomOnset('')
      setEditingLocation(false)
      setActiveStage(0)
      setEta(ETA_START_SECONDS)
    }, 250)
  }

  useEffect(() => () => clearTimers(), [])

  const notifiedNames = emergencyContacts.map((c) => c.name).join(', ')
  const subjectPossessive = bystander ? "their" : "your"

  const titles = {
    checklist: 'Quick symptom check (FAST/BEFAST)',
    queued: 'Alert queued',
    status: 'Case status — preview',
  }
  const subtitles = {
    checklist: 'Check anything you or someone nearby is experiencing right now.',
    queued: "You're offline — this will send automatically once you're reconnected.",
    status: 'This is a demonstration of the upcoming live tracking experience.',
  }

  return (
    <>
      <div className="flex flex-col items-start lg:items-end gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 rounded-xl bg-[#DC2626] px-5 py-3.5 text-white
                     shadow-[0_4px_20px_0_rgba(220,38,38,0.35)] hover:bg-[#B91C1C]
                     transition-colors duration-200"
        >
          <Siren size={18} />
          <span className="text-sm font-bold tracking-tight">Report Stroke Symptoms</span>
        </motion.button>
        <SafetyDisclaimer className="text-slate-400 max-w-[260px] text-right lg:text-right" />
      </div>

      <Modal
        isOpen={open}
        onClose={closeAndReset}
        title={titles[step]}
        subtitle={subtitles[step]}
        size="md"
        closeable={step !== 'queued'}
        footer={
          step === 'checklist' ? (
            <>
              <Button variant="ghost" size="sm" onClick={closeAndReset}>Cancel</Button>
              <Button variant="danger" size="sm" icon={<Siren size={13} />} onClick={handleSendAlert}>
                Send Alert
              </Button>
            </>
          ) : step === 'queued' ? (
            <>
              <Button variant="ghost" size="sm" onClick={closeAndReset}>Close</Button>
              <Button variant="danger" size="sm" icon={<Siren size={13} />} onClick={handleSendAlert}>
                Retry Now
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={closeAndReset}>Close Preview</Button>
          )
        }
      >
        {step === 'checklist' && (
          <div className="space-y-4">
            {/* Bystander toggle */}
            <div className="flex rounded-xl border border-[#E8EDF2] bg-[#FAFBFC] p-1">
              <button
                type="button"
                onClick={() => setBystander(false)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  !bystander ? 'bg-white text-[#2563EB] shadow-sm border border-[#BFDBFE]' : 'text-[#64748B]'
                }`}
              >
                This is happening to me
              </button>
              <button
                type="button"
                onClick={() => setBystander(true)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  bystander ? 'bg-white text-[#2563EB] shadow-sm border border-[#BFDBFE]' : 'text-[#64748B]'
                }`}
              >
                I'm helping someone else
              </button>
            </div>

            {/* FAST/BEFAST checklist */}
            <div className="space-y-2">
              {FAST_CHECKLIST.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors
                    ${checked[item.key]
                      ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                      : 'border-[#E8EDF2] bg-[#FAFBFC] hover:border-[#CBD5E1]'}`}
                >
                  {checked[item.key]
                    ? <CheckCircle2 size={18} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
                    : <Circle size={18} className="text-[#CBD5E1] flex-shrink-0 mt-0.5" />}
                  <span>
                    <span className="block text-sm font-semibold text-[#0F172A]">{item.label}</span>
                    <span className="block text-xs text-[#64748B]">{item.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Onset time */}
            <div>
              <p className="text-xs font-semibold text-[#0F172A] mb-2">When did symptoms start?</p>
              <div className="flex flex-wrap gap-1.5">
                {ONSET_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setOnset(o.key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      onset === o.key
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                        : 'border-[#E8EDF2] bg-white text-[#64748B] hover:border-[#CBD5E1]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {onset === 'custom' && (
                <input
                  type="time"
                  value={customOnset}
                  onChange={(e) => setCustomOnset(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[#E8EDF2] px-3 py-2 text-sm text-[#0F172A]"
                />
              )}
            </div>

            {/* Location */}
            <div className="rounded-xl border border-[#E8EDF2] bg-[#FAFBFC] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                  <MapPin size={13} className="text-[#2563EB]" /> Location
                </span>
                <button
                  type="button"
                  onClick={() => setEditingLocation((v) => !v)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <Pencil size={11} /> {editingLocation ? 'Done' : 'Edit'}
                </button>
              </div>
              {editingLocation ? (
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-[#E8EDF2] px-3 py-2 text-sm text-[#0F172A]"
                />
              ) : (
                <p className="text-xs text-[#64748B]">{location}</p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3">
              <AlertTriangle size={15} className="text-[#D97706] flex-shrink-0 mt-0.5" />
              <SafetyDisclaimer className="text-[#92400E]" />
            </div>
          </div>
        )}

        {step === 'queued' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
              <WifiOff size={18} className="text-[#D97706] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#92400E] leading-relaxed">
                No connection detected. Your alert for {subjectPossessive} symptoms has been queued locally and will send the instant you're back online.
              </p>
            </div>
            <SafetyDisclaimer className="text-[#64748B]" />
          </div>
        )}

        {step === 'status' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2 text-xs font-semibold text-[#2563EB] w-fit">
              PREVIEW — no real ambulance has been dispatched
            </div>

            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Users size={13} className="text-[#16A34A] flex-shrink-0" />
              <span>Notified: {notifiedNames}</span>
            </div>

            <ol className="space-y-3">
              {STAGES.map((s, i) => {
                const done = i < activeStage
                const active = i === activeStage
                return (
                  <li key={s.key} className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        done || active ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#CBD5E1]'
                      }`}
                    >
                      <s.icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1 pt-1">
                      <span className={`block text-sm font-medium ${active || done ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                        {s.label}
                        {i === 1 && active && (
                          <span className="ml-2 text-[11px] font-semibold text-[#2563EB]">ETA {formatEta(eta)}</span>
                        )}
                      </span>
                      {active && (
                        <span className="block text-xs text-[#64748B] mt-0.5">{s.detail}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </Modal>
    </>
  )
}
