import { useNavigate } from 'react-router-dom'
import { GitBranch, Activity, FileText, Calendar, Sparkles, ChevronRight } from 'lucide-react'
import { mockTimeline } from '../../data/mockTimeline.js'
import { mockMutations } from '../../data/mockGenes.js'
import { mockReports } from '../../data/mockReports.js'
import { mockAppointments } from '../../data/mockAppointments.js'

const findingsCount = mockMutations.filter((m) => m.status !== 'Not Detected').length
const pendingReports = mockReports.filter((r) => r.status === 'pending').length
const nextAppointment = mockAppointments.find((a) => a.status === 'upcoming')

const SPOKES = [
  {
    label: 'Care Journey',
    path: '/dashboard/timeline',
    icon: GitBranch,
    status: `${mockTimeline.length} milestones logged`,
    accent: 'primary',
  },
  {
    label: 'Health Records',
    path: '/dashboard/medical-records',
    icon: Activity,
    status: `${findingsCount} active finding${findingsCount === 1 ? '' : 's'}`,
    accent: 'warning',
  },
  {
    label: 'Reports',
    path: '/dashboard/reports',
    icon: FileText,
    status: pendingReports > 0 ? `${pendingReports} pending review` : 'All reports reviewed',
    accent: pendingReports > 0 ? 'warning' : 'success',
  },
  {
    label: 'Appointments',
    path: '/dashboard/appointments',
    icon: Calendar,
    status: nextAppointment
      ? `Next: ${new Date(nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'None scheduled',
    accent: 'primary',
  },
  {
    label: 'AI Assistant',
    path: '/dashboard/ai',
    icon: Sparkles,
    status: 'New insight available',
    accent: 'purple',
  },
]

const ACCENTS = {
  primary: { bg: '#EFF6FF', color: '#2563EB' },
  warning: { bg: '#FEF3C7', color: '#D97706' },
  success: { bg: '#DCFCE7', color: '#16A34A' },
  purple:  { bg: '#EDE9FE', color: '#7C3AED' },
}

export default function SpokeRail() {
  const navigate = useNavigate()

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-[#E8EDF2]/80
                 rounded-xl border border-white/60 overflow-hidden backdrop-blur-xl"
      style={{
        background: 'rgba(255,255,255,0.7)',
        boxShadow: '0 20px 60px 0 rgba(15,23,42,0.06)',
      }}
    >
      {SPOKES.map((spoke) => {
        const accent = ACCENTS[spoke.accent]
        return (
          <button
            key={spoke.path}
            type="button"
            onClick={() => navigate(spoke.path)}
            className="flex items-center gap-2.5 bg-transparent
                       px-3.5 py-3 text-left transition-colors duration-150
                       hover:bg-white/70 group"
          >
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: accent.bg, color: accent.color }}
            >
              <spoke.icon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[#0F172A] truncate">{spoke.label}</span>
              <span className="block text-[10px] text-[#94A3B8] truncate">{spoke.status}</span>
            </span>
            <ChevronRight size={13} className="text-[#CBD5E1] group-hover:text-[#94A3B8] flex-shrink-0" />
          </button>
        )
      })}
    </div>
  )
}
