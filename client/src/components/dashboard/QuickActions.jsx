import { motion } from 'framer-motion'
import { Upload, Calendar, Sparkles, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../common/Card.jsx'
import SectionTitle from '../common/SectionTitle.jsx'

const ACTIONS = [
  {
    label:    'Add a document',
    sub:      'Keep records together',
    icon:     Upload,
    color:    '#2563EB',
    bg:       '#EFF6FF',
    path:     '/reports',
  },
  {
    label:    'Plan a visit',
    sub:      'Schedule care',
    icon:     Calendar,
    color:    '#16A34A',
    bg:       '#DCFCE7',
    path:     '/appointments',
  },
  {
    label:    'Care guide',
    sub:      'Ask a health question',
    icon:     Sparkles,
    color:    '#7C3AED',
    bg:       '#EDE9FE',
    path:     '/ai',
  },
  {
    label:    'Care timeline',
    sub:      'Review your history',
    icon:     GitBranch,
    color:    '#D97706',
    bg:       '#FEF3C7',
    path:     '/timeline',
  },
]

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <Card variant="default" padding="md">
      <SectionTitle
        title="Quick Actions"
        className="mb-4"
      />

      <div className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action, i) => (
          <QuickActionButton
            key={action.label}
            action={action}
            index={i}
            onPress={() => navigate(action.path)}
          />
        ))}
      </div>
    </Card>
  )
}

function QuickActionButton({ action, index, onPress }) {
  const { label, sub, icon: Icon, color, bg } = action

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onPress}
      className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5
                 hover:border-[#BFDBFE] hover:bg-white
                 transition-all duration-200 text-left group"
    >
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ backgroundColor: bg }}
      >
        <Icon size={14} strokeWidth={1.7} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#0F172A] leading-snug">{label}</p>
        <p className="text-[10px] text-[#94A3B8] mt-0.5">{sub}</p>
      </div>
    </motion.button>
  )
}
