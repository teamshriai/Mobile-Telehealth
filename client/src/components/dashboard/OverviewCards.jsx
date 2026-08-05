import { motion } from 'framer-motion'
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

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay: i * 0.07,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
}

export default function OverviewCards({ patient }) {
  const navigate   = useNavigate()
  const { healthScore } = patient

  /* ── Card definitions ── */
  const cards = [
    {
      id:      'appointment',
      label:   'Next visit',
      value:   'Oct 28',
      sub:     'Dr. Priya Nair — 10:30 AM',
      icon:    Calendar,
      iconBg:  '#EFF6FF',
      iconColor:'#2563EB',
      trend:   null,
      badge:   '3 days away',
      badgeBg: '#FEF3C7',
      badgeColor:'#D97706',
      action:  () => navigate('/appointments'),
    },
    {
      id:      'wellbeing',
      label:   'Wellbeing trend',
      value:   'Stable',
      sub:     'Your recent check-ins',
      icon:    HeartPulse,
      iconBg:  '#EFF6FF',
      iconColor:'#2563EB',
      trend:   'down',
      trendLabel: '47% from peak',
      trendColor: '#16A34A',
      badge:   'On track',
      badgeBg: '#EFF6FF',
      badgeColor:'#2563EB',
      action:  () => navigate('/medical-records'),
    },
    {
      id:      'risk',
      label:   'Care tasks',
      value:   '03',
      sub:     'Small actions this week',
      icon:    TrendingDown,
      iconBg:  '#FEF3C7',
      iconColor:'#D97706',
      trend:   'down',
      trendLabel: 'All manageable',
      trendColor: '#16A34A',
      badge:   'This week',
      badgeBg: '#FEF3C7',
      badgeColor:'#D97706',
      action:  () => navigate('/medical-records'),
    },
    {
      id:      'health',
      label:   'Health overview',
      value:   `${healthScore.current}`,
      sub:     'Updated from your care plan',
      icon:    Activity,
      iconBg:  '#EFF6FF',
      iconColor:'#2563EB',
      trend:   'up',
      trendLabel: `+${healthScore.current - healthScore.previous} from last`,
      trendColor: '#16A34A',
      badge:   'Improving',
      badgeBg: '#DCFCE7',
      badgeColor:'#16A34A',
      action:  () => navigate('/profile'),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <OverviewCard key={card.id} card={card} index={i} />
      ))}
    </div>
  )
}

function OverviewCard({ card, index }) {
  const {
    label, value, sub, icon: Icon,
    iconBg, iconColor, trend, trendLabel,
    trendColor, badge, badgeBg, badgeColor, action,
  } = card

  const TrendIcon =
    trend === 'up'   ? ArrowUpRight :
    trend === 'down' ? ArrowDownRight : Minus

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={action}
      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.07)]"
      style={{
        boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04), 0 4px 16px 0 rgba(15,23,42,0.06)',
      }}
    >
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between">
        {/* Icon */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={15} strokeWidth={1.7} style={{ color: iconColor }} />
        </div>

        {/* Badge */}
        {badge && (
          <span
            className="px-2 py-1 rounded-lg text-[10px] font-semibold"
            style={{ backgroundColor: badgeBg, color: badgeColor }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="space-y-0.5 mb-3">
        <p className="text-xl font-semibold leading-none text-slate-900">
          {value}
        </p>
        <p className="text-xs text-[#64748B]">{sub}</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#F1F5F9] mb-3" />

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
          {label}
        </p>

        {trend && (
          <div className="flex items-center gap-1">
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
              {trendLabel}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}   
