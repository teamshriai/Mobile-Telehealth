import {
  Calendar,
  HeartPulse,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OverviewCards({ patient }) {
  const navigate   = useNavigate()
  const { healthScore } = patient

  const cards = [
    {
      id:      'appointment',
      label:   'Next Visit',
      value:   'Oct 28',
      sub:     'Dr. Priya Nair — 10:30 AM',
      icon:    Calendar,
      badge:   '3 days away',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      action:  () => navigate('/dashboard/appointments'),
    },
    {
      id:      'wellbeing',
      label:   'Wellbeing Trend',
      value:   'Stable',
      sub:     'Recent health check-ins',
      icon:    HeartPulse,
      badge:   'On track',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      action:  () => navigate('/dashboard/medical-records'),
    },
    {
      id:      'risk',
      label:   'Care Tasks',
      value:   '03 Pending',
      sub:     'Routine tasks for this week',
      icon:    TrendingDown,
      badge:   'This week',
      badgeBg: 'bg-gray-100 text-gray-700 border-gray-200',
      action:  () => navigate('/dashboard/medical-records'),
    },
    {
      id:      'health',
      label:   'Health Overview',
      value:   `${healthScore.current} / 100`,
      sub:     'Overall wellness score',
      icon:    Activity,
      badge:   'Improving',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      action:  () => navigate('/dashboard/profile'),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <OverviewCard key={card.id} card={card} />
      ))}
    </div>
  )
}

function OverviewCard({ card }) {
  const { label, value, sub, icon: Icon, badge, badgeBg, action } = card

  return (
    <div
      onClick={action}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-500"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
          <Icon size={18} strokeWidth={1.8} />
        </div>

        {badge && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badgeBg}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1 mb-2">
        <p className="text-lg font-bold text-gray-900 leading-none">
          {value}
        </p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs font-semibold text-blue-600 group-hover:underline">
          View details →
        </span>
      </div>
    </div>
  )
}
