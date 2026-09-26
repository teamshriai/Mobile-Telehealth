import type { ImagingModality } from '../../services/reports.service'

/** The small modality badge on report rows and the study header. */
export const MODALITY_CHIP: Record<ImagingModality, string> = {
  CT: 'bg-primary-50 text-primary-700 border-primary-200',
  MR: 'bg-accent-clay text-accent-clay-fg border-accent-clay-fg/20',
  XR: 'bg-accent-sage text-accent-sage-fg border-accent-sage-fg/20',
}
