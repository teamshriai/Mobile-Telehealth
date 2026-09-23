import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

/**
 * Placeholder for legal pages whose real content doesn't exist yet
 * (Terms of Service, Privacy Policy). Intentionally does not fabricate
 * legal text — shows an honest "not yet published" state instead of a
 * raw 404, until real copy is provided.
 */
export default function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
          <FileText size={24} className="text-primary-700" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-subtle">
          This page hasn't been published yet. Please check back soon, or contact us
          if you have questions in the meantime.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3
                     text-sm font-semibold text-on-primary transition-all duration-200
                     hover:bg-primary-700 active:scale-[0.97]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
      </div>
    </div>
  )
}
