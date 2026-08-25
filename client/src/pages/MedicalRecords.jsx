import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  FlaskConical,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Info,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  mockMutations,
  ctDNATrend,
  tumorSizeTrend,
  biomarkers,
} from '../data/mockGenes.js'
import { mockPatient } from '../data/mockPatients.js'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import SectionTitle from '../components/common/SectionTitle.jsx'
import Card from '../components/common/Card.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import ProgressRing from '../components/common/ProgressRing.jsx'

/* ── Page animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Chart tooltip ── */
function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E8EDF2] rounded-xl p-3 shadow-lg">
      <p className="text-xs font-semibold text-[#0F172A] mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-xs font-bold text-[#0F172A]">
            {p.value}{unit}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MedicalRecords() {
  const [activeTab, setActiveTab] = useState('genomics')
  const patient = mockPatient

  const tabs = [
    { id: 'genomics',   label: 'Imaging & Scans',    icon: Brain },
    { id: 'ctdna',      label: 'NIHSS Score Trend',  icon: Activity },
    { id: 'tumor',      label: 'Recovery Progress',  icon: TrendingDown },
    { id: 'biomarkers', label: 'Lab & Vitals',       icon: FlaskConical },
  ]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-[1100px] mx-auto space-y-7"
    >
      {/* ── Page header ── */}
      <SectionTitle
        title="Health Records"
        subtitle="A clear view of your records, results, and specialist information"
        size="xl"
      />

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Actionable Findings',
            value: mockMutations.filter(m => m.targetable).length,
            color: '#D97706', bg: '#FEF3C7',
          },
          {
            label: 'Imaging Studies',
            value: mockMutations.length,
            color: '#2563EB', bg: '#EFF6FF',
          },
          {
            label: 'Current NIHSS',
            value: `${patient.ctDNA.current}`,
            color: '#16A34A', bg: '#DCFCE7',
          },
          {
            label: 'mRS Improvement',
            value: '4 → 1',
            color: '#7C3AED', bg: '#EDE9FE',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#E8EDF2] p-4"
            style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}
          >
            <p
              className="text-2xl font-bold leading-none mb-1"
              style={{
                color: stat.color,
                fontFamily: 'DM Sans, Inter, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              {stat.value}
            </p>
            <p className="text-xs text-[#64748B] font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl border
                text-sm font-semibold transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-white text-[#64748B] border-[#E8EDF2] hover:border-[#94A3B8]'
                }
              `}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'genomics'   && <GenomicsTab   mutations={mockMutations} />}
          {activeTab === 'ctdna'      && <CtDNATab      data={ctDNATrend} />}
          {activeTab === 'tumor'      && <TumorTab      data={tumorSizeTrend} />}
          {activeTab === 'biomarkers' && <BiomarkersTab data={biomarkers} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   GENOMICS TAB
───────────────────────────────────────────── */
function GenomicsTab({ mutations }) {
  const [expandedId, setExpandedId] = useState('MUT-001')

  const detected   = mutations.filter(m => m.status === 'Detected')
  const undetected = mutations.filter(m => m.status === 'Not Detected')

  return (
    <div className="space-y-6">

      {/* Summary rings */}
      <Card variant="default" padding="lg">
        <SectionTitle
          title="Imaging Summary"
          subtitle="CT Angiogram — Brain & Neck — Feb 2024"
          className="mb-6"
        />
        <div className="flex flex-wrap gap-8 items-center">
          <div className="flex flex-wrap gap-8 justify-around w-full sm:w-auto sm:justify-start">
            <ProgressRing
              value={2}
              max={7}
              size={90}
              strokeWidth={7}
              color="#D97706"
              label="Actionable"
              sublabel="findings"
              fontSize="text-2xl"
            />
            <ProgressRing
              value={3}
              max={7}
              size={90}
              strokeWidth={7}
              color="#DC2626"
              label="Detected"
              sublabel="findings"
              fontSize="text-2xl"
            />
            <ProgressRing
              value={8}
              max={10}
              size={90}
              strokeWidth={7}
              color="#16A34A"
              label="ASPECTS"
              sublabel="Score (Favorable)"
              fontSize="text-2xl"
            />
          </div>
          <div className="flex-1 min-w-[200px] space-y-3">
            {[
              { label: 'Occlusion Site',           value: 'Left MCA — M1 segment',        color: '#DC2626' },
              { label: 'Hemorrhagic Transformation',value: 'None Identified',              color: '#16A34A' },
              { label: 'Collateral Circulation',    value: 'Good — Grade 3',               color: '#0EA5E9' },
              { label: 'Imaging Protocol',          value: 'Stroke CTA/CTP Protocol v2.1', color: '#64748B' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <p className="text-xs text-[#64748B]">{label}</p>
                <p className="text-xs font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Detected mutations */}
      <Card variant="default" padding="lg">
        <SectionTitle
          title="Positive Findings"
          subtitle={`${detected.length} findings identified across ${mutations.length} imaging studies`}
          className="mb-5"
        />
        <div className="space-y-3">
          {detected.map((mutation, i) => (
            <MutationRow
              key={mutation.id}
              mutation={mutation}
              index={i}
              isExpanded={expandedId === mutation.id}
              onToggle={() => setExpandedId(
                expandedId === mutation.id ? null : mutation.id
              )}
            />
          ))}
        </div>
      </Card>

      {/* Not detected */}
      <Card variant="ghost" padding="lg">
        <SectionTitle
          title="Not Detected"
          subtitle="Additional studies reviewed with no abnormal findings"
          className="mb-4"
        />
        <div className="flex flex-wrap gap-2">
          {undetected.map((mutation) => (
            <div
              key={mutation.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl
                         bg-white border border-[#E8EDF2]"
            >
              <XCircle size={13} className="text-[#CBD5E1]" />
              <span className="text-xs font-bold text-[#64748B]">{mutation.gene}</span>
              <span className="text-[10px] text-[#94A3B8]">{mutation.type}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ── Mutation row with expand ── */
function MutationRow({ mutation, index, isExpanded, onToggle }) {
  const tierColors = {
    'I':   { bg: '#FEE2E2', color: '#DC2626', label: 'Critical' },
    'II':  { bg: '#FEF3C7', color: '#D97706', label: 'Moderate' },
    'N/A': { bg: '#F1F5F9', color: '#94A3B8', label: 'N/A' },
  }
  const tier = tierColors[mutation.tier] || tierColors['N/A']

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-[#E8EDF2] overflow-hidden bg-white"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer
                   hover:bg-[#FAFBFC] transition-colors"
        onClick={onToggle}
      >
        {/* Gene + status */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center
                          justify-center flex-shrink-0">
            <Brain size={16} className="text-[#DC2626]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-[#0F172A]">{mutation.gene}</p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: tier.bg, color: tier.color }}
              >
                {tier.label}
              </span>
              {mutation.targetable && (
                <StatusBadge variant="warning" size="xs">Actionable</StatusBadge>
              )}
              {mutation.clinicalTrial && (
                <StatusBadge variant="info" size="xs">Trial Eligible</StatusBadge>
              )}
            </div>
            <p className="text-xs text-[#64748B] truncate mt-0.5">
              {mutation.variant}
            </p>
          </div>
        </div>

        {/* Confidence */}
        {mutation.vaf > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-[#94A3B8] font-medium">Confidence</p>
            <p className="text-sm font-bold text-[#0F172A]">
              {(mutation.vaf * 100).toFixed(0)}%
            </p>
          </div>
        )}

        {/* Toggle */}
        <div className="w-7 h-7 rounded-xl bg-[#F1F5F9] flex items-center
                        justify-center flex-shrink-0">
          {isExpanded
            ? <ChevronUp size={13} className="text-[#64748B]" />
            : <ChevronDown size={13} className="text-[#64748B]" />
          }
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1,
              transition: {
                height:  { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2, delay: 0.05 },
              }
            }}
            exit={{ height: 0, opacity: 0,
              transition: {
                height:  { duration: 0.25 },
                opacity: { duration: 0.15 },
              }
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#F1F5F9]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Finding Type',        value: mutation.type },
                  { label: 'Classification',      value: mutation.classification },
                  { label: 'Location',            value: mutation.chromosome },
                  { label: 'Images Analyzed',     value: `${mutation.coverage} slices` },
                  { label: 'Confidence',          value: mutation.vaf > 0 ? `${(mutation.vaf * 100).toFixed(0)}%` : 'N/A' },
                  { label: 'Significance',        value: mutation.significance },
                  { label: 'Recommended Treatment',value: mutation.therapy || 'None' },
                  { label: 'Trial Eligibility',   value: mutation.clinicalTrial ? 'Eligible' : 'None' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F8FAFC] border border-[#E8EDF2] rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-[#94A3B8]
                                  uppercase tracking-wider mb-1">
                      {label}
                    </p>
                    <p className="text-xs font-bold text-[#0F172A]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   ctDNA TAB
───────────────────────────────────────────── */
function CtDNATab({ data }) {
  const chartData = data.filter(d => d.value !== null)

  return (
    <div className="space-y-5">
      <Card variant="default" padding="lg">
        <SectionTitle
          title="NIHSS Score Trend"
          subtitle="National Institutes of Health Stroke Scale — assessed at each care milestone"
          className="mb-6"
        />

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: 'Peak NIHSS (at onset)', value: '15', color: '#DC2626', bg: '#FEE2E2' },
            { label: 'Current NIHSS',         value: '3',  color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Total Improvement',     value: '80%', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Trend',                 value: 'Decreasing', color: '#16A34A', bg: '#DCFCE7' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
              style={{ backgroundColor: item.bg, borderColor: `${item.color}30` }}
            >
              <p className="text-xs text-[#64748B]">{item.label}</p>
              <p className="text-sm font-bold" style={{ color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ctdnaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone" dataKey="value"
              stroke="#2563EB" strokeWidth={2.5}
              fill="url(#ctdnaAreaGrad)"
              dot={{ fill: '#2563EB', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#2563EB', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Cycle labels */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
          {chartData.map((d) => (
            <div key={d.month} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span className="text-[10px] text-[#94A3B8]">
                {d.month}: <span className="font-bold text-[#0F172A]">{d.value}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* No resistance card */}
      <Card variant="gradient" padding="lg">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#0F172A]">
              No New Neurological Deficits
            </p>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              Serial NIHSS assessments show steady neurological improvement
              with no new deficits or complications since admission. Continued
              monitoring at each follow-up visit is recommended.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   TUMOR RESPONSE TAB
───────────────────────────────────────────── */
function TumorTab({ data }) {
  return (
    <div className="space-y-5">
      <Card variant="default" padding="lg">
        <SectionTitle
          title="Modified Rankin Scale (mRS)"
          subtitle="Functional independence over time — lower score indicates greater independence"
          className="mb-6"
        />

        {/* Recovery banner */}
        <div className="rounded-xl p-4 mb-6 bg-[#DCFCE7] border border-[#BBF7D0]">
          <div className="flex items-center gap-3">
            <CheckCircle size={18} className="text-[#16A34A]" />
            <div>
              <p className="text-sm font-bold text-[#14532D]">
                Significant Improvement
              </p>
              <p className="text-xs text-[#166534]">
                mRS improved from 4 to 1 since admission — Confirmed April 2024
              </p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tumorBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}`} domain={[0, 6]} />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="size" fill="url(#tumorBarGrad)"
              radius={[6, 6, 0, 0]} maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Measurements */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
          {data.map((d) => (
            <div key={d.month} className="bg-[#F8FAFC] border border-[#E8EDF2] rounded-xl p-3">
              <p className="text-[10px] text-[#94A3B8] font-medium">{d.month}</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5">mRS {d.size}</p>
              <p className="text-[10px] text-[#94A3B8]">{d.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   BIOMARKERS TAB
───────────────────────────────────────────── */
function BiomarkersTab({ data }) {
  const trendConfig = {
    decreasing: { color: '#16A34A', label: 'Decreasing' },
    stable:     { color: '#2563EB', label: 'Stable' },
    improving:  { color: '#16A34A', label: 'Improving' },
    increasing: { color: '#DC2626', label: 'Increasing' },
  }

  return (
    <div className="space-y-5">
      <Card variant="default" padding="lg">
        <SectionTitle
          title="Stroke Risk Labs & Vitals"
          subtitle="INR, lipid panel, glucose, and blood pressure monitoring — Jun 2024"
          className="mb-5"
        />

        <div className="space-y-3">
          {data.map((bm, i) => {
            const trend = trendConfig[bm.trend] || trendConfig.stable
            const pct   = Math.min((bm.value / parseFloat(bm.normal.replace(/[^0-9.]/g, ''))) * 100, 100)

            return (
              <motion.div
                key={bm.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 rounded-xl border border-[#E8EDF2] bg-[#FAFBFC]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                      <BarChart3 size={15} className="text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{bm.name}</p>
                      <p className="text-xs text-[#94A3B8]">
                        Normal: {bm.normal}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#0F172A]"
                       style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}>
                      {bm.value}
                      <span className="text-xs font-medium text-[#94A3B8] ml-1">
                        {bm.unit}
                      </span>
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: trend.color }}>
                      {trend.label}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[#E8EDF2] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: bm.status === 'normal' ? '#16A34A' : '#DC2626' }}
                  />
                </div>

                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#94A3B8]">0</span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {bm.status === 'normal' ? 'Within normal range' : 'Above normal'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
