import { Calendar, FileText, Users, Pill, Bell } from 'lucide-react'

/**
 * Recent activity — a real timeline, built from real notification records.
 *
 * Every entry corresponds to a row the backend actually wrote because
 * something happened. Nothing is synthesised to fill the column, which is
 * why this renders three items for the demo patient rather than a tidy ten.
 *
 * The connecting rule is drawn with a border on the list item rather than an
 * absolutely-positioned element, so it cannot drift out of alignment when
 * text wraps at narrow widths.
 */

const ICON_BY_TYPE = {
  Appointment: Calendar,
  Report:      FileText,
  CareTeam:    Users,
  Medication:  Pill,
  General:     Bell,
}

/** Muted by design: this is history, not a set of alerts competing for attention. */
const TONE_BY_TYPE = {
  Appointment: 'bg-[#EFF6FF] text-[#1D4ED8]',
  Report:      'bg-[#EDE9FE] text-[#7C3AED]',
  CareTeam:    'bg-[#E6F4F1] text-[#2F6B5E]',
  Medication:  'bg-[#E6F4F1] text-[#2F6B5E]',
  General:     'bg-[#F1F5F9] text-[#64748B]',
}

function relativeDate(iso) {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function RecentActivity({ notifications = [] }) {
  const items = notifications.slice(0, 4)

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-sm font-semibold text-[#0F172A]">
        Recent activity
      </h2>

      <div className="mt-3.5 rounded-xl border border-[#E8EDF2] bg-white p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm leading-relaxed text-[#64748B]">
            Nothing yet. Updates about your appointments and care team will show here.
          </p>
        ) : (
          <ul>
            {items.map((n, i) => {
              const Icon = ICON_BY_TYPE[n.type] ?? Bell
              const tone = TONE_BY_TYPE[n.type] ?? TONE_BY_TYPE.General
              const last = i === items.length - 1
              return (
                <li key={n.id} className="flex gap-3">
                  {/* Marker column: icon plus the rule that connects it to the
                      next entry. The rule stops at the last item. */}
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${tone}`}
                    >
                      <Icon size={15} />
                    </span>
                    {!last && <span aria-hidden="true" className="w-px flex-1 bg-[#E8EDF2]" />}
                  </div>

                  <div className={`min-w-0 flex-1 ${last ? '' : 'pb-4'}`}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{n.title}</p>
                      {!n.isRead && (
                        // Text, not just a colour dot — status must survive
                        // both colour-blindness and a screen reader.
                        <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                          New
                        </span>
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-sm leading-relaxed text-[#64748B]">{n.body}</p>
                    )}
                    <p className="mt-1 text-xs text-[#94A3B8]">{relativeDate(n.createdAt)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
