import { formatDay, formatDoseTime, type Medicine } from '../../services/portal.service'
import { prescriberLine } from './medicineVisuals'

/**
 * The printable medicine list — for a pharmacy, another hospital, or a family
 * member keeping track.
 *
 * Invisible on screen; `data-print-root` makes it the only thing printed (see
 * the print rules in index.css). The patient's own entries are printed under
 * their own heading and marked as theirs, as on screen.
 */
const PRINTED = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

export default function MedicineListPrint({
  patientName,
  current,
  timesByItem,
  allergies,
  selfReported,
}: {
  patientName: string | null
  current: Medicine[]
  timesByItem: Map<string, string[]>
  allergies: string | null
  selfReported: string | null
}) {
  return (
    <div data-print-root lang="en" className="hidden text-[11pt] leading-snug text-black print:block" aria-hidden="true">
      <header className="mb-5 border-b border-black pb-3">
        <p className="text-[9pt] uppercase tracking-wider">SHRI HEALTH · Patient portal</p>
        <h1 className="mt-1 text-[18pt] font-semibold">Current medicines</h1>
        {patientName !== null && <p className="mt-1 font-semibold">{patientName}</p>}
        <p className="text-[9pt]">Printed {PRINTED.format(new Date())}</p>
      </header>

      {current.length === 0 ? (
        <p>No current prescriptions.</p>
      ) : (
        <table className="w-full border-collapse text-left text-[10pt]">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1.5 pr-3 font-semibold">Medicine</th>
              <th className="py-1.5 pr-3 font-semibold">When</th>
              <th className="py-1.5 pr-3 font-semibold">How</th>
              <th className="py-1.5 pr-3 font-semibold">For</th>
              <th className="py-1.5 pr-3 font-semibold">Prescribed</th>
              <th className="py-1.5 font-semibold">Until</th>
            </tr>
          </thead>
          <tbody>
            {current.map((m) => {
              const times = timesByItem.get(m.id) ?? []
              return (
                <tr key={m.id} data-print-block className="border-b border-[#999] align-top">
                  <td className="py-2 pr-3">
                    <span className="font-semibold">{m.name}</span> {m.dose} {m.doseUnit}
                    <br />
                    <span className="text-[9pt]">{m.form}</span>
                    {m.instructions && <><br /><span className="text-[9pt] italic">{m.instructions}</span></>}
                  </td>
                  <td className="py-2 pr-3">
                    {m.frequencyInWords} ({m.frequency})
                    {times.length > 0 && <><br /><span className="text-[9pt]">{times.map(formatDoseTime).join(', ')}</span></>}
                  </td>
                  <td className="py-2 pr-3">{m.routeInWords}</td>
                  <td className="py-2 pr-3">{m.indication?.title ?? '—'}</td>
                  <td className="py-2 pr-3">
                    {prescriberLine(m.prescriber)}
                    <br />
                    <span className="text-[9pt]">{formatDay(m.startedAt)} · {m.rxNumber}</span>
                  </td>
                  <td className="py-2">{m.endsAt === null ? 'No end date' : formatDay(m.endsAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {(allergies !== null || selfReported !== null) && (
        <section className="mt-5" data-print-block>
          <h2 className="text-[11pt] font-semibold">Told to us by the patient (not checked by a doctor)</h2>
          {allergies !== null && <p className="mt-1">Allergies: {allergies}</p>}
          {selfReported !== null && <p className="mt-1 whitespace-pre-line">Medicines: {selfReported}</p>}
        </section>
      )}

      <p className="mt-6 text-[9pt]">
        This list shows medicines prescribed and signed by the patient&rsquo;s doctors. Usual times are the standard ones for
        how often each is taken; the doctor&rsquo;s directions come first. Always check with a doctor or pharmacist before
        changing how you take a medicine.
      </p>
    </div>
  )
}
