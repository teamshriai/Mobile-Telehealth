import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import { Bandage, Droplet, Moon, Pill, Sun, Sunrise, Sunset, Syringe, Wind } from 'lucide-react'
import type { IconTone } from '../common/iconTones'
import type { PartOfDay } from '../../services/portal.service'

/**
 * The glyph and tile colour for a medicine's FORM — never a picture of the
 * medicine itself. A pill photo would have to come from a vetted product
 * database this product does not have, and a wrong photo is worse than none.
 */
export function formVisual(form: string): { icon: ComponentType<LucideProps>; tone: IconTone } {
  const f = form.toLowerCase()
  if (/inject|infusion|vial|ampoule/.test(f)) return { icon: Syringe, tone: 'teal' }
  if (/syrup|suspension|solution|drop|liquid|elixir/.test(f)) return { icon: Droplet, tone: 'indigo' }
  if (/inhal|nebul|spray/.test(f)) return { icon: Wind, tone: 'teal' }
  if (/cream|ointment|gel|patch|lotion/.test(f)) return { icon: Bandage, tone: 'amber' }
  return { icon: Pill, tone: 'blue' }
}

export const PART_OF_DAY: Record<PartOfDay, { icon: ComponentType<LucideProps>; label: string }> = {
  Morning: { icon: Sunrise, label: 'Morning' },
  Afternoon: { icon: Sun, label: 'Afternoon' },
  Evening: { icon: Sunset, label: 'Evening' },
  Night: { icon: Moon, label: 'Night' },
}

export const PARTS_OF_DAY: PartOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Night']

/** "Dr. Rohit Desai · Neurology (Stroke)" — whatever of it is recorded. */
export function prescriberLine(p: { name: string | null; specialty: string | null }): string {
  return [p.name ?? 'Your doctor', p.specialty].filter(Boolean).join(' · ')
}

/** A plain-words question for the assistant about one medicine. */
export function askAboutUrl(question: string): string {
  return `/app/ai-insights?q=${encodeURIComponent(question)}`
}
