import { CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STAGES = [
  { id: 1, label: 'Symptom Onset',        sub: 'Oct 10, 9:14 AM',  status: 'completed' },
  { id: 2, label: 'EMS Alert Sent',       sub: 'Oct 10, 9:17 AM',  status: 'completed' },
  { id: 3, label: 'EMS Dispatched',       sub: 'Oct 10, 9:22 AM',  status: 'completed' },
  { id: 4, label: 'Hospital Arrival',     sub: 'Oct 10, 9:41 AM',  status: 'completed' },
  { id: 5, label: 'CT/MRI Imaging',       sub: 'Oct 10, 9:52 AM',  status: 'completed' },
  { id: 6, label: 'AI Analysis',          sub: 'Oct 10, 9:55 AM',  status: 'completed' },
  { id: 7, label: 'Treatment Decision',   sub: 'Oct 10, 10:01 AM', status: 'completed' },
  { id: 8, label: 'Admission',            sub: 'Oct 10, 11:30 AM', status: 'completed' },
]

export default function LiquidBiopsyCard() {
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Stroke Care Journey</h3>
          <p className="text-xs text-gray-500">Acute response completed Oct 10 · Now in recovery &amp; rehabilitation</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/medical-records')}
          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
        >
          View Full Report <ChevronRight size={14} />
        </button>
      </div>

      {/* Cycle 12 Tracker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Emergency Response Status
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
          <p className="font-semibold text-blue-900">NIHSS Score at Arrival</p>
          <p className="text-base font-bold text-blue-950 mt-0.5">6 (Mild)</p>
          <p className="text-gray-600 mt-0.5">Rapid response — door-to-needle time under 45 minutes.</p>
        </div>
        <div className="sm:text-right">
          <span className="inline-block px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-xs">
            Treatment Administered
          </span>
        </div>
      </div>
    </div>
  )
}
