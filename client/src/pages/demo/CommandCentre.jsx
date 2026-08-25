import { useState } from 'react'
import {
  MapPin,
  Ambulance,
  FlaskConical,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  RotateCcw,
} from 'lucide-react'
import Card from '../../components/common/Card.jsx'
import Button from '../../components/common/Button.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import DemoLayout from '../../components/demo/DemoLayout.jsx'

/* ---------------------------------------------------------------- */
/*  Mock data                                                        */
/* ---------------------------------------------------------------- */

const CASES = [
  {
    id: 'SA-2418',
    patient: 'Anonymous alert',
    isAnonymous: true,
    stage: 'Ambulance en route to patient',
    slaState: 'warning',
    slaLabel: '3m 40s left',
    startedAt: '10:41 AM',
    timeline: [
      { label: 'Alert received', time: '10:41 AM', status: 'done', duration: 'Instant' },
      { label: 'Dispatch fan-out sent', time: '10:41 AM', status: 'done', duration: '8s' },
      { label: 'Ambulance en route', time: '10:42 AM', status: 'active', duration: 'Elapsed 6m 20s · target 10m' },
      { label: 'Arrived at patient', time: '—', status: 'pending', duration: 'Pending' },
      { label: 'Transport to scan lab', time: '—', status: 'pending', duration: 'Pending' },
      { label: 'Scanning', time: '—', status: 'pending', duration: 'Pending' },
      { label: 'AI decision ready', time: '—', status: 'pending', duration: 'Pending' },
      { label: 'Hospital notified', time: '—', status: 'pending', duration: 'Pending' },
    ],
    nodes: [
      { name: 'Tier 1 Ambulance', status: 'acknowledged', at: '10:41 AM' },
      { name: 'Nearest Scan Lab', status: 'acknowledged', at: '10:41 AM' },
      { name: 'Mobile AI Doctor', status: 'pending' },
      { name: 'Receiving Hospital', status: 'acknowledged', at: '10:42 AM' },
    ],
  },
  {
    id: 'SA-2415',
    patient: 'R. Fernandes (68M)',
    isAnonymous: false,
    stage: 'Scanning in progress',
    slaState: 'success',
    slaLabel: '9m 12s left',
    startedAt: '10:22 AM',
    timeline: [
      { label: 'Alert received', time: '10:22 AM', status: 'done', duration: 'Instant' },
      { label: 'Dispatch fan-out sent', time: '10:22 AM', status: 'done', duration: '6s' },
      { label: 'Ambulance en route', time: '10:23 AM', status: 'done', duration: '8m 40s' },
      { label: 'Arrived at patient', time: '10:31 AM', status: 'done', duration: 'On time' },
      { label: 'Transport to scan lab', time: '10:34 AM', status: 'done', duration: '11m 05s' },
      { label: 'Scanning', time: '10:45 AM', status: 'active', duration: 'Elapsed 3m 50s · target 8m' },
      { label: 'AI decision ready', time: '—', status: 'pending', duration: 'Pending' },
      { label: 'Hospital notified', time: '—', status: 'pending', duration: 'Pending' },
    ],
    nodes: [
      { name: 'Tier 1 Ambulance', status: 'acknowledged', at: '10:22 AM' },
      { name: 'Nearest Scan Lab', status: 'acknowledged', at: '10:22 AM' },
      { name: 'Mobile AI Doctor', status: 'acknowledged', at: '10:23 AM' },
      { name: 'Receiving Hospital', status: 'acknowledged', at: '10:23 AM' },
    ],
  },
  {
    id: 'SA-2409',
    patient: 'K. Iyer (54F)',
    isAnonymous: false,
    stage: 'Decision ready — awaiting hospital ack',
    slaState: 'danger',
    slaLabel: 'SLA breached · +2m 15s',
    startedAt: '09:58 AM',
    timeline: [
      { label: 'Alert received', time: '9:58 AM', status: 'done', duration: 'Instant' },
      { label: 'Dispatch fan-out sent', time: '9:58 AM', status: 'done', duration: '7s' },
      { label: 'Ambulance en route', time: '9:59 AM', status: 'done', duration: '9m 30s' },
      { label: 'Arrived at patient', time: '10:08 AM', status: 'done', duration: 'On time' },
      { label: 'Transport to scan lab', time: '10:11 AM', status: 'done', duration: '10m 40s' },
      { label: 'Scanning', time: '10:22 AM', status: 'done', duration: '7m 15s' },
      { label: 'AI decision ready', time: '10:29 AM', status: 'done', duration: '1m 52s' },
      { label: 'Hospital notified', time: '10:30 AM', status: 'active', duration: 'Elapsed 8m 30s · target 6m' },
    ],
    nodes: [
      { name: 'Tier 1 Ambulance', status: 'acknowledged', at: '9:58 AM' },
      { name: 'Nearest Scan Lab', status: 'acknowledged', at: '9:58 AM' },
      { name: 'Mobile AI Doctor', status: 'acknowledged', at: '9:59 AM' },
      { name: 'Receiving Hospital', status: 'pending' },
    ],
  },
]

const KPI_TILES = [
  { label: 'Alert → Dispatch', value: '42s', status: 'success', note: 'Within target' },
  { label: 'Dispatch → Scan', value: '11 min', status: 'success', note: 'Within target' },
  { label: 'Scan → AI Decision', value: '1m 48s', status: 'success', note: 'Within target' },
  { label: 'Decision → Hospital', value: '6 min', status: 'warning', note: 'Monitor' },
]

const SLA_BADGE = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

const NODE_ICONS = {
  'Tier 1 Ambulance': Ambulance,
  'Nearest Scan Lab': FlaskConical,
  'Mobile AI Doctor': User,
  'Receiving Hospital': Building2,
}

/* ---------------------------------------------------------------- */
/*  Component                                                        */
/* ---------------------------------------------------------------- */

export default function CommandCentre() {
  const [selectedCaseId, setSelectedCaseId] = useState(CASES[0].id)
  const [overrideNotice, setOverrideNotice] = useState(false)

  const selectedCase = CASES.find((c) => c.id === selectedCaseId) || CASES[0]

  function handleSelectCase(id) {
    setSelectedCaseId(id)
    setOverrideNotice(false)
  }

  function handleOverride() {
    setOverrideNotice(true)
  }

  return (
    <DemoLayout role="Command Centre" accent="blue">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
        </span>
        <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Live Operations</h1>
        <span className="text-sm text-[#64748B]">· 3 active cases</span>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-6">
        {/* Case list */}
        <div className="space-y-3">
          {CASES.map((c) => (
            <CaseRow
              key={c.id}
              caseData={c}
              selected={c.id === selectedCaseId}
              onSelect={() => handleSelectCase(c.id)}
            />
          ))}
        </div>

        {/* Detail panel */}
        <div className="space-y-6">
          <CaseMap caseData={selectedCase} />

          <Card padding="lg">
            <h2 className="text-sm font-bold text-[#0F172A] mb-4">Case Timeline — #{selectedCase.id}</h2>
            <Timeline stages={selectedCase.timeline} />
          </Card>

          <Card padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-3">
              <h2 className="text-sm font-bold text-[#0F172A]">Dispatch Fan-Out Acknowledgment</h2>
              <span className="text-[11px] text-[#94A3B8]">One alert, sent to all spokes at once</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCase.nodes.map((n) => (
                <NodeChip key={n.name} node={n} />
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-[#E8EDF2] flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Operator override</p>
                <p className="text-xs text-[#64748B]">Redirect this case to a different ambulance, lab, or hospital.</p>
              </div>
              <Button variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={handleOverride}>
                Override Dispatch
              </Button>
            </div>
            {overrideNotice && (
              <div className="mt-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs font-medium text-[#2563EB]">
                Override recorded — this is a demo action, no real dispatch was changed.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* KPI strip */}
      <div>
        <h2 className="text-sm font-bold text-[#0F172A] mb-3">Golden-Window Compliance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_TILES.map((tile) => (
            <KpiTile key={tile.label} tile={tile} />
          ))}
        </div>
      </div>

      <p className="text-xs text-[#94A3B8] text-center pt-2">
        All case data on this page is simulated for demonstration purposes.
      </p>
    </DemoLayout>
  )
}

/* ---------------------------------------------------------------- */
/*  Subcomponents                                                     */
/* ---------------------------------------------------------------- */

function CaseRow({ caseData, selected, onSelect }) {
  const { id, patient, isAnonymous, stage, slaState, slaLabel } = caseData

  return (
    <Card
      padding="md"
      variant={selected ? 'primary' : 'default'}
      onClick={onSelect}
      className={`cursor-pointer transition-colors ${selected ? '' : 'hover:border-[#94A3B8]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0F172A]">Case #{id}</p>
          <p className={`text-xs mt-0.5 ${isAnonymous ? 'italic text-[#94A3B8]' : 'text-[#64748B]'}`}>
            {patient}
          </p>
        </div>
        <StatusBadge variant={SLA_BADGE[slaState]} size="xs" dot pulse={slaState === 'danger'}>
          {slaLabel}
        </StatusBadge>
      </div>
      <p className="text-xs text-[#64748B] mt-3 flex items-center gap-1.5">
        <Navigation size={12} className="text-[#94A3B8]" />
        {stage}
      </p>
    </Card>
  )
}

function KpiTile({ tile }) {
  const { label, value, status, note } = tile
  const colors = {
    success: { text: '#16A34A', bg: '#DCFCE7' },
    warning: { text: '#D97706', bg: '#FEF3C7' },
  }
  const c = colors[status] || colors.success

  return (
    <Card padding="md">
      <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-[#0F172A] mt-1.5">{value}</p>
      <span
        className="inline-flex items-center gap-1 mt-2 rounded-md px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: c.bg, color: c.text }}
      >
        {note}
      </span>
    </Card>
  )
}

function Timeline({ stages }) {
  return (
    <div className="space-y-0">
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1
        const dotStyles =
          stage.status === 'done'
            ? { border: '#16A34A', bg: '#16A34A', text: '#0F172A' }
            : stage.status === 'active'
            ? { border: '#2563EB', bg: '#2563EB', text: '#0F172A' }
            : { border: '#E2E8F0', bg: '#FFFFFF', text: '#94A3B8' }

        return (
          <div key={stage.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: dotStyles.border, background: stage.status === 'pending' ? '#fff' : dotStyles.bg }}
              >
                {stage.status === 'done' && <CheckCircle2 size={12} className="text-white" />}
                {stage.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {!isLast && (
                <span
                  className="w-px flex-1 min-h-[22px]"
                  style={{ background: stage.status === 'pending' ? '#E2E8F0' : '#CBD5E1' }}
                />
              )}
            </div>
            <div className="pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: dotStyles.text }}>
                  {stage.label}
                </p>
                {stage.status === 'active' && <StatusBadge variant="primary" size="xs">In progress</StatusBadge>}
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 flex items-center gap-1.5">
                <Clock size={11} />
                {stage.time} · {stage.duration}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NodeChip({ node }) {
  const Icon = NODE_ICONS[node.name] || User
  const acknowledged = node.status === 'acknowledged'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
        acknowledged
          ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#16A34A]'
          : 'bg-[#FEF3C7] border-[#FDE68A] text-[#D97706]'
      }`}
    >
      <Icon size={13} />
      {node.name}
      {acknowledged ? 'Acknowledged' : 'Pending'}
    </span>
  )
}

function CaseMap({ caseData }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 pt-4">
        <h2 className="text-sm font-bold text-[#0F172A]">Route Overview — Case #{caseData.id}</h2>
        <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
          <MapPin size={12} /> Stylized illustration, not a live map
        </span>
      </div>
      <div
        className="relative mt-4 h-64 border-t border-[#E8EDF2]"
        style={{
          background:
            '#F8FAFC radial-gradient(#E2E8F0 1px, transparent 1px) 0 0 / 22px 22px',
        }}
      >
        {/* Route line */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <polyline
            points="12%,78% 38%,55% 62%,50% 86%,26%"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeDasharray="6 5"
            opacity="0.6"
          />
        </svg>

        <MapPinMarker icon={User} label="Patient" sub="Alert origin" left="12%" top="78%" color="#DC2626" bg="#FEE2E2" />
        <MapPinMarker icon={Ambulance} label="Ambulance" sub="En route" left="38%" top="55%" color="#2563EB" bg="#DBEAFE" />
        <MapPinMarker icon={FlaskConical} label="Scan Lab" sub="Nearest node" left="62%" top="50%" color="#334155" bg="#F1F5F9" />
        <MapPinMarker icon={Building2} label="Hospital" sub="Receiving" left="86%" top="26%" color="#16A34A" bg="#DCFCE7" />
      </div>
    </Card>
  )
}

function MapPinMarker({ icon: Icon, label, sub, left, top, color, bg }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
      style={{ left, top }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-sm"
        style={{ background: bg, color }}
      >
        <Icon size={15} />
      </div>
      <div className="mt-1 rounded-md border border-[#E8EDF2] bg-white px-1.5 py-0.5 text-center shadow-sm">
        <p className="text-[10px] font-bold text-[#0F172A] leading-tight whitespace-nowrap">{label}</p>
        <p className="text-[9px] text-[#94A3B8] leading-tight whitespace-nowrap">{sub}</p>
      </div>
    </div>
  )
}
