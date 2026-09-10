/**
 * Full-viewport loading state. Used for route-level suspense and the initial
 * session check — the two cases where there is no page shell to load into yet.
 */
export default function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] px-6 text-center">
      {/* role="status" + aria-live so a screen reader announces the wait
          instead of sitting silent on an apparently empty page. */}
      <div role="status" aria-live="polite" className="space-y-3.5">
        <span
          aria-hidden="true"
          className="mx-auto block h-9 w-9 animate-spin rounded-full border-[3px] border-[#E8EDF2] border-t-[#2563EB]"
        />
        <p className="text-sm font-medium text-[#475569]">{label}</p>
      </div>
    </div>
  )
}
