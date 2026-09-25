import { NavLink } from 'react-router-dom'
import { Calendar, Home, Menu, Mic, Pill } from 'lucide-react'

/**
 * The patient's phone navigation (below `md`).
 *
 * ⚠️ WHY A BAR AND NOT ONLY THE DRAWER. On a phone the drawer is two taps
 * away from anything, and the portal's most frequent jobs — the next visit,
 * today's medicines, "write down how I feel" — deserve one. The centre action
 * records a health note, because a symptom is easiest to describe while it is
 * happening. Emergency is deliberately NOT here: it stays in the header, red,
 * where it cannot be mistaken for an ordinary tab.
 *
 * "Menu" opens the existing drawer, so every other destination is still one
 * step away and there is one list of them, not two.
 */
export default function PatientBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const tab = (isActive: boolean) =>
    `focus-ring flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors ${
      isActive ? 'text-primary-700' : 'text-ink-subtle hover:text-ink'
    }`

  return (
    <nav
      aria-label="Quick navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-surface-1/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch gap-1 px-2 pt-1">
        <li className="flex flex-1">
          <NavLink to="/app" end className={({ isActive }) => tab(isActive)}>
            <Home size={20} aria-hidden="true" /> Home
          </NavLink>
        </li>
        <li className="flex flex-1">
          <NavLink to="/app/appointments" className={({ isActive }) => tab(isActive)}>
            <Calendar size={20} aria-hidden="true" /> Visits
          </NavLink>
        </li>
        <li className="flex flex-1 justify-center">
          <NavLink
            to="/app/health-notes?new=voice"
            aria-label="Record a health note"
            className="focus-ring -mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-primary-600 text-on-primary shadow-card-lg transition-colors hover:bg-primary-700"
          >
            <Mic size={22} aria-hidden="true" />
          </NavLink>
        </li>
        <li className="flex flex-1">
          <NavLink to="/app/medicines" className={({ isActive }) => tab(isActive)}>
            <Pill size={20} aria-hidden="true" /> Medicines
          </NavLink>
        </li>
        <li className="flex flex-1">
          <button type="button" onClick={onOpenMenu} className={tab(false)}>
            <Menu size={20} aria-hidden="true" /> Menu
          </button>
        </li>
      </ul>
    </nav>
  )
}
