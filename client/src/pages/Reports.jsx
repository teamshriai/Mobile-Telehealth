import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Search,
  Filter,
  FileText,
  Brain,
  Activity,
  FlaskConical,
  ChevronDown,
  X,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import { mockReports, reportTypes } from '../data/mockReports.js'
import SectionTitle from '../components/common/SectionTitle.jsx'
import StatusBadge from '../components/common/StatusBadge.jsx'
import SearchBar from '../components/common/SearchBar.jsx'
import Card from '../components/common/Card.jsx'
import Modal from '../components/common/Modal.jsx'
import Button from '../components/common/Button.jsx'

/* ── Page entry animation ── */
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

/* ── Upload accepted formats ── */
const ACCEPTED_FORMATS = ['PDF', 'DICOM', 'Image', 'CSV', 'VCF']

/* ── Type icon map ── */
const TYPE_ICONS = {
  imaging:          Brain,
  lab:              FlaskConical,
  nihss_assessment: Activity,
  clinical_note:    FileText,
  cardiology:       FileText,
}

/* ── Filter options ── */
const TYPE_FILTERS = [
  { label: 'All Types',        value: 'all' },
  { label: 'Imaging',          value: 'imaging' },
  { label: 'Lab Results',      value: 'lab' },
  { label: 'NIHSS Assessment', value: 'nihss_assessment' },
  { label: 'Clinical Note',    value: 'clinical_note' },
  { label: 'Cardiology',       value: 'cardiology' },
]

const STATUS_FILTERS = [
  { label: 'All Status', value: 'all' },
  { label: 'Reviewed',   value: 'reviewed' },
  { label: 'Pending',    value: 'pending' },
]

/**
 * There's no real file-storage backend behind these reports (mock data —
 * see architecture audit), so there is no actual document to download.
 * Rather than a dead button or a fabricated "here's your PDF", this saves
 * a plain-text summary built only from the report's own real fields —
 * genuinely downloadable, honestly labeled, nothing invented.
 */
function downloadReportSummary(report) {
  const lines = [
    report.name,
    `Type: ${reportTypes[report.type]?.label ?? report.type}`,
    `Report date: ${report.reportDate}`,
    `Source: ${report.source}`,
    `Status: ${report.status}`,
    report.reviewedBy ? `Reviewed by: ${report.reviewedBy}` : null,
    '',
    report.summary || 'No summary available.',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.name.replace(/[^\w.-]+/g, '_')}-summary.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [reports,      setReports]      = useState(mockReports)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy,       setSortBy]       = useState('date')
  const [isDragging,   setIsDragging]   = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [previewReport, setPreviewReport] = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  const fileInputRef = useRef(null)

  /* ── Filter + sort logic ── */
  const filtered = reports
    .filter((r) => {
      const matchType   = typeFilter   === 'all' || r.type   === typeFilter
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchSearch = searchQuery  === '' ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchType && matchStatus && matchSearch
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.reportDate) - new Date(a.reportDate)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'size') return parseFloat(b.size) - parseFloat(a.size)
      return 0
    })

  /* ── Mock upload handler ── */
  const handleUpload = (file) => {
    if (!file) return
    setUploadedFile(file)
    setUploading(true)
    setUploadProgress(0)

    /* Simulate progress */
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)

          /* Add mock report to list */
          const newReport = {
            id:         `RPT-2024-${Date.now()}`,
            name:       file.name.replace(/\.[^.]+$/, ''),
            type:       'clinical_note',
            format:     file.name.split('.').pop().toUpperCase(),
            size:       `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            uploadDate: new Date().toISOString().split('T')[0],
            reportDate: new Date().toISOString().split('T')[0],
            source:     'Patient Upload',
            status:     'pending',
            reviewedBy: null,
            reviewDate: null,
            tags:       ['Uploaded'],
            summary:    'Awaiting physician review.',
            critical:   false,
          }
          setReports((prev) => [newReport, ...prev])
          setUploadedFile(null)
          return 100
        }
        return prev + Math.random() * 18
      })
    }, 180)
  }

  /* ── Drag and drop ── */
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  /* ── Delete handler ── */
  const handleDelete = (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id))
    setDeleteTarget(null)
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-[1200px] mx-auto space-y-8"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <SectionTitle
          title="Medical Reports"
          subtitle="Upload, view and manage all your medical documents"
          size="xl"
        />
        <Button
          variant="primary"
          size="md"
          icon={<Upload size={14} />}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Report
        </Button>
      </div>

      {/* ── Upload zone ── */}
      <UploadZone
        isDragging={isDragging}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadedFile={uploadedFile}
        fileInputRef={fileInputRef}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onFileSelect={(e) => handleUpload(e.target.files[0])}
      />

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports',   value: reports.length,                               color: '#2563EB' },
          { label: 'Reviewed',        value: reports.filter(r => r.status === 'reviewed').length, color: '#16A34A' },
          { label: 'Pending Review',  value: reports.filter(r => r.status === 'pending').length,  color: '#F59E0B' },
          { label: 'This Month',      value: reports.filter(r => r.uploadDate?.startsWith('2024-10')).length, color: '#64748B' },
        ].map((stat) => (
          <ReportStat key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search reports, sources, tags..."
          className="flex-1"
        />
        <div className="flex gap-2 flex-wrap sm:flex-shrink-0">
          <SelectFilter
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_FILTERS}
            icon={<Filter size={13} />}
          />
          <SelectFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS}
            icon={<CheckCircle size={13} />}
          />
          <SelectFilter
            value={sortBy}
            onChange={setSortBy}
            options={[
              { label: 'Sort: Date', value: 'date' },
              { label: 'Sort: Name', value: 'name' },
              { label: 'Sort: Size', value: 'size' },
            ]}
            icon={<SlidersHorizontal size={13} />}
          />
        </div>
      </div>

      {/* ── Report grid ── */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((report, i) => (
              <ReportCard
                key={report.id}
                report={report}
                index={i}
                onPreview={() => setPreviewReport(report)}
                onDelete={() => setDeleteTarget(report)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] border border-[#E8EDF2]
                            flex items-center justify-center mb-4">
              <FileText size={22} className="text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">No reports found</p>
            <p className="text-xs text-[#64748B] mt-1">
              Try adjusting your filters or upload a new report.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Modal ── */}
      <PreviewModal
        report={previewReport}
        onClose={() => setPreviewReport(null)}
      />

      {/* ── Delete confirmation modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Report"
        subtitle="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={13} />}
              onClick={() => handleDelete(deleteTarget?.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#64748B]">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-[#0F172A]">
            "{deleteTarget?.name}"
          </span>
          ? This will permanently remove it from your records.
        </p>
      </Modal>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   UPLOAD ZONE
───────────────────────────────────────────── */
function UploadZone({
  isDragging, uploading, uploadProgress,
  fileInputRef, onDrop, onDragOver,
  onDragLeave, onFileSelect,
}) {
  return (
    <motion.div
      animate={{
        borderColor: isDragging ? '#2563EB' : '#E8EDF2',
        backgroundColor: isDragging ? '#EFF6FF' : '#FAFBFC',
        scale: isDragging ? 1.01 : 1,
      }}
      transition={{ duration: 0.2 }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className="relative rounded-xl border-2 border-dashed
                 transition-colors duration-200 overflow-hidden"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.dcm,.jpg,.jpeg,.png,.csv,.vcf"
        onChange={onFileSelect}
      />

      <div className="px-8 py-10 flex flex-col items-center text-center">

        {uploading ? (
          /* ── Upload progress state ── */
          <UploadProgress progress={uploadProgress} />
        ) : (
          /* ── Default idle state ── */
          <>
            {/* Animated upload icon */}
            <motion.div
              animate={isDragging
                ? { scale: 1.15, y: -4 }
                : { scale: 1, y: 0 }
              }
              transition={{ duration: 0.2 }}
              className="w-16 h-16 rounded-xl bg-white border border-[#E8EDF2]
                         flex items-center justify-center mb-5"
              style={{ boxShadow: '0 4px 16px 0 rgba(15,23,42,0.08)' }}
            >
              <Upload
                size={24}
                className={isDragging ? 'text-[#2563EB]' : 'text-[#94A3B8]'}
              />
            </motion.div>

            <h3
              className="text-base font-bold text-[#0F172A] mb-1"
              style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}
            >
              {isDragging ? 'Drop your file here' : 'Upload Medical Reports'}
            </h3>
            <p className="text-sm text-[#64748B] mb-5 max-w-sm">
              Drag and drop your files here, or click to browse.
              All uploads are encrypted and HIPAA compliant.
            </p>

            {/* Format pills */}
            <div className="flex gap-2 flex-wrap justify-center mb-6">
              {ACCEPTED_FORMATS.map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full text-xs font-semibold border
                             bg-[#F1F5F9] text-[#64748B] border-[#E8EDF2]"
                >
                  {label}
                </span>
              ))}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white
                         text-sm font-semibold hover:bg-[#1D4ED8]
                         transition-colors duration-200 active:scale-[0.98]"
            >
              Browse Files
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

/* ── Upload progress indicator ── */
function UploadProgress({ progress }) {
  const pct = Math.min(Math.round(progress), 100)

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4 py-4">
      {/* Animated ring */}
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none"
            stroke="#E8EDF2" strokeWidth="5" />
          <motion.circle
            cx="32" cy="32" r="26" fill="none"
            stroke="#2563EB" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 26}
            animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - pct / 100) }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-[#0F172A]">{pct}%</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-[#0F172A]">
          {pct < 100 ? 'Uploading...' : 'Processing...'}
        </p>
        <p className="text-xs text-[#64748B] mt-0.5">
          Encrypting and securely storing your file
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[#E8EDF2] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#2563EB]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   REPORT CARD
───────────────────────────────────────────── */
function ReportCard({ report, index, onPreview, onDelete }) {
  const Icon     = TYPE_ICONS[report.type] || FileText
  const typeMeta = reportTypes[report.type] || reportTypes.clinical_note

  const statusVariant = report.status === 'reviewed' ? 'success' : 'warning'

  const formattedDate = new Date(report.reportDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{
        delay:    index * 0.04,
        duration: 0.4,
        ease:     [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -3 }}
      className="bg-white rounded-xl border border-[#E8EDF2] overflow-hidden
                 group cursor-pointer"
      style={{
        boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04), 0 4px 16px 0 rgba(15,23,42,0.06)',
      }}
      onClick={onPreview}
    >
      {/* ── Card top color bar ── */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: typeMeta.color }}
      />

      <div className="p-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Icon + type */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: typeMeta.bg }}
          >
            <Icon size={18} style={{ color: typeMeta.color }} />
          </div>

          {/* Status badge */}
          <StatusBadge variant={statusVariant} size="xs" dot>
            {report.status === 'reviewed' ? 'Reviewed' : 'Pending'}
          </StatusBadge>
        </div>

        {/* ── Name ── */}
        <h3
          className="text-sm font-bold text-[#0F172A] leading-snug mb-1 line-clamp-2"
          style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}
        >
          {report.name}
        </h3>

        {/* ── Summary ── */}
        <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2 mb-4">
          {report.summary}
        </p>

        {/* ── Meta row ── */}
        <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] mb-4">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formattedDate}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#E8EDF2]" />
          <span>{report.format}</span>
          <span className="w-1 h-1 rounded-full bg-[#E8EDF2]" />
          <span>{report.size}</span>
        </div>

        {/* ── Tags ── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {report.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-lg bg-[#F1F5F9] text-[#64748B]
                         text-[10px] font-medium border border-[#E8EDF2]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* ── Reviewer ── */}
        {report.reviewedBy && (
          <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl
                          bg-[#F8FAFC] border border-[#E8EDF2] mb-4">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br
                            from-[#2563EB] to-[#3B82F6] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#0F172A] truncate">
                {report.reviewedBy}
              </p>
              <p className="text-[9px] text-[#94A3B8]">
                Reviewed{' '}
                {new Date(report.reviewDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview() }}
            className="flex-1 flex items-center justify-center gap-1.5
                       py-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]
                       text-xs font-semibold hover:bg-[#DBEAFE]
                       transition-colors duration-200"
          >
            <Eye size={13} />
            Preview
          </button>
          <button
            className="flex items-center justify-center w-8 h-8 rounded-xl
                       bg-[#F1F5F9] text-[#64748B] hover:bg-[#E8EDF2]
                       transition-colors duration-200"
            onClick={(e) => { e.stopPropagation(); downloadReportSummary(report) }}
            aria-label="Download report summary"
            title="Download report summary"
          >
            <Download size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="flex items-center justify-center w-8 h-8 rounded-xl
                       bg-[#F1F5F9] text-[#64748B] hover:bg-[#FEE2E2]
                       hover:text-[#DC2626] transition-colors duration-200"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   PREVIEW MODAL
───────────────────────────────────────────── */
function PreviewModal({ report, onClose }) {
  if (!report) return null

  const Icon     = TYPE_ICONS[report.type] || FileText
  const typeMeta = reportTypes[report.type] || reportTypes.clinical_note

  return (
    <Modal
      isOpen={!!report}
      onClose={onClose}
      title={report.name}
      subtitle={`${typeMeta.label} · ${report.format} · ${report.size}`}
      size="xl"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={13} />}
            onClick={() => downloadReportSummary(report)}
          >
            Download
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* ── Mock document preview area ── */}
        <div
          className="relative rounded-xl overflow-hidden border border-[#E8EDF2] bg-[#F8FAFC]"
          style={{ height: '280px' }}
        >
          {/* Mock document lines */}
          <div className="absolute inset-6 space-y-3">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: typeMeta.bg }}
              >
                <Icon size={18} style={{ color: typeMeta.color }} />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-[#E8EDF2] rounded-full w-48" />
                <div className="h-2 bg-[#F1F5F9] rounded-full w-32" />
              </div>
            </div>

            {[100, 85, 90, 70, 95, 60, 80].map((w, i) => (
              <div
                key={i}
                className="h-2.5 skeleton"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>

          {/* Overlay label */}
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2
                       px-3 py-1.5 rounded-full text-[10px] font-semibold
                       text-[#64748B] border border-[#E8EDF2]"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            Document preview — {report.format}
          </div>
        </div>

        {/* ── Report details grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Report Date',  value: new Date(report.reportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
            { label: 'Source',       value: report.source },
            { label: 'Format',       value: report.format },
            { label: 'File Size',    value: report.size },
            { label: 'Status',       value: report.status === 'reviewed' ? 'Reviewed' : 'Pending Review' },
            { label: 'Reviewed By',  value: report.reviewedBy || 'Awaiting review' },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E8EDF2]"
            >
              <p className="text-[10px] font-semibold text-[#94A3B8]
                            uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className="text-xs font-semibold text-[#0F172A] leading-snug">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E8EDF2]">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase
                        tracking-widest mb-2">
            Clinical Summary
          </p>
          <p className="text-sm text-[#0F172A] leading-relaxed font-medium">
            {report.summary}
          </p>
        </div>

        {/* ── Tags ── */}
        <div>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase
                        tracking-widest mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {report.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium
                           bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function ReportStat({ label, value, color }) {
  return (
    <div
      className="bg-white rounded-xl border border-[#E8EDF2] p-4"
      style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}
    >
      <p
        className="text-2xl font-bold leading-none mb-1"
        style={{
          color,
          fontFamily: 'DM Sans, Inter, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
      <p className="text-xs text-[#64748B] font-medium">{label}</p>
    </div>
  )
}

function SelectFilter({ value, onChange, options, icon }) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                   bg-white border border-[#E8EDF2] text-xs font-medium
                   text-[#64748B] hover:border-[#94A3B8]
                   transition-colors whitespace-nowrap"
      >
        <span className="text-[#94A3B8]">{icon}</span>
        {current?.label}
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-11 w-48 bg-white rounded-xl
                         border border-[#E8EDF2] z-20 overflow-hidden py-1"
              style={{ boxShadow: '0 8px 30px 0 rgba(15,23,42,0.12)' }}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-medium
                               transition-colors duration-150
                               ${opt.value === value
                                 ? 'bg-[#EFF6FF] text-[#2563EB]'
                                 : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                               }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}