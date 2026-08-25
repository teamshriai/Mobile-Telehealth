import { useState } from 'react'
import {
  Brain,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  Target,
  Clock,
  ShieldAlert,
  FileCheck,
  ScanLine,
  ArrowRight,
  ArrowDown,
  Activity,
  FileText,
  Layers,
} from 'lucide-react'
import DemoLayout from '../../components/demo/DemoLayout.jsx'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'

/* ---------------------------------------------------------------------- */
/* Mock data                                                               */
/* ---------------------------------------------------------------------- */

const AI_FINDING = {
  confidence: 94,
  label: 'LVO detected — Left MCA (M1 segment)',
  model: 'StrokeVision Model v2.3.1',
  time: '<2 min',
}

const RADIOLOGIST = {
  name: 'Dr. Meera Anand',
  findings: [
    'Left MCA occlusion confirmed',
    'No hemorrhagic transformation',
    'ASPECTS 8',
  ],
}

/* ---------------------------------------------------------------------- */
/* Small building blocks                                                  */
/* ---------------------------------------------------------------------- */

function FlowConnector({ vertical = true, label }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center py-1.5">
        <div className="h-6 w-px bg-[#CBD5E1]" />
        <ArrowDown size={16} className="text-[#94A3B8] -my-1" />
        {label && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            {label}
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center px-1.5">
      <div className="w-6 h-px bg-[#CBD5E1]" />
      <ArrowRight size={16} className="text-[#94A3B8] -mx-1" />
    </div>
  )
}

function FlowNode({ icon: Icon, title, subtitle, tone = 'neutral', children }) {
  const TONES = {
    neutral: { border: '#E8EDF2', bg: '#FFFFFF', iconBg: '#F1F5F9', iconColor: '#334155' },
    blue: { border: '#BFDBFE', bg: '#FFFFFF', iconBg: '#EFF6FF', iconColor: '#2563EB' },
    purple: { border: '#DDD6FE', bg: '#FFFFFF', iconBg: '#EDE9FE', iconColor: '#7C3AED' },
  }
  const t = TONES[tone] || TONES.neutral
  return (
    <div
      className="rounded-xl border px-4 py-3 text-center shadow-[0_1px_2px_0_rgba(15,23,42,0.03)]"
      style={{ borderColor: t.border, background: t.bg }}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
          style={{ background: t.iconBg, color: t.iconColor }}
        >
          <Icon size={15} />
        </span>
        <span className="text-sm font-bold text-[#0F172A]">{title}</span>
      </div>
      {subtitle && <p className="mt-1 text-[11px] text-[#64748B]">{subtitle}</p>}
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/* Main page                                                               */
/* ---------------------------------------------------------------------- */

export default function AiRadiologist() {
  const [pathway, setPathway] = useState('no-bleed') // 'no-bleed' | 'bleed'
  const [signedOff, setSignedOff] = useState(false)

  return (
    <DemoLayout role="AI + Radiologist" accent="purple">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          AI-Guided Clinical Decision Flow
        </h1>
        <p className="mt-1 text-sm text-[#64748B] max-w-2xl">
          AI and the radiologist read every scan in parallel — the plan is ready
          before the patient arrives.
        </p>
      </div>

      {/* Pathway toggle */}
      <Card variant="ghost" padding="sm" className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] pl-1 pr-1">
          Simulate CT result:
        </span>
        <button
          onClick={() => setPathway('no-bleed')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
            pathway === 'no-bleed'
              ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]'
              : 'bg-white text-[#64748B] border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          No bleed detected — show AI + Radiologist path
        </button>
        <button
          onClick={() => setPathway('bleed')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
            pathway === 'bleed'
              ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
              : 'bg-white text-[#64748B] border-[#E8EDF2] hover:bg-[#F8FAFC]'
          }`}
        >
          Bleed detected — show Hemorrhagic Pathway
        </button>
      </Card>

      {/* Decision flow */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col items-center">
          {/* Step 1: CT Scan */}
          <div className="w-full max-w-xs">
            <FlowNode icon={ScanLine} title="CT Scan (NCCT)" subtitle="First line imaging" tone="neutral" />
          </div>

          <FlowConnector />

          {/* Step 2: Bleed decision */}
          <div className="w-full max-w-xs">
            <FlowNode icon={AlertTriangle} title="Bleed detected?" subtitle="Non-contrast CT read" tone="neutral" />
          </div>

          <FlowConnector label={pathway === 'bleed' ? 'YES' : 'NO'} />

          {pathway === 'bleed' ? (
            /* -------------------- Hemorrhagic pathway -------------------- */
            <div className="w-full max-w-md">
              <div className="rounded-xl border-2 border-[#FECACA] bg-[#FEE2E2] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white flex-shrink-0 text-[#DC2626]">
                    <Droplet size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">Hemorrhagic Pathway</p>
                    <StatusBadge variant="danger" size="xs" dot pulse>
                      Flagged to neurologist immediately
                    </StatusBadge>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#7F1D1D] leading-relaxed">
                  Thrombolysis is contraindicated. The AI/CTA-LVO pathway is skipped —
                  the case routes straight to the on-call neurologist for hemorrhage
                  management, bypassing the parallel imaging-review flow below.
                </p>
              </div>
            </div>
          ) : (
            /* -------------------- No-bleed / LVO pathway -------------------- */
            <>
              <div className="w-full max-w-xs">
                <FlowNode icon={Target} title="CTA — Find LVO" subtitle="Localise the blockage" tone="neutral" />
              </div>

              <FlowConnector />

              <div className="flex items-center gap-2 mb-2">
                <span className="h-px w-8 bg-[#DDD6FE]" />
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#7C3AED]">
                  <Layers size={12} /> Running in parallel
                </span>
                <span className="h-px w-8 bg-[#DDD6FE]" />
              </div>

              {/* Parallel boxes */}
              <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* AI Inference */}
                <Card
                  variant="bordered"
                  padding="md"
                  radius="md"
                  style={{ borderColor: '#DDD6FE', background: '#FBFAFF' }}
                  className="flex flex-col"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex-shrink-0">
                      <Brain size={16} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">AI Inference</p>
                      <p className="text-[11px] text-[#64748B]">Automated LVO detection</p>
                    </div>
                    <StatusBadge variant="purple" size="xs" dot pulse>
                      {AI_FINDING.time}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#EDE9FE] border border-[#DDD6FE] px-3 py-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-[#7C3AED]">{AI_FINDING.confidence}%</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7C3AED]/80">
                        confidence
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[#0F172A]">{AI_FINDING.label}</p>
                  </div>

                  {/* Heatmap overlay placeholder */}
                  <div className="mt-3 relative overflow-hidden rounded-lg border border-[#DDD6FE] bg-[#0F172A] h-20 flex items-center justify-center">
                    <div
                      className="absolute inset-0 opacity-70"
                      style={{
                        background:
                          'radial-gradient(circle at 32% 45%, rgba(124,58,237,0.9) 0%, rgba(124,58,237,0.35) 28%, transparent 55%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.4) 0%, transparent 40%)',
                      }}
                    />
                    <span className="relative z-10 text-[10px] font-semibold uppercase tracking-wide text-white/90 bg-black/30 px-2 py-1 rounded">
                      Heatmap overlay — explainability
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="inline-flex items-center gap-1">
                      <Activity size={12} /> {AI_FINDING.model}
                    </span>
                  </div>
                </Card>

                {/* Radiologist Review */}
                <Card
                  variant="bordered"
                  padding="md"
                  radius="md"
                  style={{ borderColor: '#BFDBFE', background: '#F9FBFF' }}
                  className="flex flex-col"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] flex-shrink-0">
                      <Stethoscope size={16} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">Radiologist Review</p>
                      <p className="text-[11px] text-[#64748B]">Worklist — priority: stroke</p>
                    </div>
                    {signedOff ? (
                      <StatusBadge variant="success" size="xs" dot>
                        Signed
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="info" size="xs" dot pulse>
                        In progress
                      </StatusBadge>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2.5">
                    <p className="text-xs font-semibold text-[#0F172A]">
                      {RADIOLOGIST.name} reviewing
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {RADIOLOGIST.findings.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-[#334155]">
                          <FileText size={12} className="mt-0.5 text-[#2563EB] flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 flex-1 flex items-end">
                    {signedOff ? (
                      <div className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] text-xs font-semibold px-3 py-2">
                        <CheckCircle2 size={14} /> Report signed off
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        icon={<FileCheck size={14} />}
                        onClick={() => setSignedOff(true)}
                      >
                        Sign off
                      </Button>
                    )}
                  </div>
                </Card>
              </div>

              <FlowConnector />

              {/* Treatment decision */}
              <div className="w-full max-w-md">
                <div className="rounded-xl border-2 border-[#BBF7D0] bg-[#DCFCE7] px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#16A34A] flex-shrink-0">
                      <CheckCircle2 size={16} />
                    </span>
                    <p className="text-sm font-bold text-[#0F172A]">Treatment Decision</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#15803D]">
                    tPA + Thrombectomy recommended
                  </p>
                  <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/70 border border-[#BBF7D0] px-3 py-2 text-left">
                    <ShieldAlert size={14} className="mt-0.5 text-[#16A34A] flex-shrink-0" />
                    <p className="text-[11px] leading-relaxed text-[#14532D]">
                      <span className="font-bold">AI output is decision-support only</span> —
                      final decision made by the clinical team.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Closing line */}
      <div className="flex items-center gap-2 text-sm text-[#64748B] justify-center text-center">
        <Clock size={14} className="text-[#94A3B8] flex-shrink-0" />
        <p>
          Because AI and radiologist review run in parallel rather than sequentially,
          the treatment plan is ready before the patient reaches the hospital.
        </p>
      </div>
    </DemoLayout>
  )
}
