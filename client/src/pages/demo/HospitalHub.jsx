import { useEffect, useState } from 'react'
import {
  Clock,
  Activity,
  CheckCircle2,
  FileText,
  TrendingDown,
  BedDouble,
  Scan,
  Pill,
  Zap,
  Users,
  HeartPulse,
} from 'lucide-react'
import DemoLayout from '../../components/demo/DemoLayout.jsx'
import Card from '../../components/common/Card.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'

/* ---------------------------------------------------------------- */
/*  Mock data                                                        */
/* ---------------------------------------------------------------- */

const CASE_TIMING = {
  onset: '10:41 AM',
  alert: '10:42 AM',
  status: 'Arriving',
}

const VITALS = [
  { t: '10:44 AM', bp: '178/102', hr: 96 },
  { t: '10:49 AM', bp: '164/94', hr: 88 },
  { t: '10:54 AM', bp: '151/88', hr: 81 },
  { t: '10:58 AM', bp: '142/86', hr: 76 },
]

const RESOURCES = [
  { name: 'Stroke Unit — Bed 4', detail: 'Ready', variant: 'success', icon: BedDouble },
  { name: 'CT / Angio Suite', detail: 'Ready', variant: 'success', icon: Scan },
  { name: 'Neuro-Interventional Team', detail: 'Notified, en route', variant: 'warning', icon: Users },
  { name: 'Pharmacy — tPA Stock', detail: 'Confirmed', variant: 'success', icon: Pill },
]

/* ---------------------------------------------------------------- */
/*  Component                                                        */
/* ---------------------------------------------------------------- */

export default function HospitalHub() {
  const [secondsLeft, setSecondsLeft] = useState(6 * 60)

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <DemoLayout role="Hospital Hub" accent="green">
      {/* ---------------------------------------------------------- */}
      {/* Hero banner                                                  */}
      {/* ---------------------------------------------------------- */}
      <Card
        variant="default"
        padding="lg"
        className="border-[#BBF7D0]"
        style={{ background: 'linear-gradient(160deg, #F0FDF4 0%, #DCFCE7 100%)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-[#BBF7D0] shadow-sm">
              <span className="absolute inline-flex h-full w-full rounded-2xl bg-[#16A34A] opacity-10 animate-ping" />
              <div className="relative text-center">
                <p className="text-2xl font-bold text-[#16A34A] leading-none tabular-nums">
                  {mins}:{String(secs).padStart(2, '0')}
                </p>
                <p className="text-[9px] font-semibold text-[#16A34A]/70 uppercase tracking-wider mt-1">
                  min ETA
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge variant="success" size="sm" dot pulse>
                Incoming Stroke Case
              </StatusBadge>
              <StatusBadge variant="muted" size="sm">Case #SA-2418</StatusBadge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight leading-snug">
              Patient ETA: {mins} minutes — Bed 4 (Stroke Unit) prepared and notified.
            </h1>
            <p className="text-sm text-[#3F6B52] mt-2">
              This case file was fully prepared before the patient arrived — nothing needed to be re-entered.
            </p>
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------- */}
      {/* Pre-populated case file                                      */}
      {/* ---------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient & Timing + Vitals */}
        <Card padding="lg">
          <h2 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-[#16A34A]" />
            Patient &amp; Timing
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <InfoTile label="Symptom Onset" value={CASE_TIMING.onset} />
            <InfoTile label="Alert Received" value={CASE_TIMING.alert} />
            <InfoTile
              label="Current Status"
              value={CASE_TIMING.status}
              valueClassName="text-[#2563EB]"
            />
          </div>

          <div className="pt-4 border-t border-[#E8EDF2]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Activity size={14} className="text-[#16A34A]" />
                Vitals Trend — Stabilizing
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                <TrendingDown size={12} />
                BP trending down
              </span>
            </div>
            <VitalsSparkline data={VITALS} />
            <div className="grid grid-cols-4 gap-2 mt-3">
              {VITALS.map((v) => (
                <div key={v.t} className="text-center rounded-lg bg-[#F8FAFC] border border-[#E8EDF2] py-2">
                  <p className="text-[10px] text-[#94A3B8] font-medium">{v.t}</p>
                  <p className="text-xs font-bold text-[#0F172A] mt-0.5">{v.bp}</p>
                  <p className="text-[10px] text-[#64748B]">{v.hr} bpm</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Imaging & Findings + Treatment Decision */}
        <Card padding="lg">
          <h2 className="text-sm font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <FileText size={16} className="text-[#16A34A]" />
            Imaging &amp; Findings
          </h2>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-20 h-20 rounded-xl border border-[#E8EDF2] bg-[#F8FAFC] flex flex-col items-center justify-center gap-1">
              <Scan size={22} className="text-[#94A3B8]" />
              <span className="text-[9px] font-semibold text-[#94A3B8] text-center leading-tight px-1">
                CTA — Head &amp; Neck
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <StatusBadge variant="purple" size="xs">AI + Radiologist</StatusBadge>
                <StatusBadge variant="danger" size="xs">Large Vessel Occlusion</StatusBadge>
              </div>
              <p className="text-sm text-[#0F172A] leading-snug">
                <span className="font-bold">Left MCA occlusion</span> confirmed by AI
                (<span className="font-semibold text-[#7C3AED]">94% confidence</span>) and signed off by
                on-call radiologist.
              </p>
              <p className="text-xs text-[#64748B] mt-1.5">Reviewed and finalized at 10:52 AM.</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E8EDF2]">
            <h3 className="text-xs font-bold text-[#0F172A] mb-2.5 flex items-center gap-1.5">
              <Zap size={14} className="text-[#16A34A]" />
              Treatment Decision — En Route
            </h3>
            <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-3.5">
              <div className="flex items-start gap-2.5">
                <Pill size={16} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] leading-snug">
                    IV tPA administered en route + Mechanical Thrombectomy recommended on arrival
                  </p>
                  <div className="mt-2">
                    <StatusBadge variant="success" size="sm" dot>
                      <CheckCircle2 size={11} className="mr-0.5" />
                      Ready for immediate intervention
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Hospital resource notification status                       */}
      {/* ---------------------------------------------------------- */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <HeartPulse size={16} className="text-[#16A34A]" />
            Hospital Resources Notified
          </h2>
          <span className="text-[11px] text-[#94A3B8]">Synced to ambulance ETA · updates automatically</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RESOURCES.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.name}
                className="flex items-center gap-3 rounded-xl border border-[#E8EDF2] bg-[#F8FAFC] p-3"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-[#E8EDF2] flex items-center justify-center">
                  <Icon size={16} className="text-[#64748B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#0F172A] truncate">{r.name}</p>
                  <StatusBadge variant={r.variant} size="xs" dot className="mt-1">
                    {r.detail}
                  </StatusBadge>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <p className="text-xs text-[#94A3B8] text-center pt-2">
        All case data on this page is simulated for demonstration purposes.
      </p>
    </DemoLayout>
  )
}

/* ---------------------------------------------------------------- */
/*  Subcomponents                                                     */
/* ---------------------------------------------------------------- */

function InfoTile({ label, value, valueClassName = 'text-[#0F172A]' }) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] border border-[#E8EDF2] px-3 py-2.5">
      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-1 ${valueClassName}`}>{value}</p>
    </div>
  )
}

function VitalsSparkline({ data }) {
  const width = 300
  const height = 56
  const padX = 8
  const padY = 8

  if (!data || data.length === 0) return null

  const hrValues = data.map((d) => d.hr)
  const min = Math.min(...hrValues)
  const max = Math.max(...hrValues)
  const range = max - min || 1
  // Guard against a single-point series, where length - 1 would divide by zero.
  const denominator = data.length > 1 ? data.length - 1 : 1

  const points = data.map((d, i) => {
    const x = padX + (i / denominator) * (width - padX * 2)
    const y = padY + (1 - (d.hr - min) / range) * (height - padY * 2)
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-14"
      preserveAspectRatio="none"
      role="img"
      aria-label="Heart rate trend across recent vitals readings"
    >
      <path d={areaPath} fill="#DCFCE7" opacity="0.7" />
      <path d={linePath} fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#16A34A" />
      ))}
    </svg>
  )
}
