import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingDown, Pill } from 'lucide-react'
import SectionTitle from '../common/SectionTitle.jsx'
import Card from '../common/Card.jsx'
import { ctDNATrend } from '../../data/mockGenes.js'

/* ── Custom tooltip for the chart ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-[#E8EDF2] rounded-2xl p-3 shadow-lg">
      <p className="text-xs font-semibold text-[#0F172A] mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-xs text-[#64748B]">ctDNA:</span>
          <span className="text-xs font-bold text-[#0F172A]">
            {p.value}% MAF
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TreatmentProgress({ patient }) {
  const { treatment } = patient

  /* Filter out null values for the chart */
  const chartData = ctDNATrend.filter((d) => d.value !== null)

  const progressPct = Math.round(
    (treatment.cycle / treatment.totalCycles) * 100
  )

  return (
    <Card variant="default" padding="lg">
      <SectionTitle
        title="Treatment Progress"
        subtitle={`${treatment.currentRegimen} — Cycle ${treatment.cycle} of ${treatment.totalCycles}`}
        className="mb-6"
      />

      {/* Treatment meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Current Cycle',  value: `${treatment.cycle}/${treatment.totalCycles}` },
          { label: 'Response',       value: 'Partial Response' },
          { label: 'Start Date',     value: 'Nov 2023' },
          { label: 'Next Review',    value: 'Nov 15, 2024' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E8EDF2]"
          >
            <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-[#0F172A]">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Cycle progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Pill size={13} className="text-[#2563EB]" />
            <span className="text-xs font-semibold text-[#0F172A]">
              Treatment Cycle Progress
            </span>
          </div>
          <span className="text-xs font-bold text-[#2563EB]">
            {progressPct}%
          </span>
        </div>
        <div className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#94A3B8]">Cycle 1 — Nov 2023</span>
          <span className="text-[10px] text-[#94A3B8]">Cycle 18 — May 2025</span>
        </div>
      </div>

      {/* ctDNA trend chart */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={13} className="text-[#16A34A]" />
          <span className="text-xs font-semibold text-[#0F172A]">
            ctDNA Trend (% MAF)
          </span>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold
                           bg-[#DCFCE7] text-[#16A34A]">
            -78% from peak
          </span>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="ctdnaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F1F5F9"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#ctdnaGrad)"
              dot={{ fill: '#2563EB', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}