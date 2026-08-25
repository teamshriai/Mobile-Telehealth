import { motion } from 'framer-motion'
import {
  Sparkles, CheckCircle, AlertTriangle,
  TrendingUp, ArrowRight, Shield,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../common/Card.jsx'
import SectionTitle from '../common/SectionTitle.jsx'
import { aiRecommendations } from '../../data/mockAI.js'

export default function AIInsights({ summary }) {
  const navigate = useNavigate()

  return (
    <Card variant="default" padding="lg">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3
              className="text-base font-bold text-[#0F172A]"
              style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.01em' }}
            >
              AI Health Summary
            </h3>
            <p className="text-xs text-[#64748B]">
              Generated {new Date(summary.generated).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })} by Stroke AI
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard/ai')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                     bg-[#EDE9FE] text-[#7C3AED] text-xs font-semibold
                     hover:bg-[#DDD6FE] transition-colors"
        >
          <Sparkles size={12} />
          Open AI Chat
        </button>
      </div>

      {/* Status headline */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)' }}
      >
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#14532D]">{summary.overallStatus}</p>
            <p className="text-xs text-[#166534] mt-0.5 leading-relaxed">
              {summary.headline}
            </p>
          </div>
        </div>
      </div>

      {/* Three column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

        {/* Key points */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
            Key Observations
          </p>
          {summary.keyPoints.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle size={13} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#0F172A] leading-relaxed">{point}</p>
            </div>
          ))}
        </div>

        {/* Risk factors */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
            Monitor Closely
          </p>
          {summary.riskFactors.map((risk, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle size={13} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#0F172A] leading-relaxed">{risk}</p>
            </div>
          ))}

          <div className="pt-2">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
              Positive Indicators
            </p>
            {summary.positiveFactors.slice(0, 2).map((factor, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <TrendingUp size={13} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#0F172A] leading-relaxed">{factor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
            AI Recommendations
          </p>
          {aiRecommendations.slice(0, 3).map((rec) => (
            <motion.div
              key={rec.id}
              whileHover={{ x: 2 }}
              onClick={() => navigate(rec.actionPath)}
              className="flex items-start gap-2 p-2.5 rounded-xl
                         bg-[#F8FAFC] border border-[#E8EDF2]
                         hover:border-[#BFDBFE] hover:bg-[#EFF6FF]
                         cursor-pointer transition-all duration-200 group"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5
                  ${rec.priority === 'high'   ? 'bg-[#DC2626]' : ''}
                  ${rec.priority === 'medium' ? 'bg-[#F59E0B]' : ''}
                  ${rec.priority === 'low'    ? 'bg-[#16A34A]' : ''}
                `}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F172A] leading-snug">
                  {rec.title}
                </p>
                <p className="text-[10px] text-[#64748B] mt-0.5 line-clamp-2">
                  {rec.summary}
                </p>
              </div>
              <ArrowRight
                size={11}
                className="text-[#CBD5E1] group-hover:text-[#2563EB]
                           transition-colors flex-shrink-0 mt-1"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Next steps */}
      <div className="border-t border-[#F1F5F9] pt-5">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
          Next Steps
        </p>
        <div className="flex flex-wrap gap-2">
          {summary.nextSteps.map((step, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-xl bg-[#F1F5F9] border border-[#E8EDF2]
                         text-xs text-[#64748B] font-medium"
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}