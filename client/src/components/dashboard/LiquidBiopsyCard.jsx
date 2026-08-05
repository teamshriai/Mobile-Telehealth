import { motion } from 'framer-motion'
import { CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react'
import SectionTitle from '../common/SectionTitle.jsx'
import Card from '../common/Card.jsx'
import { useNavigate } from 'react-router-dom'

/* ── Workflow stages ── */
const STAGES = [
  { id: 1, label: 'Blood Collection',  sub: 'Oct 10, 2024',   status: 'completed' },
  { id: 2, label: 'Sample Transport',  sub: 'Same day',        status: 'completed' },
  { id: 3, label: 'Lab Received',      sub: 'Oct 10, 9:42 AM', status: 'completed' },
  { id: 4, label: 'DNA Extraction',    sub: 'Oct 11',          status: 'completed' },
  { id: 5, label: 'NGS Sequencing',    sub: 'Oct 11–12',       status: 'completed' },
  { id: 6, label: 'Variant Calling',   sub: 'Oct 12',          status: 'completed' },
  { id: 7, label: 'AI Analysis',       sub: 'Oct 13',          status: 'completed' },
  { id: 8, label: 'Clinician Review',  sub: 'Oct 16',          status: 'completed' },
  { id: 9, label: 'Report Released',   sub: 'Oct 16, 3:00 PM', status: 'completed' },
]

/* ── Next cycle stages (upcoming) ── */
const NEXT_STAGES = [
  { id: 1, label: 'Blood Collection',  sub: 'Nov 7, 2024',    status: 'upcoming' },
  { id: 2, label: 'Sample Transport',  sub: 'Scheduled',       status: 'pending' },
  { id: 3, label: 'Lab Received',      sub: 'Est. Nov 7',      status: 'pending' },
  { id: 4, label: 'DNA Extraction',    sub: 'Est. Nov 8',      status: 'pending' },
  { id: 5, label: 'NGS Sequencing',    sub: 'Est. Nov 8–9',    status: 'pending' },
  { id: 6, label: 'Variant Calling',   sub: 'Est. Nov 9',      status: 'pending' },
  { id: 7, label: 'AI Analysis',       sub: 'Est. Nov 10',     status: 'pending' },
  { id: 8, label: 'Clinician Review',  sub: 'Est. Nov 13',     status: 'pending' },
  { id: 9, label: 'Report Released',   sub: 'Est. Nov 13',     status: 'pending' },
]

export default function LiquidBiopsyCard() {
  const navigate = useNavigate()

  return (
    <Card variant="default" padding="lg" className="max-w-full overflow-hidden">
      {/* Header */}
      <SectionTitle
        title="Liquid Biopsy Workflow"
        subtitle="Cycle 12 — Completed · Cycle 13 scheduled Nov 7"
        action={
          <button
            onClick={() => navigate('/medical-records')}
            className="flex items-center gap-1 text-xs text-[#2563EB] font-semibold
                       hover:text-[#1D4ED8] transition-colors"
          >
            View report
            <ChevronRight size={13} />
          </button>
        }
        className="mb-6"
      />

      {/* Current cycle — Completed */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-widest">
            Cycle 12 — Oct 2024
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold
                           bg-[#DCFCE7] text-[#16A34A]">
            Completed
          </span>
        </div>

        {/* Horizontal stage flow */}
        <WorkflowTrack stages={STAGES} />
      </div>

      {/* Divider */}
      <div className="h-px bg-[#F1F5F9] mb-6" />

      {/* Next cycle — Upcoming */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-widest">
            Cycle 13 — Nov 2024
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold
                           bg-[#FEF3C7] text-[#D97706]">
            Scheduled
          </span>
        </div>

        <WorkflowTrack stages={NEXT_STAGES} />
      </div>

      {/* ctDNA result card */}
      <div
        className="mt-6 rounded-2xl p-4 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9C4 6.239 6.239 4 9 4C11.761 4 14 6.239 14 9"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="9" cy="9" r="2" fill="white" />
            <path d="M9 11L9 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#1E40AF]">
            Latest ctDNA Result — Cycle 12
          </p>
          <p className="text-lg font-bold text-[#1E3A8A] mt-0.5"
             style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}>
            0.18% MAF
          </p>
          <p className="text-xs text-[#3B82F6]">
            Down from 0.34% — 47% reduction from peak — No resistance mutations
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-[#64748B] font-medium">Trend</p>
          <p className="text-base font-bold text-[#16A34A]">Responding</p>
        </div>
      </div>
    </Card>
  )
}

/* ── Horizontal workflow track ── */
function WorkflowTrack({ stages }) {
  return (
    <div className="-mx-1 max-w-full overflow-x-auto px-1">
      <div className="flex w-max max-w-none items-start gap-0">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-start">
            {/* Stage node */}
            <StageNode stage={stage} index={i} />

            {/* Connector line */}
            {i < stages.length - 1 && (
              <ConnectorLine completed={stages[i + 1].status === 'completed'} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Single stage node ── */
function StageNode({ stage, index }) {
  const isCompleted = stage.status === 'completed'
  const isUpcoming  = stage.status === 'upcoming'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col items-center gap-1.5 w-[88px]"
    >
      {/* Circle icon */}
      <div
        className={`
          w-7 h-7 rounded-full flex items-center justify-center
          border-2 transition-all duration-300
          ${isCompleted
            ? 'bg-[#16A34A] border-[#16A34A]'
            : isUpcoming
            ? 'bg-[#2563EB] border-[#2563EB] animate-pulse'
            : 'bg-white border-[#E8EDF2]'
          }
        `}
      >
        {isCompleted ? (
          <CheckCircle size={14} className="text-white" strokeWidth={2.5} />
        ) : isUpcoming ? (
          <Clock size={12} className="text-white" />
        ) : (
          <Circle size={12} className="text-[#CBD5E1]" />
        )}
      </div>

      {/* Labels */}
      <div className="text-center">
        <p
          className={`text-[10px] font-semibold leading-tight
            ${isCompleted ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}
        >
          {stage.label}
        </p>
        <p className="text-[9px] text-[#CBD5E1] mt-0.5 leading-tight">
          {stage.sub}
        </p>
      </div>
    </motion.div>
  )
}

/* ── Connector line between stages ── */
function ConnectorLine({ completed }) {
  return (
    <div className="flex items-center mt-3.5 flex-shrink-0 w-4">
      <div
        className="h-0.5 w-full rounded-full transition-colors duration-300"
        style={{ backgroundColor: completed ? '#16A34A' : '#E8EDF2' }}
      />
    </div>
  )
}
