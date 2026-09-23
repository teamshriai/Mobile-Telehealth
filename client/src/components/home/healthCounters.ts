/** Splits the free-text medications field into individual entries. */
export function countMedications(currentMedications: string | null | undefined): number {
  if (typeof currentMedications !== 'string') return 0
  return currentMedications
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean).length
}

/** Splits the free-text allergies field, treating "none"-like text as zero. */
export function countAllergies(knownAllergies: string | null | undefined): number {
  if (typeof knownAllergies !== 'string') return 0
  const text = knownAllergies.trim()
  if (text === '' || /^(none|nil|no known)/i.test(text)) return 0
  return text.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean).length
}
