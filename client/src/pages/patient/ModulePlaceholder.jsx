import { Construction } from 'lucide-react'

/**
 * Honest placeholder for a patient module whose backend is not built yet.
 *
 * Phase 1's central finding was that the portal showed fabricated data as if
 * it were real — mock appointments, a fake upload that discarded files, a
 * booking flow no doctor received. The correction is not a prettier mock; it
 * is saying plainly that the feature is not ready.
 *
 * Each of these is replaced by the real module in Phase 3.
 */
export default function ModulePlaceholder({ title, description, whatsComing = [] }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-[#475569]">{description}</p>}
      </div>

      <div className="rounded-xl border border-[#E8EDF2] bg-white p-6">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#FBF0E2]"
          >
            <Construction size={19} className="text-[#8A5A1B]" />
          </span>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#0F172A]">
              This section is being built
            </h2>
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[#475569]">
              It is not connected to your records yet. Rather than show you sample
              information that looks real, we are leaving it empty until it works
              properly. Your care team remains your source of truth in the meantime.
            </p>

            {whatsComing.length > 0 && (
              <>
                <p className="mt-4 text-sm font-semibold text-[#0F172A]">What will be here</p>
                <ul className="mt-2 space-y-1.5">
                  {whatsComing.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[#475569]">
                      <span aria-hidden="true" className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[#94A3B8]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
