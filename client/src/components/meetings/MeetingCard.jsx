import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Video,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  Lock,
  Copy,
  Check,
  Play,
} from 'lucide-react'

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
      className={`rounded-xl p-5 border flex flex-col justify-between transition-colors bg-white ${
        isLive ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Live Now
              </span>
            ) : isUpcoming ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                <Clock size={12} />
                Upcoming
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                Completed
              </span>
            )}
            <span className="text-xs font-mono text-gray-500">#{meeting.id}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Secure Video</span>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="flex items-center gap-3.5 mb-4">
          <img
            src={meeting.avatar}
            alt={meeting.doctor}
            className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 leading-snug truncate">
              {meeting.title}
            </h3>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">{meeting.doctor}</p>
            <p className="text-xs text-gray-500">{meeting.specialty} · {meeting.department}</p>
          </div>
        </div>

        {/* Schedule & Timing Box */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs mb-3 text-gray-700">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar size={14} className="text-gray-500 flex-shrink-0" />
            <span>{meeting.date}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock size={14} className="text-gray-500 flex-shrink-0" />
            <span>{meeting.startTime}</span>
          </div>
        </div>

        {/* Notes preview */}
        {meeting.notes && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-4">
            <strong className="text-gray-800 font-semibold">Agenda: </strong>
            {meeting.notes}
          </p>
        )}
      </div>

      {/* Footer Action Buttons & Passcode */}
      <div className="pt-3 border-t border-gray-100 space-y-2.5">
        {meeting.passcode && (
          <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
            <span className="flex items-center gap-1.5">
              <Lock size={12} className="text-gray-400" />
              PIN: <strong className="font-mono text-gray-900">{meeting.passcode}</strong>
            </span>
            <button
              onClick={copyPasscode}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {isLive ? (
          <button
            onClick={() => onJoin(meeting)}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Video size={16} />
            <span>Join Meeting Now</span>
          </button>
        ) : isUpcoming ? (
          <button
            onClick={() => onJoin(meeting)}
            className="w-full py-2.5 px-4 rounded-lg bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Video size={16} />
            <span>Join Meeting Room</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onJoin(meeting)}
              className="flex-1 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText size={14} />
              <span>Summary</span>
            </button>
            {meeting.recordingUrl && (
              <a
                href={meeting.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
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
