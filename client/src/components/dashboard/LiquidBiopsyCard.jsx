import { CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STAGES = [
  { id: 1, label: 'Blood Collection',  sub: 'Oct 10, 2024',   status: 'completed' },
  { id: 2, label: 'Sample Transport',  sub: 'Same day',        status: 'completed' },
  { id: 3, label: 'Lab Received',      sub: 'Oct 10, 9:42 AM', status: 'completed' },
  { id: 4, label: 'DNA Extraction',    sub: 'Oct 11',          status: 'completed' },
  { id: 5, label: 'NGS Sequencing',    sub: 'Oct 11–12',       status: 'completed' },
  { id: 6, label: 'Variant Calling',   sub: 'Oct 12',          status: 'completed' },
  { id: 7, label: 'Analysis',          sub: 'Oct 13',          status: 'completed' },
  { id: 8, label: 'Clinician Review',  sub: 'Oct 16',          status: 'completed' },
  { id: 9, label: 'Report Released',   sub: 'Oct 16, 3:00 PM', status: 'completed' },
]

export default function LiquidBiopsyCard() {
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Liquid Biopsy Workflow</h3>
          <p className="text-xs text-gray-500">Cycle 12 completed · Cycle 13 scheduled for Nov 7</p>
        </div>
        <button
          onClick={() => navigate('/medical-records')}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
        >
          View Full Report <ChevronRight size={14} />
        </button>
      </div>

      {/* Cycle 12 Tracker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Cycle 12 Status
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Completed
          </span>
        </div>

        {/* Workflow Track */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center min-w-max gap-2 py-1">
            {STAGES.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center text-center w-20">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-1">
                    <CheckCircle size={14} />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-800 line-clamp-1">{s.label}</span>
                  <span className="text-[9px] text-gray-400">{s.sub}</span>
                </div>
                {idx < STAGES.length - 1 && (
                  <div className="w-4 h-0.5 bg-emerald-500 self-start mt-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Result Banner */}
      <div className="rounded-lg p-4 bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-semibold text-blue-900">Latest ctDNA Test Result (Cycle 12)</p>
          <p className="text-base font-bold text-blue-950 mt-0.5">0.18% MAF</p>
          <p className="text-gray-600 mt-0.5">47% reduction from peak baseline. No resistance mutations detected.</p>
        </div>
        <div className="sm:text-right">
          <span className="inline-block px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-xs">
            Treatment Responding
          </span>
        </div>
      </div>
    </div>
  )
}
