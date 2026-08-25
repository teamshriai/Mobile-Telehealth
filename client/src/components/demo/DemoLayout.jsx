import { Link } from 'react-router-dom'
import { ArrowLeft, MonitorPlay } from 'lucide-react'
import BrandMark from '../common/BrandMark.jsx'

const ACCENTS = {
  blue:   { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  purple: { bg: '#EDE9FE', color: '#7C3AED', border: '#DDD6FE' },
  green:  { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' },
  amber:  { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
}

/**
 * Shared chrome for the /demo/* role-preview pages.
 * These are public, unauthenticated pages showing frontend-only mock
 * consoles for roles this app has no real login for (dispatcher, ambulance
 * crew, scan lab, radiologist, hospital hub, telehealth doctor). They are
 * NOT part of the authenticated patient app's navigation.
 */
export default function DemoLayout({ role, accent = 'blue', children }) {
  const a = ACCENTS[accent] || ACCENTS.blue

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <header className="sticky top-0 z-20 border-b border-[#E8EDF2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 sm:px-6 py-3">
          <Link to="/demo" className="flex items-center gap-2 flex-shrink-0">
            <BrandMark size={14} />
            <span className="text-sm font-bold text-[#0F172A] tracking-tight hidden sm:inline">Stroke AI</span>
          </Link>
          <span className="text-[#CBD5E1] hidden sm:inline">/</span>
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-semibold flex-shrink-0"
            style={{ background: a.bg, color: a.color }}
          >
            {role}
          </span>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden md:flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] border border-[#E8EDF2] px-2.5 py-1 text-[11px] font-medium text-[#64748B]">
              <MonitorPlay size={12} />
              Frontend demo — not connected to a live system
            </span>
            <Link
              to="/demo"
              className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              <ArrowLeft size={13} /> All Roles
            </Link>
          </div>
        </div>
        <span className="block h-0.5 w-full" style={{ background: a.color, opacity: 0.85 }} />
      </header>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-6">
        <div className="md:hidden flex items-center gap-1.5 rounded-lg bg-[#F1F5F9] border border-[#E8EDF2] px-2.5 py-1.5 text-[11px] font-medium text-[#64748B] w-fit">
          <MonitorPlay size={12} />
          Frontend demo — not a live system
        </div>
        {children}
      </main>
    </div>
  )
}

export { ACCENTS }
