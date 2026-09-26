import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, FileScan, FlaskConical } from 'lucide-react'
import Tabs from '../../components/common/Tabs'
import IconTile from '../../components/common/IconTile'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import ImagingList from '../../components/reports/ImagingList'
import LabResultsPanel from '../../components/reports/LabResultsPanel'
import VitalsPanel from '../../components/reports/VitalsPanel'
import * as reports from '../../services/reports.service'
import type { ImagingStudySummary, LabReport, VitalLatest, VitalReading } from '../../services/reports.service'
import type { ApiError } from '../../types/api'
import type { LucideIcon } from 'lucide-react'
import type { IconTone } from '../../components/common/iconTones'

/**
 * Reports — scans and X-rays, lab results and vital signs, as the hospital
 * recorded them.
 *
 * ⚠️ AS ISSUED. Radiology reports are shown in full as the radiologist signed
 * them, lab results with the laboratory's own ranges and flags, and every
 * vital sign with where it was measured. Nothing on this page interprets a
 * result.
 *
 * The three lists load independently (`allSettled`): one failing source never
 * blanks the other two tabs, and each tab has its own honest empty state.
 */

type TabId = 'scans' | 'labs' | 'vitals'
const TAB_IDS: TabId[] = ['scans', 'labs', 'vitals']

type Load<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; error: ApiError }

function Empty({ icon, tone, title, children }: { icon: LucideIcon; tone: IconTone; title: string; children: string }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-border-soft bg-surface-1 px-5 py-10 text-center">
      <IconTile icon={icon} tone={tone} size="lg" />
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">{children}</p>
    </section>
  )
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab') as TabId | null
  const tab: TabId = tabParam !== null && TAB_IDS.includes(tabParam) ? tabParam : 'scans'

  const [scans, setScans] = useState<Load<ImagingStudySummary[]>>({ state: 'loading' })
  const [labs, setLabs] = useState<Load<LabReport[]>>({ state: 'loading' })
  const [vitals, setVitals] = useState<Load<{ latest: VitalLatest[]; readings: VitalReading[] }>>({ state: 'loading' })

  const load = useCallback(() => {
    setScans({ state: 'loading' })
    setLabs({ state: 'loading' })
    setVitals({ state: 'loading' })
    void Promise.allSettled([
      reports.getImagingStudies().then((data) => setScans({ state: 'ok', data }), (error: ApiError) => setScans({ state: 'error', error })),
      reports.getLabReports().then((data) => setLabs({ state: 'ok', data }), (error: ApiError) => setLabs({ state: 'error', error })),
      reports.getVitals().then((data) => setVitals({ state: 'ok', data }), (error: ApiError) => setVitals({ state: 'error', error })),
    ])
  }, [])

  useEffect(() => { load() }, [load])

  const count = <T,>(l: Load<T[]>): number | undefined => (l.state === 'ok' ? l.data.length : undefined)
  const vitalsCount = vitals.state === 'ok' ? vitals.data.readings.length : undefined

  return (
    <div className="space-y-5" data-testid="reports-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Reports</h1>
        <p className="mt-1.5 max-w-prose text-sm text-ink-muted">
          Your scans, X-rays, lab results and vital signs from the hospital — shown exactly as they were issued.
        </p>
      </div>

      <Tabs
        label="Report types"
        activeId={tab}
        onChange={(id) => setParams(id === 'scans' ? {} : { tab: id }, { replace: true })}
        tabs={[
          { id: 'scans', label: 'Scans and X-rays', count: count(scans) },
          { id: 'labs', label: 'Lab results', count: count(labs) },
          { id: 'vitals', label: 'Vitals', count: vitalsCount },
        ]}
      >
        <div className="pt-4">
          {tab === 'scans' && (
            scans.state === 'loading' ? <LoadingState label="Loading your scans…" />
              : scans.state === 'error' ? <ErrorState description={scans.error} onRetry={load} />
                : scans.data.length === 0 ? (
                  <Empty icon={FileScan} tone="blue" title="No scans or X-rays yet">
                    When the hospital reports a scan or X-ray from one of your visits, it appears here with the images, the date, where it was
                    taken and the doctor who reported it.
                  </Empty>
                ) : <ImagingList studies={scans.data} />
          )}
          {tab === 'labs' && (
            labs.state === 'loading' ? <LoadingState label="Loading your lab results…" />
              : labs.state === 'error' ? <ErrorState description={labs.error} onRetry={load} />
                : labs.data.length === 0 ? (
                  <Empty icon={FlaskConical} tone="amber" title="No lab results yet">
                    Blood and other test results from the hospital laboratory appear here, with the lab&rsquo;s own reference ranges.
                  </Empty>
                ) : <LabResultsPanel reports={labs.data} />
          )}
          {tab === 'vitals' && (
            vitals.state === 'loading' ? <LoadingState label="Loading your vital signs…" />
              : vitals.state === 'error' ? <ErrorState description={vitals.error} onRetry={load} />
                : vitals.data.readings.length === 0 ? (
                  <Empty icon={Activity} tone="red" title="No vital signs recorded yet">
                    Blood pressure, pulse, weight and other measurements from your visits appear here, with where each was taken.
                  </Empty>
                ) : <VitalsPanel latest={vitals.data.latest} readings={vitals.data.readings} />
          )}
        </div>
      </Tabs>
    </div>
  )
}
