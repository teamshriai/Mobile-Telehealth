import { Calendar, Clock, MapPin, Video, ChevronRight, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Card from '../common/Card.jsx'
import SectionTitle from '../common/SectionTitle.jsx'

export default function AppointmentCard({ appointment }) {
  const navigate = useNavigate()

  if (!appointment) return null

  const isTelemedicine = appointment.mode === 'telehealth'
  const apptDate = new Date(appointment.date)
  const dayName  = apptDate.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr  = apptDate.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <Card variant="default" padding="lg">
      <SectionTitle
        title="Next Appointment"
        action={
          <button
            onClick={() => navigate('/dashboard/appointments')}
            className="flex items-center gap-1 text-xs text-[#2563EB] font-semibold
                       hover:text-[#1D4ED8] transition-colors"
          >
            All
            <ChevronRight size={13} />
          </button>
        }
        className="mb-4"
      />

      {/* Date banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl p-4 mb-4"
        style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' }}
      >
        <div className="flex items-start gap-3">
          {/* Calendar icon block */}
          <div className="flex-shrink-0 w-12 h-12 bg-[#2563EB] rounded-xl
                          flex flex-col items-center justify-center">
            <span className="text-white text-[10px] font-semibold uppercase leading-none">
              {apptDate.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-white text-lg font-bold leading-none mt-0.5">
              {apptDate.getDate()}
            </span>
          </div>

          {/* Date info */}
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1E3A8A]">{dayName}</p>
            <p className="text-xs text-[#3B82F6]">{dateStr}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={11} className="text-[#2563EB]" />
              <span className="text-xs font-semibold text-[#2563EB]">
                {appointment.time}
              </span>
              <span className="text-[#BFDBFE] text-xs">·</span>
              <span className="text-xs text-[#64748B]">
                {appointment.duration} min
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Appointment details */}
      <div className="space-y-3">
        {/* Title */}
        <div>
          <p className="text-sm font-bold text-[#0F172A]">{appointment.title}</p>
          <p className="text-xs text-[#64748B] mt-0.5">{appointment.typeLabel}</p>
        </div>

        {/* Doctor */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6]
                          flex items-center justify-center flex-shrink-0">
            <User size={12} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">{appointment.doctor}</p>
            <p className="text-[10px] text-[#94A3B8]">{appointment.specialty}</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2.5">
          {isTelemedicine ? (
            <Video size={14} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
          ) : (
            <MapPin size={14} className="text-[#64748B] mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="text-xs font-medium text-[#0F172A]">
              {isTelemedicine ? 'Video Consultation' : appointment.facility}
            </p>
            {!isTelemedicine && appointment.room && (
              <p className="text-[10px] text-[#94A3B8]">{appointment.room}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
            <p className="text-[10px] font-semibold text-[#92400E] mb-1 uppercase tracking-wider">
              Preparation Notes
            </p>
            <p className="text-xs text-[#78350F] leading-relaxed">
              {appointment.notes}
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <button
        onClick={() => navigate('/dashboard/appointments')}
        className="mt-4 w-full py-2.5 rounded-xl bg-[#2563EB] text-white
                   text-xs font-semibold hover:bg-[#1D4ED8] transition-colors
                   flex items-center justify-center gap-2"
      >
        <Calendar size={13} />
        View All Appointments
      </button>
    </Card>
  )
}