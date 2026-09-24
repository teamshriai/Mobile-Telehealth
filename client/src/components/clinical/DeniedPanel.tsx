import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

/**
 * `C-36` — the permission-denied panel. §1.5 `DENIED`.
 *
 * The atlas asks for three things: what is missing, who grants it, and a
 * request action. An `ErrorState` gives none of them — it says something went
 * wrong, which is not what happened.
 *
 * ⚠️ IT NEVER NAMES THE PATIENT, AND IT NEVER SAYS WHETHER THEY EXIST. §3.2's
 * uniform refusal: a refusal that distinguishes "no such patient" from "not
 * your patient" is an enumeration oracle — anyone with a login could confirm
 * whether a given person is a patient here by watching which message comes
 * back. So the wording covers both cases and the panel renders no patient data
 * at all, not even in a heading.
 *
 * ⚠️ The action is "ask the consultant", not a self-service escalation. Adding
 * yourself to a care team is not something the person lacking access should be
 * able to do; break-glass is the legitimate route for genuine urgency and is
 * offered separately, by the server, when the caller holds the capability but
 * lacks the relationship.
 */
export default function DeniedPanel({
  title = 'This record is not available to you',
  needed = 'a care relationship with this patient',
}: {
  title?: string
  needed?: string
}) {
  return (
    <section
      role="region"
      aria-label="Access denied"
      className="mx-auto max-w-xl rounded-xl border border-border-soft bg-surface-1 p-6 text-center"
    >
      <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
        <ShieldOff size={18} aria-hidden="true" className="text-ink-muted" />
      </span>

      <h1 className="text-base font-semibold text-ink">{title}</h1>

      <dl className="mt-4 space-y-3 text-left text-sm">
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-subtle">
            What is missing
          </dt>
          <dd className="mt-0.5 text-ink">
            This account does not have {needed}, or the record does not exist. Which of the two it
            is deliberately is not stated.
          </dd>
        </div>
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-subtle">
            Who can grant it
          </dt>
          <dd className="mt-0.5 text-ink">
            The patient&rsquo;s responsible consultant, by adding you to the care team.
          </dd>
        </div>
        <div>
          <dt className="text-2xs font-medium uppercase tracking-wide text-ink-subtle">
            If this is an emergency
          </dt>
          <dd className="mt-0.5 text-ink">
            Emergency access is offered automatically to clinicians who hold the capability. If you
            were not offered it, your account does not hold it — contact the on-call consultant.
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          to="/clinician"
          className="focus-ring inline-flex h-9 items-center rounded-lg border border-border-soft bg-surface-1 px-3 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Back to My Day
        </Link>
      </div>

      <p className="mt-4 text-2xs text-ink-subtle">
        This attempt has been recorded in the access log.
      </p>
    </section>
  )
}
