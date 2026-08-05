import { motion } from 'framer-motion'
import { FileText, Image, Dna, FlaskConical, ChevronRight, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from '../common/SectionTitle.jsx'
import Card from '../common/Card.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import { mockReports, reportTypes } from '../../data/mockReports.js'

const TYPE_ICONS = {
  imaging:       Image,
  liquid_biopsy: FlaskConical,
  genomics:      Dna,
  lab:           FlaskConical,
  pathology:     FileText,
  clinical_note: FileText,
  cardiology:    FileText,
}

export default function RecentReports() {
  const navigate = useNavigate()
  const recent   = mockReports.slice(0, 4)

  return (
    <Card variant="default" padding="lg">
      <SectionTitle
        title="Recent Reports"
        subtitle="Latest uploaded and reviewed documents"
        action={
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1 text-xs text-[#2563EB] font-semibold
                       hover:text-[#1D4ED8] transition-colors"
          >
            View all
            <ChevronRight size={13} />
          </button>
        }
        className="mb-5"
      />

      <div className="space-y-2">
        {recent.map((report, i) => (
          <ReportRow key={report.id} report={report} index={i} />
        ))}
      </div>
    </Card>
  )
}

function ReportRow({ report, index }) {
  const Icon    = TYPE_ICONS[report.type] || FileText
  const typeMeta= reportTypes[report.type] || reportTypes.clinical_note

  const statusVariant =
    report.status === 'reviewed' ? 'success' :
    report.status === 'pending'  ? 'warning' : 'muted'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC]
                 border border-transparent hover:border-[#E8EDF2]
                 transition-all duration-200 cursor-pointer group"
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: typeMeta.bg }}
      >
        <Icon size={15} style={{ color: typeMeta.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0F172A] truncate leading-snug">
          {report.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock size={11} className="text-[#94A3B8]" />
          <span className="text-xs text-[#64748B]">
            {new Date(report.reportDate).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>
          <span className="text-[#E8EDF2]">·</span>
          <span className="text-xs text-[#94A3B8]">{report.format}</span>
          <span className="text-[#E8EDF2]">·</span>
          <span className="text-xs text-[#94A3B8]">{report.size}</span>
        </div>
      </div>

      {/* Status + arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge variant={statusVariant} size="xs">
          {report.status === 'reviewed' ? 'Reviewed' : 'Pending'}
        </StatusBadge>
        <ChevronRight
          size={13}
          className="text-[#CBD5E1] group-hover:text-[#64748B] transition-colors"
        />
      </div>
    </motion.div>
  )
}