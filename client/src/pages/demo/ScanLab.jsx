import { useState } from 'react'
import DemoLayout from '../../components/demo/DemoLayout.jsx'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import {
  ScanLine,
  Clock,
  CheckCircle2,
  WifiOff,
  Wifi,
  FileImage,
  Building2,
  ChevronRight,
  Circle,
  Info,
} from 'lucide-react'

/* ---------------------------------------------------------------------- */
/* Mock data                                                               */
/* ---------------------------------------------------------------------- */

const MODALITY_STYLE = {
  NCCT: 'muted',
  CTA: 'primary',
  CTP: 'info',
  MRI: 'dark',
  MRA: 'primary',
}

const STATUS_LABEL = {
  'checked-in': 'Checked In',
  'scan-started': 'Scan Started',
  'scan-complete': 'Scan Complete',
  forwarded: 'Forwarded',
}

const STATUS_VARIANT = {
  'checked-in': 'muted',
  'scan-started': 'warning',
  'scan-complete': 'success',
  forwarded: 'primary',
}

const WORKLIST = [
  {
    id: 'CASE-4471',
    patient: 'Anonymous Alert',
    isAnonymous: true,
    modality: 'CTA',
    status: 'checked-in',
    time: '2 min ago',
    isNew: true,
    accession: 'ACC-88291045',
    procedure: 'CT Angiogram — Head & Neck',
    station: 'CT Suite 2 — Scanner B',
  },
  {
    id: 'CASE-4468',
    patient: 'R. Delgado',
    isAnonymous: false,
    modality: 'NCCT',
    status: 'scan-complete',
    time: '11 min ago',
    isNew: false,
    accession: 'ACC-88290991',
    procedure: 'CT Head Without Contrast',
    station: 'CT Suite 1 — Scanner A',
  },
  {
    id: 'CASE-4463',
    patient: 'M. Okafor',
    isAnonymous: false,
    modality: 'CTP',
    status: 'forwarded',
    time: '34 min ago',
    isNew: false,
    accession: 'ACC-88290877',
    procedure: 'CT Perfusion — Head',
    station: 'CT Suite 2 — Scanner B',
  },
  {
    id: 'CASE-4459',
    patient: 'T. Whitfield',
    isAnonymous: false,
    modality: 'MRI',
    status: 'scan-started',
    time: '48 min ago',
    isNew: false,
    accession: 'ACC-88290612',
    procedure: 'MRI Brain w/o Contrast',
    station: 'MRI Suite 1 — Scanner C',
  },
]

const STEPS = ['checked-in', 'scan-started', 'scan-complete', 'forwarded']

/* ---------------------------------------------------------------------- */
/* Component                                                               */
/* ---------------------------------------------------------------------- */

export default function ScanLab() {
  const [selectedId, setSelectedId] = useState(WORKLIST[0].id)
  const [linkOnline, setLinkOnline] = useState(true)

  const selected = WORKLIST.find((c) => c.id === selectedId) || WORKLIST[0]
  const pendingCount = WORKLIST.filter((c) => c.status !== 'forwarded').length
  const currentStepIndex = STEPS.indexOf(selected.status)

  return (
    <DemoLayout role="Scan Lab" accent="blue">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Imaging Worklist</h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Studies routed here automatically as stroke dispatch fans out to partnered imaging.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E8EDF2] bg-white px-3.5 py-2 w-fit">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]" />
          </span>
          <span className="text-sm font-semibold text-[#0F172A]">{pendingCount}</span>
          <span className="text-sm text-[#64748B]">pending studies</span>
        </div>
      </div>

      {/* Worklist table */}
      <Card variant="default" padding="none" radius="md" className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E8EDF2] flex items-center gap-2">
          <ScanLine size={16} className="text-[#2563EB]" />
          <h2 className="text-sm font-bold text-[#0F172A]">Incoming Cases</h2>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[1.2fr_1.4fr_0.8fr_1.1fr_0.7fr_auto] gap-3 px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E8EDF2] text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          <span>Case ID</span>
          <span>Patient</span>
          <span>Modality</span>
          <span>Status</span>
          <span>Time</span>
          <span />
        </div>

        <div className="divide-y divide-[#E8EDF2]">
          {WORKLIST.map((c) => {
            const isSelected = c.id === selectedId
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left grid grid-cols-2 md:grid-cols-[1.2fr_1.4fr_0.8fr_1.1fr_0.7fr_auto] gap-x-3 gap-y-1.5 px-5 py-3.5 transition-colors ${
                  isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#0F172A]">{c.id}</span>
                  {c.isNew && (
                    <StatusBadge variant="danger" size="xs" dot pulse>
                      NEW
                    </StatusBadge>
                  )}
                </div>
                <div className={`text-sm ${c.isAnonymous ? 'italic text-[#64748B]' : 'text-[#0F172A]'} flex items-center`}>
                  {c.patient}
                </div>
                <div className="flex items-center">
                  <StatusBadge variant={MODALITY_STYLE[c.modality]} size="xs">
                    {c.modality}
                  </StatusBadge>
                </div>
                <div className="flex items-center">
                  <StatusBadge variant={STATUS_VARIANT[c.status]} size="sm" dot>
                    {STATUS_LABEL[c.status]}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <Clock size={12} />
                  {c.time}
                </div>
                <div className="hidden md:flex items-center justify-end text-[#94A3B8]">
                  <ChevronRight size={16} />
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Detail panel + stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* DICOM Modality Worklist */}
        <Card variant="default" padding="lg" radius="md" className="lg:col-span-3">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FileImage size={16} className="text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#0F172A]">DICOM Modality Worklist</h2>
            </div>
            <span className="text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] border border-[#E8EDF2] rounded-lg px-2 py-1">
              {selected.id}
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2.5 mb-4">
            <Info size={14} className="text-[#2563EB] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#1D4ED8] leading-relaxed">
              Pre-populated automatically from the dispatch order — no manual entry required at the scanner.
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Patient ID">
              {selected.isAnonymous ? (
                <span className="italic text-[#64748B]">De-identified</span>
              ) : (
                selected.patient
              )}
            </Field>
            <Field label="Accession Number">{selected.accession}</Field>
            <Field label="Requested Procedure" full>
              {selected.procedure}
            </Field>
            <Field label="Scheduled Station">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={13} className="text-[#94A3B8]" />
                {selected.station}
              </span>
            </Field>
            <Field label="Modality">
              <StatusBadge variant={MODALITY_STYLE[selected.modality]} size="xs">
                {selected.modality}
              </StatusBadge>
            </Field>
          </dl>
        </Card>

        {/* Scan status stepper */}
        <Card variant="default" padding="lg" radius="md" className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#0F172A]">Scan Status</h2>
          </div>

          <ol className="space-y-0">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex
              const isCurrent = idx === currentStepIndex
              const isLast = idx === STEPS.length - 1
              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0 ${
                        isDone
                          ? 'bg-[#16A34A] border-[#16A34A] text-white'
                          : isCurrent
                          ? 'bg-white border-[#2563EB] text-[#2563EB]'
                          : 'bg-white border-[#E8EDF2] text-[#CBD5E1]'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Circle size={8} fill="currentColor" />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={`w-0.5 flex-1 min-h-[24px] ${
                          isDone ? 'bg-[#16A34A]' : 'bg-[#E8EDF2]'
                        }`}
                      />
                    )}
                  </div>
                  <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                    <p
                      className={`text-sm font-semibold ${
                        isDone || isCurrent ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                      }`}
                    >
                      {STATUS_LABEL[step]}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[#2563EB] font-medium mt-0.5">In progress</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>

      {/* Store-and-forward toggle */}
      <Card variant="default" padding="lg" radius="md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${
                linkOnline ? 'bg-[#DCFCE7]' : 'bg-[#FEF3C7]'
              }`}
            >
              {linkOnline ? (
                <Wifi size={16} className="text-[#16A34A]" />
              ) : (
                <WifiOff size={16} className="text-[#D97706]" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">Simulate AI link status</p>
              <p className="text-xs text-[#64748B] mt-0.5 max-w-md">
                Studies always forward to the AI analysis pipeline once complete. This toggle
                demonstrates what happens if that link drops.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-[#E8EDF2] bg-[#F8FAFC] p-1 w-fit flex-shrink-0">
            <Button
              variant={linkOnline ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setLinkOnline(true)}
            >
              Online
            </Button>
            <Button
              variant={!linkOnline ? 'danger' : 'ghost'}
              size="sm"
              onClick={() => setLinkOnline(false)}
            >
              Offline
            </Button>
          </div>
        </div>

        {!linkOnline && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] px-3.5 py-3">
            <WifiOff size={15} className="text-[#D97706] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#92400E] leading-relaxed">
              <span className="font-semibold">AI link unavailable</span> — studies are queuing
              locally and will forward automatically once reconnected. Local scanning is not
              interrupted.
            </p>
          </div>
        )}
      </Card>
    </DemoLayout>
  )
}

/* ---------------------------------------------------------------------- */
/* Small helpers                                                          */
/* ---------------------------------------------------------------------- */

function Field({ label, children, full = false }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[#0F172A]">{children}</dd>
    </div>
  )
}
