import { useState } from 'react'
import {
  Video,
  Calendar,
  Clock,
  FileText,
  Lock,
  Copy,
  Check,
  Play,
} from 'lucide-react'
import Button from '../common/Button.jsx'
import StatusBadge from '../common/StatusBadge.jsx'

export default function MeetingCard({ meeting, onJoin }) {
  const [copied, setCopied] = useState(false)
  const isLive = meeting.status === 'live'
  const isUpcoming = meeting.status === 'upcoming'

  const copyPasscode = (e) => {
    e.stopPropagation()
    if (meeting.passcode) {
      navigator.clipboard.writeText(meeting.passcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className={`rounded-xl p-5 border flex flex-col justify-between transition-all duration-200 card-hover bg-white ${
        isLive ? 'border-[#2563EB]' : 'border-[#E8EDF2] hover:border-[#CBD5E1]'
      }`}
      style={isLive ? { background: 'linear-gradient(160deg, #FFFFFF 0%, #EFF6FF 100%)' } : undefined}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {isLive ? (
              <StatusBadge variant="success" size="sm" dot pulse>Live Now</StatusBadge>
            ) : isUpcoming ? (
              <StatusBadge variant="primary" size="sm">
                <Clock size={12} />
                Upcoming
              </StatusBadge>
            ) : (
              <StatusBadge variant="muted" size="sm">Completed</StatusBadge>
            )}
            <span className="text-xs font-mono text-[#94A3B8]">#{meeting.id}</span>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="flex items-center gap-3.5 mb-4">
          <img
            src={meeting.avatar}
            alt={meeting.doctor}
            className="w-12 h-12 rounded-lg object-cover border border-[#E8EDF2] flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#0F172A] leading-snug truncate">
              {meeting.title}
            </h3>
            <p className="text-xs font-semibold text-[#2563EB] mt-0.5">{meeting.doctor}</p>
            <p className="text-xs text-[#64748B]">{meeting.specialty} · {meeting.department}</p>
          </div>
        </div>

        {/* Schedule & Timing Box */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E8EDF2] text-xs mb-3 text-[#475569]">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar size={14} className="text-[#94A3B8] flex-shrink-0" />
            <span>{meeting.date}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock size={14} className="text-[#94A3B8] flex-shrink-0" />
            <span>{meeting.startTime}</span>
          </div>
        </div>

        {/* Notes preview */}
        {meeting.notes && (
          <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed mb-4">
            <strong className="text-[#0F172A] font-semibold">Notes: </strong>
            {meeting.notes}
          </p>
        )}
      </div>

      {/* Footer Action Buttons & Passcode */}
      <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
        {meeting.passcode && (
          <div className="flex items-center justify-between text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E8EDF2]">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-[#94A3B8]" />
              PIN: <strong className="font-mono text-[#0F172A]">{meeting.passcode}</strong>
            </span>
            <button
              onClick={copyPasscode}
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1"
            >
              {copied ? <Check size={12} className="text-[#16A34A]" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {isLive ? (
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={<Video size={16} />}
            onClick={() => onJoin(meeting)}
          >
            Join Meeting Now
          </Button>
        ) : isUpcoming ? (
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={<Video size={16} />}
            onClick={() => onJoin(meeting)}
          >
            Join Meeting Room
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<FileText size={14} />}
              onClick={() => onJoin(meeting)}
              className="flex-1"
            >
              Summary
            </Button>
            {meeting.recordingUrl && (
              <a
                href={meeting.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-3 rounded-lg border border-transparent hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play size={14} />
                <span>Recording</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
