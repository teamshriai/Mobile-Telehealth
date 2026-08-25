import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Phone,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Bell,
  FileText,
} from 'lucide-react'
import { mockAppointments, appointmentTypes } from '../data/mockAppointments.js'
import SectionTitle from '../components/common/SectionTitle.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import Card from '../components/common/Card.jsx'
import Modal from '../components/common/Modal.jsx'
import Button from '../components/common/Button.jsx'

/* ── Page animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

const staggerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Filter options ── */
const STATUS_FILTERS = [
  { label: 'All',       value: 'all' },
  { label: 'Upcoming',  value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const TYPE_FILTERS = [
  { label: 'All Types',  value: 'all' },
  { label: 'Neurology',  value: 'neurology' },
  { label: 'Lab',        value: 'lab' },
  { label: 'Imaging',    value: 'imaging' },
  { label: 'Telehealth', value: 'telehealth' },
  { label: 'Radiology',  value: 'radiology' },
]

export default function Appointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState(mockAppointments)
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [typeFilter,    setTypeFilter]    = useState('all')
  const [selectedAppt,  setSelectedAppt]  = useState(null)
  const [bookingOpen,   setBookingOpen]   = useState(false)

  /** No real Appointments backend exists yet (mock-data module) — this
   * updates local state honestly rather than pretending to call an API
   * that isn't there. Reuses the 'cancelled' status the filters already
   * anticipate. */
  const handleCancelAppointment = (id) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
    )
    setSelectedAppt(null)
  }

  /* ── Filter logic ── */
  const filtered = appointments.filter((a) => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchType   = typeFilter   === 'all' || a.type   === typeFilter
    return matchStatus && matchType
  })

  const upcoming  = filtered.filter((a) => a.status === 'upcoming')
  const completed = filtered.filter((a) => a.status === 'completed')

  /* ── Summary stats ── */
  const stats = [
    {
      label: 'Upcoming',
      value: appointments.filter((a) => a.status === 'upcoming').length,
      color: '#2563EB',
      bg:    '#EFF6FF',
    },
    {
      label: 'Completed',
      value: appointments.filter((a) => a.status === 'completed').length,
      color: '#16A34A',
      bg:    '#DCFCE7',
    },
    {
      label: 'This Month',
      value: appointments.filter((a) =>
        a.date.startsWith('2024-10') || a.date.startsWith('2024-11')
      ).length,
      color: '#64748B',
      bg:    '#F1F5F9',
    },
    {
      label: 'Telehealth',
      value: appointments.filter((a) => a.mode === 'telehealth').length,
      color: '#D97706',
      bg:    '#FEF3C7',
    },
  ]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-[1100px] mx-auto space-y-8"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <SectionTitle
          title="Appointments"
          subtitle="Manage your upcoming and past medical visits"
          size="xl"
        />
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => setBookingOpen(true)}
        >
          Book Appointment
        </Button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <ApptStat key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Next appointment hero ── */}
      {upcoming.length > 0 && (
        <NextAppointmentHero
          appointment={upcoming[0]}
          onClick={() => setSelectedAppt(upcoming[0])}
        />
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`
                px-3.5 py-2 rounded-xl text-xs font-semibold
                border transition-all duration-200
                ${statusFilter === f.value
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-white text-[#64748B] border-[#E8EDF2] hover:border-[#94A3B8]'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium
                border transition-all duration-200
                ${typeFilter === f.value
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-[#94A3B8] border-[#E8EDF2] hover:border-[#94A3B8]'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Upcoming appointments ── */}
      <AnimatePresence mode="popLayout">
        {upcoming.length > 0 && (
          <motion.div layout>
            <p className="text-xs font-bold text-[#94A3B8] uppercase
                          tracking-widest mb-4">
              Upcoming — {upcoming.length}
            </p>
            <motion.div
              variants={staggerVariants}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {upcoming.map((appt, i) => (
                <motion.div key={appt.id} variants={itemVariants}>
                  <AppointmentRow
                    appointment={appt}
                    onClick={() => setSelectedAppt(appt)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── Completed appointments ── */}
        {completed.length > 0 && (
          <motion.div layout>
            <p className="text-xs font-bold text-[#94A3B8] uppercase
                          tracking-widest mb-4">
              Past — {completed.length}
            </p>
            <motion.div
              variants={staggerVariants}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {completed.map((appt, i) => (
                <motion.div key={appt.id} variants={itemVariants}>
                  <AppointmentRow
                    appointment={appt}
                    onClick={() => setSelectedAppt(appt)}
                    muted
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] border border-[#E8EDF2]
                            flex items-center justify-center mb-4">
              <Calendar size={22} className="text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">
              No appointments found
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Try a different filter or book a new appointment.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setBookingOpen(true)}
            >
              Book Appointment
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail modal ── */}
      <AppointmentDetailModal
        appointment={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onCancel={handleCancelAppointment}
        onJoinCall={() => navigate('/dashboard/meetings')}
      />

      {/* ── Book appointment modal ── */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   NEXT APPOINTMENT HERO
───────────────────────────────────────────── */
function NextAppointmentHero({ appointment, onClick }) {
  const apptDate  = new Date(appointment.date)
  const isToday   = apptDate.toDateString() === new Date().toDateString()
  const isTele    = appointment.mode === 'telehealth'
  const typeMeta  = appointmentTypes[appointment.type] || appointmentTypes.neurology

  /* Days until appointment */
  const daysUntil = Math.ceil(
    (apptDate - new Date()) / (1000 * 60 * 60 * 24)
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-900 border border-slate-800"
    >
      <div className="relative z-10 p-5 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">

          {/* Left — date block */}
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-white/15
                            border border-white/20 flex flex-col items-center
                            justify-center backdrop-blur-sm">
              <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                {apptDate.toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span
                className="text-white text-3xl font-bold leading-tight"
                style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
              >
                {apptDate.getDate()}
              </span>
              <span className="text-white/60 text-[10px] font-medium">
                {apptDate.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold
                             text-white/90 border border-white/20"
                  style={{ backgroundColor: `${typeMeta.color}40` }}
                >
                  {typeMeta.label}
                </span>
                {isToday && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold
                                   bg-[#16A34A] text-white">
                    Today
                  </span>
                )}
              </div>
              <h2
                className="text-xl font-bold text-white leading-tight"
                style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}
              >
                {appointment.title}
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-white/60" />
                  <span className="text-white/80 text-sm font-medium">
                    {appointment.time}
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60 text-sm">
                    {appointment.duration} min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — details */}
          <div className="md:ml-auto flex flex-col sm:flex-row gap-4">

            {/* Doctor */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl
                         backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6]
                              to-[#60A5FA] flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {appointment.doctor}
                </p>
                <p className="text-white/60 text-xs">{appointment.specialty}</p>
              </div>
            </div>

            {/* Location / mode */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl
                         backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {isTele ? (
                <Video size={18} className="text-[#60A5FA] flex-shrink-0" />
              ) : (
                <MapPin size={18} className="text-[#60A5FA] flex-shrink-0" />
              )}
              <div>
                <p className="text-white text-sm font-semibold">
                  {isTele ? 'Video Call' : (appointment.facility?.split(',')[0] ?? 'Location TBD')}
                </p>
                <p className="text-white/60 text-xs">
                  {isTele ? 'Online visit' : appointment.room || 'In-person'}
                </p>
              </div>
            </div>

            {/* Days away */}
            <div
              className="flex flex-col items-center justify-center px-5 py-3
                         rounded-xl backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <span
                className="text-2xl font-bold text-white"
                style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
              >
                {daysUntil}
              </span>
              <span className="text-white/60 text-xs font-medium">
                {daysUntil === 1 ? 'day away' : 'days away'}
              </span>
            </div>
          </div>
        </div>

        {/* Preparation note */}
        {appointment.notes && (
          <div
            className="mt-5 flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Bell size={14} className="text-[#FCD34D] flex-shrink-0 mt-0.5" />
            <p className="text-white/70 text-xs leading-relaxed">
              <span className="text-[#FCD34D] font-semibold">Reminder: </span>
              {appointment.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   APPOINTMENT ROW
───────────────────────────────────────────── */
function AppointmentRow({ appointment, onClick, muted = false }) {
  const typeMeta = appointmentTypes[appointment.type] || appointmentTypes.neurology
  const isTele   = appointment.mode === 'telehealth'
  const isUpcoming = appointment.status === 'upcoming'

  const apptDate = new Date(appointment.date)
  const dateStr  = apptDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <motion.div
      whileHover={{ x: 3 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4 rounded-xl border cursor-pointer
        transition-all duration-200 group
        ${muted
          ? 'bg-[#FAFBFC] border-[#E8EDF2] hover:bg-white hover:border-[#BFDBFE]'
          : 'bg-white border-[#E8EDF2] hover:border-[#BFDBFE] hover:shadow-[0_4px_20px_0_rgba(37,99,235,0.08)]'
        }
      `}
    >
      {/* Date block */}
      <div
        className={`
          flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center
          justify-center border
          ${isUpcoming
            ? 'bg-[#EFF6FF] border-[#BFDBFE]'
            : 'bg-[#F1F5F9] border-[#E8EDF2]'
          }
        `}
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-wider
            ${isUpcoming ? 'text-[#2563EB]' : 'text-[#94A3B8]'}`}
        >
          {apptDate.toLocaleDateString('en-US', { month: 'short' })}
        </span>
        <span
          className={`text-xl font-bold leading-none
            ${isUpcoming ? 'text-[#1E3A8A]' : 'text-[#64748B]'}`}
          style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
        >
          {apptDate.getDate()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: typeMeta.color }}
          >
            {typeMeta.label}
          </span>
          <StatusBadge
            variant={isUpcoming ? 'primary' : 'muted'}
            size="xs"
            dot={isUpcoming}
            pulse={isUpcoming}
          >
            {isUpcoming ? 'Upcoming' : 'Completed'}
          </StatusBadge>
          {isTele && (
            <StatusBadge variant="info" size="xs">
              Telehealth
            </StatusBadge>
          )}
        </div>

        <p
          className={`text-sm font-bold leading-snug truncate
            ${muted ? 'text-[#64748B]' : 'text-[#0F172A]'}`}
          style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
        >
          {appointment.title}
        </p>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[#94A3B8]" />
            <span className="text-xs text-[#64748B]">{appointment.time}</span>
            <span className="text-[#E8EDF2]">·</span>
            <span className="text-xs text-[#94A3B8]">{appointment.duration} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={11} className="text-[#94A3B8]" />
            <span className="text-xs text-[#64748B]">{appointment.doctor}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isTele
              ? <Video size={11} className="text-[#94A3B8]" />
              : <MapPin size={11} className="text-[#94A3B8]" />
            }
            <span className="text-xs text-[#94A3B8] truncate max-w-[140px]">
              {isTele ? 'Video consultation' : (appointment.facility?.split(',')[0] ?? 'Location TBD')}
            </span>
          </div>
        </div>
      </div>

      {/* Right arrow */}
      <ChevronRight
        size={16}
        className="text-[#CBD5E1] group-hover:text-[#2563EB]
                   transition-colors flex-shrink-0"
      />
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   APPOINTMENT DETAIL MODAL
───────────────────────────────────────────── */
function AppointmentDetailModal({ appointment, onClose, onCancel, onJoinCall }) {
  if (!appointment) return null

  const typeMeta  = appointmentTypes[appointment.type] || appointmentTypes.neurology
  const isTele    = appointment.mode === 'telehealth'
  const isUpcoming = appointment.status === 'upcoming'

  const apptDate = new Date(appointment.date)
  const dateStr  = apptDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      size="lg"
      title={appointment.title}
      subtitle={`${typeMeta.label} · ${appointment.id}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {isTele && appointment.telehealth && (
            <Button
              variant="primary"
              size="sm"
              icon={<Video size={13} />}
              onClick={onJoinCall}
            >
              Join Video Call
            </Button>
          )}
          {isUpcoming && (
            <Button
              variant="danger"
              size="sm"
              icon={<X size={13} />}
              onClick={() => onCancel(appointment.id)}
            >
              Cancel Appointment
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">

        {/* Date + time hero */}
        <div
          className="rounded-xl p-5 bg-[#EFF6FF] border border-[#DBEAFE]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#2563EB] flex flex-col
                            items-center justify-center flex-shrink-0">
              <span className="text-white/70 text-[9px] font-bold uppercase tracking-wider">
                {apptDate.toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-white text-2xl font-bold leading-none"
                    style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}>
                {apptDate.getDate()}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1E3A8A]">{dateStr}</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#2563EB]" />
                  <span className="text-sm font-semibold text-[#2563EB]">
                    {appointment.time}
                  </span>
                </div>
                <span className="text-[#BFDBFE]">·</span>
                <span className="text-sm text-[#64748B]">
                  {appointment.duration} minutes
                </span>
              </div>
            </div>
            <div className="ml-auto">
              <StatusBadge
                variant={isUpcoming ? 'primary' : 'muted'}
                size="sm"
                dot
                pulse={isUpcoming}
              >
                {isUpcoming ? 'Upcoming' : 'Completed'}
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Physician */}
          <DetailBlock
            icon={<User size={14} className="text-[#2563EB]" />}
            label="Physician"
            value={appointment.doctor}
            sub={appointment.specialty}
            bg="#EFF6FF"
          />

          {/* Location */}
          <DetailBlock
            icon={isTele
              ? <Video size={14} className="text-[#0284C7]" />
              : <MapPin size={14} className="text-[#64748B]" />
            }
            label={isTele ? 'Visit Mode' : 'Location'}
            value={isTele ? 'Video Consultation' : appointment.facility}
            sub={isTele ? 'Online via MyChart' : appointment.room}
            bg={isTele ? '#E0F2FE' : '#F1F5F9'}
          />

          {/* Appointment type */}
          <DetailBlock
            icon={<Filter size={14} style={{ color: typeMeta.color }} />}
            label="Appointment Type"
            value={typeMeta.label}
            sub={appointment.typeLabel}
            bg={typeMeta.bg}
          />

          {/* Appointment ID */}
          <DetailBlock
            icon={<FileText size={14} className="text-[#94A3B8]" />}
            label="Appointment ID"
            value={appointment.id}
            bg="#F1F5F9"
          />
        </div>

        {/* Instructions */}
        {appointment.instructions && (
          <div className="bg-[#F8FAFC] border border-[#E8EDF2] rounded-xl p-4">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase
                          tracking-widest mb-2">
              Clinical Instructions
            </p>
            <p className="text-sm text-[#0F172A] leading-relaxed">
              {appointment.instructions}
            </p>
          </div>
        )}

        {/* Preparation notes */}
        {appointment.notes && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
            <p className="text-[10px] font-bold text-[#92400E] uppercase
                          tracking-widest mb-2">
              Preparation Notes
            </p>
            <p className="text-sm text-[#78350F] leading-relaxed">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Telehealth join */}
        {isTele && appointment.telehealth && isUpcoming && (
          <div className="rounded-xl p-4 flex items-center gap-4 bg-[#EFF6FF] border border-[#DBEAFE]">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center
                            justify-center flex-shrink-0">
              <Video size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1E3A8A]">
                Video Call Ready
              </p>
              <p className="text-xs text-[#2563EB]">
                {appointment.telehealth.platform}
              </p>
            </div>
            <button
              onClick={onJoinCall}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                         bg-[#2563EB] text-white text-xs font-semibold
                         hover:bg-[#1D4ED8] transition-colors"
            >
              <ExternalLink size={12} />
              Join Now
            </button>
          </div>
        )}

        {/* Address */}
        {!isTele && appointment.address && (
          <div className="flex items-start gap-3">
            <MapPin size={14} className="text-[#94A3B8] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#0F172A]">
                {appointment.facility}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">{appointment.address}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   BOOKING MODAL
───────────────────────────────────────────── */
function BookingModal({ isOpen, onClose }) {
  const [form, setForm] = useState({
    type:    '',
    doctor:  '',
    date:    '',
    time:    '',
    mode:    'in-person',
    notes:   '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setTimeout(() => setSubmitted(true), 600)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); setSubmitted(false) }}
      title={submitted ? 'Request Submitted' : 'Book Appointment'}
      subtitle={submitted
        ? 'Your request has been sent to the care team.'
        : 'Fill in the details to request a new appointment.'
      }
      size="md"
      footer={
        submitted ? (
          <Button variant="primary" size="sm" onClick={() => { onClose(); setSubmitted(false) }}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle size={13} />}
              onClick={handleSubmit}
            >
              Request Appointment
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center text-center py-6 gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center"
          >
            <CheckCircle size={32} className="text-[#16A34A]" />
          </motion.div>
          <div>
            <p className="text-sm font-bold text-[#0F172A]">
              Appointment Request Sent
            </p>
            <p className="text-xs text-[#64748B] mt-1 max-w-xs">
              Your care team will confirm within 24 hours.
              You will receive a notification once confirmed.
            </p>
          </div>
        </div>
      ) : (
        /* ── Form ── */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Appointment type */}
          <BookingField label="Appointment Type">
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                         bg-white text-sm text-[#0F172A]
                         focus:outline-none focus:border-[#2563EB]
                         focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="">Select type...</option>
              {Object.entries(appointmentTypes).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </BookingField>

          {/* Preferred doctor */}
          <BookingField label="Preferred Physician">
            <select
              name="doctor"
              value={form.doctor}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                         bg-white text-sm text-[#0F172A]
                         focus:outline-none focus:border-[#2563EB]
                         focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="">Select physician...</option>
              <option>Dr. Priya Nair — Vascular Neurology</option>
              <option>Dr. James Okafor — Interventional Neurology</option>
              <option>Dr. Sarah Chen — Pulmonology</option>
              <option>Dr. Rajan Mehta — Radiology</option>
              <option>Meera Pillai, NP — Neuro Rehabilitation</option>
            </select>
          </BookingField>

          {/* Date + time row */}
          <div className="grid grid-cols-2 gap-3">
            <BookingField label="Preferred Date">
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                           bg-white text-sm text-[#0F172A]
                           focus:outline-none focus:border-[#2563EB]
                           focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </BookingField>
            <BookingField label="Preferred Time">
              <select
                name="time"
                value={form.time}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                           bg-white text-sm text-[#0F172A]
                           focus:outline-none focus:border-[#2563EB]
                           focus:ring-4 focus:ring-[#2563EB]/10"
              >
                <option value="">Select...</option>
                {['8:00 AM','9:00 AM','10:00 AM','11:00 AM',
                  '1:00 PM','2:00 PM','3:00 PM','4:00 PM'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </BookingField>
          </div>

          {/* Visit mode */}
          <BookingField label="Visit Mode">
            <div className="flex gap-3">
              {[
                { label: 'In-Person', value: 'in-person', icon: MapPin },
                { label: 'Telehealth', value: 'telehealth', icon: Video },
              ].map(({ label, value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, mode: value }))}
                  className={`
                    flex-1 flex items-center justify-center gap-2
                    py-3 rounded-xl border text-sm font-semibold
                    transition-all duration-200
                    ${form.mode === value
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                      : 'bg-white border-[#E8EDF2] text-[#64748B] hover:border-[#94A3B8]'
                    }
                  `}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </BookingField>

          {/* Notes */}
          <BookingField label="Additional Notes (optional)">
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any specific concerns or requests..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EDF2]
                         bg-white text-sm text-[#0F172A] placeholder-[#94A3B8]
                         focus:outline-none focus:border-[#2563EB]
                         focus:ring-4 focus:ring-[#2563EB]/10 resize-none"
            />
          </BookingField>
        </form>
      )}
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function ApptStat({ label, value, color }) {
  return (
    <div
      className="bg-white rounded-xl border border-[#E8EDF2] p-4"
      style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}
    >
      <p
        className="text-2xl font-bold leading-none mb-1"
        style={{
          color,
          fontFamily: 'DM Sans, Inter, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
      <p className="text-xs text-[#64748B] font-medium">{label}</p>
    </div>
  )
}

function DetailBlock({ icon, label, value, sub, bg }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border border-[#E8EDF2]"
      style={{ backgroundColor: bg }}
    >
      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center
                      flex-shrink-0 border border-[#E8EDF2]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-[#0F172A] leading-snug truncate">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-[#64748B] mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

function BookingField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#0F172A]">
        {label}
      </label>
      {children}
    </div>
  )
}