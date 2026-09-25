import { Bone, Brain, FileScan, FlaskConical, HeartPulse, ScanLine, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import IconTile from '../../components/common/IconTile'
import type { IconTone } from '../../components/common/iconTones'

/**
 * Reports — the patient's scans and test reports.
 *
 * ⚠️ THE SECTION EXISTS BEFORE ITS DATA, BY DECISION. Report storage (a
 * report record plus the encrypted file, reusing `StoredFile`) and viewing
 * tools (an imaging viewer, a PDF viewer) are the next phase. Until then this
 * page shows exactly what is true: there are no reports to show, and what
 * will appear here once the hospital adds them. It does not show sample
 * reports, a fake upload, or a disabled button.
 */
const KINDS: Array<{ icon: LucideIcon; tone: IconTone; title: string; detail: string }> = [
  { icon: Bone, tone: 'blue', title: 'X-ray', detail: 'Chest, bone and joint X-rays' },
  { icon: Brain, tone: 'violet', title: 'CT and MRI', detail: 'Scans of the head, body and spine' },
  { icon: Waves, tone: 'teal', title: 'Ultrasound', detail: 'Including pregnancy scans' },
  { icon: HeartPulse, tone: 'red', title: 'ECG', detail: 'Heart rhythm tracings' },
  { icon: FlaskConical, tone: 'amber', title: 'Lab reports', detail: 'Blood, urine and other tests' },
  { icon: ScanLine, tone: 'gray', title: 'Other reports', detail: 'Anything else from your visits' },
]

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Reports</h1>
        <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
          Your scans and test reports from the hospital, in one place.
        </p>
      </div>

      <section className="flex flex-col items-center rounded-xl border border-border-soft bg-surface-1 px-5 py-10 text-center">
        <IconTile icon={FileScan} tone="blue" size="lg" />
        <h2 className="mt-4 text-base font-semibold text-ink">No reports yet</h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
          When the hospital adds a report from one of your visits, it will appear here for you to
          view, with the date, the test and the doctor who ordered it.
        </p>
      </section>

      <section aria-labelledby="kinds-heading">
        <h2 id="kinds-heading" className="mb-3 text-sm font-semibold text-ink">What will appear here</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KINDS.map((k) => (
            <li key={k.title} className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-1 p-4">
              <IconTile icon={k.icon} tone={k.tone} />
              <span>
                <span className="block text-sm font-semibold text-ink">{k.title}</span>
                <span className="block text-xs text-ink-muted">{k.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
