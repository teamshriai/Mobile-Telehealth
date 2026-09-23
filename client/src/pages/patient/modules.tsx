import ModulePlaceholder from './ModulePlaceholder'

/**
 * Appointments, My Health and Care Team shipped in Phase 3 — see
 * AppointmentsPage.tsx, MyHealthPage.tsx, CareTeamPage.tsx.
 *
 * Medicines remains a placeholder: there is no Medication model in the schema
 * and inventing one was out of Phase 3's scope. Adding it needs a real
 * decision about prescriptions, dosage schedules and refill tracking first.
 */

export function MedicinesPage() {
  return (
    <ModulePlaceholder
      title="Medicines"
      description="What to take, and when to take it."
      whatsComing={[
        'Your current prescriptions and daily schedule',
        'Reminders for each dose',
        'A record of what you have taken',
        'Refill reminders before you run out',
      ]}
    />
  )
}
