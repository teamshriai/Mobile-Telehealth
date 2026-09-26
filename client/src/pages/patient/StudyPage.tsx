import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Info } from 'lucide-react'
import DicomViewer from '../../components/imaging/DicomViewer'
import { MODALITY_CHIP } from '../../components/reports/modality'
import { ErrorState, LoadingState } from '../../components/feedback/States'
import { getImagingStudy, MODALITY_LABEL, type ImagingStudyDetail } from '../../services/reports.service'
import { clinicalDateTime } from '../../lib/clinicalTime'
import type { ApiError } from '../../types/api'

/**
 * One scan or X-ray: the radiology report exactly as issued, beside the
 * images in the viewer.
 *
 * The report comes first in reading order — it is the record; the images are
 * what it describes. From 1280px they sit side by side; below that they stack.
 */

function Section({ title, children }: { title: string; children: string | null }) {
  if (children === null || children.trim() === '') return null
  return (
    <div>
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">{title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{children}</p>
    </div>
  )
}

export default function StudyPage() {
  const { studyId = '' } = useParams()
  const [study, setStudy] = useState<ImagingStudyDetail | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    setError(null)
    setStudy(null)
    getImagingStudy(studyId).then(setStudy).catch((err: ApiError) => setError(err))
  }, [studyId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4" data-testid="study-page">
      <Link to="/app/reports" className="focus-ring inline-flex min-h-9 items-center gap-1 rounded text-sm font-medium text-primary-700 hover:underline">
        <ChevronLeft size={16} aria-hidden="true" /> Scans and X-rays
      </Link>

      {error !== null ? (
        <ErrorState description={error} onRetry={load} />
      ) : study === null ? (
        <LoadingState label="Opening the report…" />
      ) : (
        <>
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold ${MODALITY_CHIP[study.modality]}`}>
                {MODALITY_LABEL[study.modality]}
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{study.title}</h1>
            </div>
            <p className="text-sm text-ink-muted">
              <span className="tabular-nums">{clinicalDateTime(study.performedAt)}</span> · {study.performingFacility}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
            <article aria-labelledby="report-heading" className="space-y-4 rounded-2xl border border-border-soft bg-surface-1 p-4 shadow-card sm:p-5" data-testid="radiology-report">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 id="report-heading" className="text-base font-semibold text-ink">Radiology report</h2>
                <span className="rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success-fg">{study.report.status}</span>
              </div>
              <Section title="Clinical details">{study.reportText.clinicalIndication}</Section>
              <Section title="Technique">{study.reportText.technique}</Section>
              <Section title="Comparison">{study.reportText.comparison}</Section>
              <Section title="Findings">{study.reportText.findings}</Section>
              <div className="rounded-xl border border-border-soft bg-surface-2 p-3.5">
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">Impression</h3>
                <p className="mt-1 whitespace-pre-line text-sm font-medium leading-relaxed text-ink">{study.reportText.impression}</p>
              </div>
              <dl className="grid grid-cols-1 gap-2 border-t border-border-soft pt-3 text-xs text-ink-muted">
                <div>
                  <dt className="inline text-ink-subtle">Reported by </dt>
                  <dd className="inline font-medium text-ink">
                    {study.report.reportedBy.name}
                    {study.report.reportedBy.role && `, ${study.report.reportedBy.role}`}
                  </dd>
                  {study.report.reportedBy.registration && <dd className="text-ink-subtle">{study.report.reportedBy.registration}</dd>}
                  {study.reportingFacility && <dd className="text-ink-subtle">{study.reportingFacility}</dd>}
                  <dd className="text-ink-subtle tabular-nums">{clinicalDateTime(study.report.reportedAt)}</dd>
                </div>
                {study.orderedBy && <div><dt className="inline text-ink-subtle">Ordered by </dt><dd className="inline">{study.orderedBy}</dd></div>}
                <div className="tabular-nums"><dt className="inline text-ink-subtle">Report </dt><dd className="inline">{study.report.number}</dd> · <dt className="inline text-ink-subtle">Accession </dt><dd className="inline">{study.accessionNumber}</dd></div>
              </dl>
              {study.provenance.isIllustrative && (
                <details className="rounded-lg border border-border-soft px-3 py-2 text-xs text-ink-muted">
                  <summary className="focus-ring flex cursor-pointer items-center gap-1.5 rounded font-medium text-ink">
                    <Info size={14} aria-hidden="true" /> About these images
                  </summary>
                  <p className="mt-2 leading-relaxed">
                    The images shown with this report are sample images from the U.S. National Library of Medicine&rsquo;s Visible Human Project,
                    used to demonstrate the viewer. They are not your own scan{study.provenance.note ? `; ${study.provenance.note.charAt(0).toLowerCase()}${study.provenance.note.slice(1)}` : '.'}{' '}
                    The report above is your record. Courtesy of the U.S. National Library of Medicine; this does not imply its endorsement.
                  </p>
                </details>
              )}
            </article>

            <DicomViewer
              studyId={study.id}
              title={study.title}
              modality={study.modality}
              series={study.series}
              attribution={study.provenance.attribution}
              note={study.provenance.note}
            />
          </div>
        </>
      )}
    </div>
  )
}
