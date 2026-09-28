import apiClient from '../lib/apiClient'
import type { LabFlag } from './reports.service'

/**
 * GET /me/trends — the series Home's "Your readings over time" draws.
 *
 * Nothing here is interpreted: readings keep their source, lab results keep
 * the lab's own range text and flag, and doses are "as you marked them".
 */

export type TrendSource = 'Facility' | 'HomeDevice' | 'PatientReported'

export interface VitalPoint {
  at: string
  value: number
  /** Diastolic, for blood pressure. */
  value2: number | null
  unit: string
  source: TrendSource
  place: string | null
}

export interface LabPoint {
  at: string
  value: number
  /** As printed on the report. */
  display: string
  unit: string | null
  /** The lab's own range, verbatim. */
  range: string | null
  /** The lab's own flag, as issued. */
  flag: LabFlag | null
  reportNumber: string
}

export interface DayDoses {
  /** YYYY-MM-DD, India time. */
  date: string
  due: number
  taken: number
  skipped: number
  notMarked: number
}

export interface Trends {
  bloodPressure: VitalPoint[]
  pulse: VitalPoint[]
  weight: VitalPoint[]
  ldl: LabPoint[]
  hba1c: LabPoint[]
  doses: DayDoses[]
}

export async function getTrends(): Promise<Trends> {
  return apiClient.get<Trends>('/me/trends')
}
