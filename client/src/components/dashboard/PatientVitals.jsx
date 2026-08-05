import { motion } from 'framer-motion'
import { Heart, Wind, Thermometer, Activity } from 'lucide-react'
import Card from '../common/Card.jsx'
import SectionTitle from '../common/SectionTitle.jsx'

const VITALS = (vitals) => [
  {
    label:  'Heart Rate',
    value:  vitals.heartRate,
    unit:   'bpm',
    icon:   Heart,
    color:  '#DC2626',
    bg:     '#FEE2E2',
    normal: '60–100 bpm',
    status: 'normal',
  },
  {
    label:  'Blood Pressure',
    value:  vitals.bloodPressure,
    unit:   'mmHg',
    icon:   Activity,
    color:  '#2563EB',
    bg:     '#EFF6FF',
    normal: '< 120/80',
    status: 'normal',
  },
  {
    label:  'SpO₂',
    value:  vitals.oxygenSat,
    unit:   '%',
    icon:   Wind,
    color:  '#16A34A',
    bg:     '#DCFCE7',
    normal: '95–100%',
    status: 'normal',
  },
  {
    label:  'Temperature',
    value:  vitals.temperature,
    unit:   '°F',
    icon:   Thermometer,
    color:  '#D97706',
    bg:     '#FEF3C7',
    normal: '97–99°F',
    status: 'normal',
  },
]

export default function PatientVitals({ vitals }) {
  const vitalList = VITALS(vitals)

  return (
    <Card variant="default" padding="lg">
      <SectionTitle
        title="Current Vitals"
        subtitle={`Updated ${new Date(vitals.lastUpdated).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        })}`}
        className="mb-4"
      />

      <div className="grid grid-cols-2 gap-3">
        {vitalList.map((vital, i) => (
          <VitalItem key={vital.label} vital={vital} index={i} />
        ))}
      </div>
    </Card>
  )
}

function VitalItem({ vital, index }) {
  const { label, value, unit, icon: Icon, color, bg, normal, status } = vital

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.07,
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="rounded-xl p-3 border border-[#E8EDF2] bg-[#FAFBFC]
                 hover:border-[#BFDBFE] transition-colors duration-200"
    >
      {/* Icon + status */}
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          <Icon size={13} style={{ color }} />
        </div>
        {status === 'normal' && (
          <span className="text-[9px] font-bold text-[#16A34A] bg-[#DCFCE7]
                           px-1.5 py-0.5 rounded-md">
            Normal
          </span>
        )}
      </div>

      {/* Value */}
      <p
        className="text-base font-bold text-[#0F172A] leading-none"
        style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
      >
        {value}
        <span className="text-xs font-medium text-[#94A3B8] ml-1">{unit}</span>
      </p>

      {/* Label */}
      <p className="text-[10px] text-[#64748B] font-medium mt-1">{label}</p>
      <p className="text-[9px] text-[#CBD5E1] mt-0.5">Ref: {normal}</p>
    </motion.div>
  )
}