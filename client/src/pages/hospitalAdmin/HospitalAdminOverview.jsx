import { useEffect, useState } from 'react'
import { Users, UserCheck, Stethoscope, CalendarCheck } from 'lucide-react'
import Card from '../../components/common/Card.jsx'
import { useAuth } from '../../app/AuthContext.jsx'
import * as hospitalAdmin from '../../services/hospitalAdmin.service.js'

/**
 * Real, database-backed numbers only. An empty hospital shows honest
 * zeros and an explanatory empty state — never a fabricated or placeholder
 * chart. See hospitalAdminService.getAnalytics on the server for exactly
 * what is and isn't computed.
 */
function StatCard({ icon: Icon, label, value }) {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-2xl font-bold tracking-tight text-ink">{value}</p>
          <p className="text-xs text-ink-subtle">{label}</p>
        </div>
      </div>
    </Card>
  )
}

export default function HospitalAdminOverview() {
  const { profile } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    hospitalAdmin
      .getAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err.message || 'Could not load analytics.'))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {profile?.hospital?.name ?? 'Your hospital'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">A live snapshot of your hospital's activity.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-xs text-critical-fg">
          {error}
        </p>
      )}

      {analytics === null && !error ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total patients" value={analytics.totalPatients} />
            <StatCard icon={UserCheck} label="Active in last 90 days" value={analytics.activePatients} />
            <StatCard icon={Stethoscope} label="Doctors" value={analytics.doctorCount} />
            <StatCard
              icon={CalendarCheck}
              label="Appointments (all time)"
              value={Object.values(analytics.appointmentsByStatus).reduce((a, b) => a + b, 0)}
            />
          </div>

          <Card padding="lg">
            <h2 className="text-sm font-semibold text-ink">Appointments by status</h2>
            {Object.keys(analytics.appointmentsByStatus).length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No appointments recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {Object.entries(analytics.appointmentsByStatus).map(([status, count]) => (
                  <li key={status} className="flex items-center gap-3 text-sm">
                    <span className="w-28 flex-shrink-0 text-ink-muted">{status}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-primary-600"
                        style={{
                          width: `${Math.max(4, (count / Math.max(...Object.values(analytics.appointmentsByStatus))) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 flex-shrink-0 text-right font-medium text-ink">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="text-sm font-semibold text-ink">Appointment volume — last 30 days</h2>
            {analytics.appointmentTrend.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No appointments in this period yet.</p>
            ) : (
              <div className="mt-4 flex h-24 items-end gap-1">
                {analytics.appointmentTrend.map((point) => {
                  const max = Math.max(...analytics.appointmentTrend.map((p) => p.count))
                  return (
                    <div
                      key={point.date}
                      title={`${point.date}: ${point.count}`}
                      className="flex-1 rounded-t bg-primary-600/80"
                      style={{ height: `${Math.max(6, (point.count / max) * 100)}%` }}
                    />
                  )
                })}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
