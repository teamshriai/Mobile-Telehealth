import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * The top of a sign-in screen: the way back to the entry page, the screen's
 * title and one line of guidance. Shared by the Patient and Hospital screens
 * so the two doors read as one design.
 *
 * Router state (`from`, `expired`, `message`) is carried back to the entry
 * page, so "return to where you were" survives a change of door.
 */
export default function DoorHeading({ title, description }: { title: string; description: string }) {
  const location = useLocation()
  return (
    <>
      <Link
        to="/login"
        state={location.state ?? undefined}
        // 44px tall for a finger; the negative top margin keeps the text
        // exactly where the old 20px link sat.
        className="focus-ring -mt-3 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Choose a different account type
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mb-6 mt-1 text-sm text-ink-muted">{description}</p>
    </>
  )
}
