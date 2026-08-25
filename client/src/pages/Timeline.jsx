import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockTimeline, timelineTypes } from '../data/mockTimeline.js'
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Paperclip,
  User,
  MapPin,
  Zap,
  Ambulance,
  Building2,
  FlaskConical,
  Stethoscope,
  Image,
  Pill,
  Dumbbell,
  Brain,
  Star,
  Activity,
} from 'lucide-react'
import SectionTitle from '../components/common/SectionTitle.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import SearchBar from '../components/common/SearchBar.jsx'

/* ── Page entry animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Map event type → icon ── */
const TYPE_ICONS = {
  onset:         Zap,
  ems:           Ambulance,
  admission:     Building2,
  imaging:       Image,
  treatment:     Pill,
  rehab:         Dumbbell,
  appointment:   Stethoscope,
  lab:           FlaskConical,
  milestone:     Star,
  ai_prediction: Brain,
}

/* ── Filter options ── */
const FILTERS = [
  { label: 'All Events',     value: 'all' },
  { label: 'Symptom Onset',  value: 'onset' },
  { label: 'EMS Response',   value: 'ems' },
  { label: 'Admission',      value: 'admission' },
  { label: 'Imaging',        value: 'imaging' },
  { label: 'Treatment',      value: 'treatment' },
  { label: 'Rehabilitation', value: 'rehab' },
  { label: 'Appointments',   value: 'appointment' },
  { label: 'Lab Results',    value: 'lab' },
  { label: 'Milestones',     value: 'milestone' },
  { label: 'AI Detection',   value: 'ai_prediction' },
]

/* ── Badge variant map ── */
const BADGE_VARIANTS = {
  success: 'success',
  danger:  'danger',
  warning: 'warning',
  info:    'info',
  primary: 'primary',
  muted:   'muted',
}

export default function Timeline() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [expandedIds,  setExpandedIds]  = useState(new Set(['TL-012']))

  /* ── Filter + search logic ── */
  const filtered = mockTimeline.filter((event) => {
    const matchesType   = activeFilter === 'all' || event.type === activeFilter
    const matchesSearch = searchQuery === '' ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.doctor.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-[900px] mx-auto"
    >
      {/* ── Page header ── */}
      <div className="mb-8">
        <SectionTitle
          title="Medical Timeline"
          subtitle="Your complete stroke care journey — chronologically ordered"
          size="xl"
        />

        {/* Stats strip */}
        <div className="flex flex-wrap gap-4 mt-5">
          <TimelineStat label="Total Events"   value={mockTimeline.length} />
          <TimelineStat label="Care Milestones" value={mockTimeline.filter(e => e.type === 'milestone').length} />
          <TimelineStat label="Imaging Studies" value={mockTimeline.filter(e => e.type === 'imaging').length} />
          <TimelineStat label="Months Active"   value="13+" />
        </div>
      </div>

      {/* ── Search bar ── */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search events, doctors, findings..."
        className="mb-4"
      />

      {/* ── Filter pill strip (horizontally scrollable — avoids wrapping into many rows) ── */}
      <div className="flex gap-2 flex-nowrap overflow-x-auto scrollbar-hide mb-8 pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold
              border transition-all duration-200
              ${activeFilter === f.value
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-white text-[#64748B] border-[#E8EDF2] hover:border-[#94A3B8]'
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[22px] top-0 bottom-0 w-px"
          style={{
            background: 'linear-gradient(to bottom, #2563EB 0%, #E8EDF2 100%)',
          }}
        />

        {/* Events */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <div className="space-y-0">
              {filtered.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  index={index}
                  isExpanded={expandedIds.has(event.id)}
                  onToggle={() => toggleExpand(event.id)}
                  isLast={index === filtered.length - 1}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] border border-[#E8EDF2]
                              flex items-center justify-center mb-4">
                <Calendar size={22} className="text-[#94A3B8]" />
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">No events found</p>
              <p className="text-xs text-[#64748B] mt-1">
                Try adjusting your search or filter criteria.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Single timeline event card ── */
function TimelineEvent({ event, index, isExpanded, onToggle, isLast }) {
  const typeMeta = timelineTypes[event.type] || timelineTypes.appointment
  const Icon     = TYPE_ICONS[event.type] || Activity

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{
        delay:    index * 0.05,
        duration: 0.45,
        ease:     [0.16, 1, 0.3, 1],
      }}
      className="flex gap-5 pb-8"
    >
      {/* ── Left column: icon node ── */}
      <div className="flex flex-col items-center flex-shrink-0 z-10">
        {/* Icon bubble */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center
                     border-2 border-white flex-shrink-0"
          style={{
            backgroundColor: typeMeta.bg,
            boxShadow: `0 0 0 3px ${typeMeta.color}20`,
          }}
        >
          <Icon size={18} style={{ color: typeMeta.color }} />
        </motion.div>
      </div>

      {/* ── Right column: card ── */}
      <div className="flex-1 min-w-0 pb-0">

        {/* Date label */}
        <div className="flex items-center gap-2 mb-2 mt-2.5">
          <Calendar size={11} className="text-[#94A3B8]" />
          <span className="text-[11px] font-medium text-[#94A3B8]">
            {formattedDate}
          </span>
        </div>

        {/* Card */}
        <motion.div
          layout
          className="bg-white rounded-xl border border-[#E8EDF2] overflow-hidden
                     transition-shadow duration-200 hover:shadow-[0_4px_24px_0_rgba(15,23,42,0.08)]"
          style={{
            boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04), 0 4px 16px 0 rgba(15,23,42,0.06)',
          }}
        >
          {/* Card header */}
          <div
            className="px-5 pt-5 pb-4 cursor-pointer"
            onClick={onToggle}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Type + badge row */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: typeMeta.color }}
                  >
                    {typeMeta.label}
                  </span>
                  <StatusBadge
                    variant={BADGE_VARIANTS[event.badgeColor] || 'muted'}
                    size="xs"
                    dot
                  >
                    {event.badge}
                  </StatusBadge>
                </div>

                {/* Title */}
                <h3
                  className="text-sm font-bold text-[#0F172A] leading-snug"
                  style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}
                >
                  {event.title}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">{event.subtitle}</p>
              </div>

              {/* Expand toggle */}
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                className="w-7 h-7 rounded-xl bg-[#F1F5F9] flex items-center
                           justify-center text-[#64748B] hover:bg-[#E8EDF2]
                           transition-colors flex-shrink-0 mt-0.5"
              >
                {isExpanded
                  ? <ChevronUp size={13} />
                  : <ChevronDown size={13} />
                }
              </button>
            </div>

            {/* Quick meta row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User size={11} className="text-[#94A3B8]" />
                <span className="text-[11px] text-[#64748B] font-medium">
                  {event.doctor}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={11} className="text-[#94A3B8]" />
                <span className="text-[11px] text-[#64748B]">
                  {event.facility}
                </span>
              </div>
              {event.attachments?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Paperclip size={11} className="text-[#94A3B8]" />
                  <span className="text-[11px] text-[#64748B]">
                    {event.attachments.length} attachment{event.attachments.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable body */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="body"
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  transition: {
                    height:  { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.25, delay: 0.05 },
                  },
                }}
                exit={{
                  height:  0,
                  opacity: 0,
                  transition: {
                    height:  { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                    opacity: { duration: 0.15 },
                  },
                }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 border-t border-[#F1F5F9]">

                  {/* Description */}
                  <p className="text-sm text-[#64748B] leading-relaxed mt-4">
                    {event.description}
                  </p>

                  {/* Results grid */}
                  {event.results && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(event.results).map(([key, value]) => (
                        <ResultChip key={key} label={key} value={value} />
                      ))}
                    </div>
                  )}

                  {/* Attachments */}
                  {event.attachments?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase
                                    tracking-widest mb-2">
                        Attachments
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {event.attachments.map((file) => (
                          <AttachmentPill key={file} filename={file} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ── Result chip ── */
function ResultChip({ label, value }) {
  const labelMap = {
    nihss:            'NIHSS Score',
    onsetToTreatment: 'Onset-to-Treatment Time',
    occlusionSite:    'Occlusion Site',
    treatmentGiven:   'Treatment Given',
    mRS:              'Modified Rankin Scale',
    imagingFinding:   'Imaging Finding',
    bloodPressure:    'Blood Pressure',
    keyFind:          'Key Finding',
  }

  return (
    <div className="bg-[#F8FAFC] border border-[#E8EDF2] rounded-xl p-3">
      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
        {labelMap[label] || label}
      </p>
      <p className="text-xs font-semibold text-[#0F172A] leading-snug">{value}</p>
    </div>
  )
}

/* ── Attachment pill ── */
function AttachmentPill({ filename }) {
  const isPDF   = filename.endsWith('.pdf')
  const isDICOM = filename.endsWith('.dcm')

  const color = isPDF ? '#2563EB' : isDICOM ? '#7C3AED' : '#16A34A'
  const bg    = isPDF ? '#EFF6FF' : isDICOM ? '#EDE9FE' : '#DCFCE7'
  const label = isPDF ? 'PDF' : isDICOM ? 'DICOM' : 'FILE'

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border
                 cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: bg, borderColor: `${color}30` }}
    >
      <Paperclip size={11} style={{ color }} />
      <span className="text-[11px] font-medium" style={{ color }}>
        {filename}
      </span>
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {label}
      </span>
    </div>
  )
}

/* ── Timeline stat ── */
function TimelineStat({ label, value }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-white border border-[#E8EDF2]"
         style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}>
      <span
        className="text-lg font-bold text-[#0F172A]"
        style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span className="text-xs text-[#64748B] font-medium">{label}</span>
    </div>
  )
}
