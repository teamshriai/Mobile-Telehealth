import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Sparkles } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-6">

      {/* Background dot grid */}
      <div
        className="fixed inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #E8EDF2 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-lg"
      >
        {/* Large 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          <p
            className="text-[160px] font-black leading-none select-none"
            style={{
              fontFamily: 'DM Sans, Inter, sans-serif',
              letterSpacing: '-0.05em',
              background: 'linear-gradient(135deg, #E8EDF2 0%, #CBD5E1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </p>

          {/* Floating logo over the 404 */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                boxShadow: '0 20px 60px 0 rgba(37,99,235,0.3)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4 9C4 6.239 6.239 4 9 4C11.761 4 14 6.239 14 9"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="9" r="2" fill="white" />
                <path
                  d="M9 11L9 14"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M6.5 12.5L11.5 12.5"
                  stroke="white"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </div>
          </motion.div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3 mb-8"
        >
          <h1
            className="text-2xl font-bold text-[#0F172A]"
            style={{ fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}
          >
            Page not found
          </h1>
          <p className="text-sm text-[#64748B] leading-relaxed max-w-sm">
            The page you're looking for doesn't exist or has been moved.
            Return to your dashboard to continue managing your care.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl
                       border border-[#E8EDF2] bg-white text-sm font-semibold
                       text-[#64748B] hover:text-[#0F172A] hover:border-[#94A3B8]
                       transition-all duration-200 active:scale-[0.97]"
            style={{ boxShadow: '0 1px 3px 0 rgba(15,23,42,0.04)' }}
          >
            <ArrowLeft size={15} />
            Go back
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl
                       bg-[#2563EB] text-white text-sm font-semibold
                       hover:bg-[#1D4ED8] transition-all duration-200
                       active:scale-[0.97]"
            style={{ boxShadow: '0 4px 16px 0 rgba(37,99,235,0.3)' }}
          >
            <Home size={15} />
            Dashboard
          </button>
        </motion.div>

        {/* Bottom tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 text-xs text-[#CBD5E1] font-medium"
        >
          Stroke AI — Patient Portal
        </motion.p>
      </motion.div>
    </div>
  )
}