import { useState } from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Wifi,
  WifiOff,
  CloudOff,
  Stethoscope,
  Ambulance,
  Brain,
  Pill,
  HeartPulse,
  FileText,
  Activity,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import DemoLayout from '../../components/demo/DemoLayout.jsx'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'

// ---- Static mock data -------------------------------------------------

const PARTICIPANTS = [
  {
    id: 'doctor',
    name: 'Dr. Priya Nair',
    role: 'Vascular Neurologist · On-site',
    initials: 'PN',
    icon: Stethoscope,
    ring: 'ring-blue-500/60',
    badge: 'You',
  },
  {
    id: 'ambulance',
    name: 'Ambulance Crew — Unit SA-03',
    role: 'En route · ETA 4 min',
    initials: 'SA',
    icon: Ambulance,
    ring: 'ring-amber-500/60',
    badge: 'Field',
  },
  {
    id: 'neurologist',
    name: 'Dr. Rajan Mehta',
    role: 'Neurologist (remote) · On call',
    initials: 'RM',
    icon: Brain,
    ring: 'ring-slate-400/60',
    badge: 'Remote',
  },
]

const NETWORK_STATES = [
  {
    id: 'good',
    label: 'Good connection',
    icon: Wifi,
    badgeVariant: 'success',
    description: 'Full video + audio for all 3 participants.',
  },
  {
    id: 'degraded',
    label: 'Degraded — audio only',
    icon: WifiOff,
    badgeVariant: 'warning',
    description: 'Video paused automatically to preserve the audio channel.',
  },
  {
    id: 'store',
    label: 'Store-and-forward — reconnecting',
    icon: CloudOff,
    badgeVariant: 'muted',
    description: 'Messages and vitals are queued locally and will sync once signal returns.',
  },
]

const VITALS = [
  { label: 'BP', value: '168/94', unit: 'mmHg', tone: 'warning' },
  { label: 'HR', value: '92', unit: 'bpm', tone: 'primary' },
  { label: 'SpO2', value: '97', unit: '%', tone: 'success' },
]

const TREATMENT_OPTIONS = [
  { id: 'tpa', label: 'tPA', description: 'IV thrombolysis' },
  { id: 'thrombectomy', label: 'Thrombectomy', description: 'Mechanical clot retrieval' },
  { id: 'conservative', label: 'Conservative Management', description: 'Monitor, no acute intervention' },
]

// ---- Component ----------------------------------------------------------

export default function Telehealth() {
  const [micOn, setMicOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [callActive, setCallActive] = useState(true)
  const [networkState, setNetworkState] = useState('good')
  const [decision, setDecision] = useState(null)

  const activeNetwork = NETWORK_STATES.find((n) => n.id === networkState) || NETWORK_STATES[0]

  return (
    <DemoLayout role="Telehealth · Mobile AI Doctor" accent="blue">
      {/* Page intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Live Consultation — Case #SK-2249</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            3-party video link: on-site physician, ambulance crew, and remote neurologist reviewing one patient in real time.
          </p>
        </div>
        <StatusBadge variant="danger" dot pulse>
          Suspected LVO · Onset 41 min ago
        </StatusBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video call area */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            {/* Network quality selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
                {NETWORK_STATES.map((n) => {
                  const Icon = n.icon
                  const isActive = n.id === networkState
                  return (
                    <button
                      key={n.id}
                      onClick={() => setNetworkState(n.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon size={12} />
                      <span className="hidden md:inline">{n.label}</span>
                    </button>
                  )
                })}
              </div>
              <StatusBadge variant={activeNetwork.badgeVariant} dot pulse={networkState !== 'good'} size="sm">
                {activeNetwork.label}
              </StatusBadge>
            </div>
            <p className="text-[11px] text-slate-500 -mt-2">{activeNetwork.description}</p>

            {/* Video tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PARTICIPANTS.map((p) => {
                const RoleIcon = p.icon
                const showVideo = videoOn && (p.id !== 'ambulance' || networkState !== 'degraded')
                return (
                  <div
                    key={p.id}
                    className="relative aspect-video rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex flex-col"
                  >
                    <div className="flex-1 flex items-center justify-center relative">
                      {showVideo ? (
                        <div
                          className={`w-14 h-14 rounded-full bg-slate-700 ring-2 ${p.ring} flex items-center justify-center text-white text-sm font-bold`}
                        >
                          {p.initials}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-500">
                          <VideoOff size={20} />
                          <span className="text-[10px]">Video off</span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300">
                        <RoleIcon size={10} />
                      </span>
                      {p.id === 'doctor' && !micOn && (
                        <span className="absolute top-2 left-2 p-1 rounded bg-red-600 text-white">
                          <MicOff size={10} />
                        </span>
                      )}
                    </div>
                    <div className="px-2 py-1.5 bg-slate-900/90 border-t border-slate-800">
                      <p className="text-[11px] font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.role}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`p-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors ${
                  micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white'
                }`}
              >
                {micOn ? <Mic size={15} /> : <MicOff size={15} />}
                <span className="hidden sm:inline">{micOn ? 'Mute' : 'Unmute'}</span>
              </button>
              <button
                onClick={() => setVideoOn((v) => !v)}
                className={`p-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors ${
                  videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white'
                }`}
              >
                {videoOn ? <Video size={15} /> : <VideoOff size={15} />}
                <span className="hidden sm:inline">{videoOn ? 'Stop Video' : 'Start Video'}</span>
              </button>
              <button
                onClick={() => setCallActive((v) => !v)}
                className={`px-4 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                  callActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <PhoneOff size={14} />
                <span>{callActive ? 'Leave Call' : 'Rejoin Call'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Merged clinical console */}
        <div className="lg:col-span-5">
          <Card padding="lg" className="h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">Clinical Console</h2>
              <StatusBadge variant="info" size="xs">Single merged view</StatusBadge>
            </div>

            {/* AI findings */}
            <div className="rounded-lg border border-[#DDD6FE] bg-[#EDE9FE]/50 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge variant="purple" size="xs" dot>AI Findings</StatusBadge>
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">Left MCA occlusion</p>
              <p className="text-xs text-[#64748B] mt-0.5">94% confidence · flagged for urgent review 6 min ago</p>
            </div>

            {/* Radiologist report */}
            <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF]/60 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge variant="primary" size="xs" dot>Radiologist Report</StatusBadge>
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">Confirmed — ASPECTS 8</p>
              <p className="text-xs text-[#64748B] mt-0.5">No hemorrhage · Dr. Anjali Rao, Teleradiology</p>
            </div>

            {/* Live vitals */}
            <div className="rounded-lg border border-[#E8EDF2] bg-[#F8FAFC] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                  <HeartPulse size={13} className="text-[#DC2626]" />
                  Live Vitals
                </div>
                <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                  <Activity size={10} /> Live from ambulance
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {VITALS.map((v) => (
                  <div key={v.label} className="rounded-md bg-white border border-[#E8EDF2] px-2 py-1.5 text-center">
                    <p className="text-[10px] text-[#94A3B8] font-medium">{v.label}</p>
                    <p className="text-sm font-bold text-[#0F172A]">
                      {v.value}
                      <span className="text-[10px] font-medium text-[#94A3B8] ml-0.5">{v.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Treatment decision capture */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-[#0F172A]">Treatment Decision</h2>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B]">
            <ShieldCheck size={13} className="text-[#16A34A]" />
            Restricted to credentialed clinician roles
          </span>
        </div>
        <p className="text-xs text-[#64748B] mb-4">
          Selecting an option records the decision and pushes the medication protocol directly to the Stroke AI Ambulance unit.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TREATMENT_OPTIONS.map((opt) => {
            const isSelected = decision === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setDecision(opt.id)}
                className={`text-left rounded-xl border-2 p-3.5 transition-colors ${
                  isSelected
                    ? 'border-[#2563EB] bg-[#EFF6FF]'
                    : 'border-[#E8EDF2] bg-white hover:border-[#93C5FD] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Pill size={14} className={isSelected ? 'text-[#2563EB]' : 'text-[#94A3B8]'} />
                  <span className={`text-sm font-bold ${isSelected ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>
                    {opt.label}
                  </span>
                  {isSelected && <CheckCircle2 size={14} className="text-[#2563EB] ml-auto" />}
                </div>
                <p className="text-xs text-[#64748B]">{opt.description}</p>
              </button>
            )
          })}
        </div>

        {decision && (
          <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-[#DCFCE7]/60 p-3 space-y-1.5">
            <p className="text-sm font-semibold text-[#16A34A] flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              Decision recorded: {TREATMENT_OPTIONS.find((o) => o.id === decision)?.label} — protocol pushed to Stroke AI Ambulance.
            </p>
            <p className="text-xs text-[#0F172A]/80 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#16A34A]" />
              Contraindication check: none found
            </p>
          </div>
        )}

        {!decision && (
          <div className="mt-4 rounded-lg border border-[#FDE68A] bg-[#FEF3C7]/50 p-3">
            <p className="text-xs text-[#D97706] flex items-center gap-1.5">
              <AlertTriangle size={13} />
              Awaiting a treatment decision from the credentialed clinician on this call.
            </p>
          </div>
        )}
      </Card>
    </DemoLayout>
  )
}
