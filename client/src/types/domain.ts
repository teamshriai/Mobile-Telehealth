/**
 * Domain types mirrored from the server's response shapes (see each
 * `*.service.ts` file for which endpoint each type corresponds to). These
 * describe data over the wire, not database rows — a field the server
 * deliberately never sends (a password hash, an internal id) has no home
 * here on purpose.
 */

export type RoleName =
  | 'Admin'
  | 'Patient'
  | 'Doctor'
  | 'Resident'
  | 'HealthcareWorker'
  | 'LabTechnician'
  | 'HospitalAdmin'

/** `/auth/me`'s `user` field, plus the display name AuthContext derives and
 *  attaches client-side (see AuthContext's own comment on `applySession`). */
export interface User {
  id: string
  email: string
  role: RoleName
  isVerified: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  /** Derived client-side from the profile at sign-in; not sent by the server. */
  name?: string
}

export interface Hospital {
  id: string
  name: string
  city: string | null
  state: string | null
}

/** A patient's own profile — GET/PATCH /profile. */
export interface PatientProfile {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  dateOfBirth: string | null
  age: number | null
  gender: string | null
  bloodGroup: string | null
  maritalStatus: string | null
  abhaId: string | null
  passportNumber: string | null
  aadhaarMasked: string | null
  phoneNumber: string | null
  alternatePhone: string | null
  addressLine1: string | null
  addressLine2: string | null
  village: string | null
  city: string | null
  district: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  knownAllergies: string | null
  currentMedications: string | null
  existingDiseases: string | null
  familyHistory: string | null
  previousSurgeries: string | null
  smokingStatus: string | null
  alcoholStatus: string | null
  tobaccoStatus: string | null
  physicalActivity: string | null
  occupation: string | null
  preferences: PreferencesDto
  onboardingCompletedAt: string | null
  updatedAt: string
}

export interface PreferencesDto {
  notifications?: Record<string, unknown>
  privacy?: Record<string, unknown>
  accessibility?: Record<string, unknown>
  language?: Record<string, unknown>
  appearance?: { theme?: string }
}

/** A doctor's own profile — GET/PATCH /doctor/profile. */
export interface DoctorProfile {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  specialty: string | null
  qualifications: string | null
  hospitalId: string | null
  hospital: Hospital | null
  hospitalName: string | null
  yearsExperience: number | null
  registrationNumber: string | null
  hprId: string | null
  isVerified: boolean
  verifiedAt: string | null
  phoneNumber: string | null
  profilePhoto: string | null
  onboardingCompletedAt: string | null
  updatedAt: string
}

export type AppointmentMode = 'InPerson' | 'Video' | 'Phone'
export type AppointmentStatus = 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled' | 'NoShow'

export interface AppointmentDoctorSummary {
  id: string
  name: string
  specialty: string | null
  hospitalName: string | null
}

/** The patient-facing appointment shape — GET /appointments. */
export interface Appointment {
  id: string
  scheduledAt: string
  durationMins: number
  mode: AppointmentMode
  modeLabel: string
  status: AppointmentStatus
  statusLabel: string
  reason: string | null
  locationName: string | null
  doctor: AppointmentDoctorSummary | null
  canCancel: boolean
  joinUrl: string | null
  isVideo: boolean
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
}

/** The bookable directory a patient chooses from — GET /doctors. */
export interface BookableDoctor {
  id: string
  name: string
  specialty: string | null
  qualifications: string | null
  hospitalName: string | null
  yearsExperience: number | null
}

/** A doctor's own active care-team panel — GET /doctor/patients. */
export interface DoctorPatientSummary {
  /** Internal UUID — what the clinical APIs take. */
  patientId: string
  /** The UHID — what clinician-facing URLs are keyed on. */
  shriPatientId: string
  name: string
  careRole: string
  isPrimary: boolean
  since: string
  lastAppointment: { scheduledAt: string; status: AppointmentStatus } | null
}

export interface AvailabilitySlot {
  id: string
  doctorId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMins: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DoctorLeave {
  id: string
  doctorId: string
  startDate: string
  endDate: string
  reason: string | null
  createdAt: string
}

export interface DashboardClinicItem {
  id: string
  scheduledAt: string
  durationMins: number
  mode: AppointmentMode
  status: AppointmentStatus
  reason: string | null | undefined
  locationName: string | null
  patientId: string
  /** The UHID — what the chart route is keyed on. */
  shriPatientId: string
  patientName: string
}

export interface DashboardNeedsAttentionRow {
  patientId: string
  /** The UHID — what the chart route is keyed on. */
  shriPatientId: string
  name: string
  careRole: string
  isPrimary: boolean
  band: 'High' | 'Medium' | 'Low' | null
  score: number
  signals: string[]
  hasAssessment: boolean
  assessedAt: string | null
}

/** The doctor "My Day" aggregate — GET /doctor/dashboard. */
export interface DoctorDashboard {
  asOf: string
  /**
   * Per-day appointment counts, four weeks back and two forward, bucketed by
   * local date. Drives both the clinic calendar's load shading and the weekly
   * visit chart. Cancelled appointments are excluded — they occupied no slot.
   */
  dailyLoad: Array<{ date: string; total: number; completed: number }>
  today: {
    date: string
    total: number
    seen: number
    remaining: number
    next: DashboardClinicItem | null
    clinic: DashboardClinicItem[]
  }
  counts: {
    panelPatients: number
    upcoming: number
    urgentAssessments: number
    openEncounters: number
  }
  needsAttention: DashboardNeedsAttentionRow[]
  trend: Array<{ month: string; label: string; total: number; completed: number }>
}

/** GET /care-team's shape — see careteam.service.ts's toResponseShape. */
export interface CareTeamMember {
  id: string
  careRole: string
  isPrimary: boolean
  activeFrom: string
  doctor: {
    id: string
    name: string
    specialty: string | null
    qualifications: string | null
    hospitalName: string | null
    isVerified: boolean
  }
}

export type NotificationType = 'General' | 'Appointment' | 'Report' | 'Medication' | 'CareTeam'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  actionUrl: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export type FeedbackCategory = 'DoctorExperience' | 'HospitalService' | 'AppUsability' | 'Other'

export interface Feedback {
  id: string
  rating: number
  category: FeedbackCategory
  comment: string | null
  doctorName: string | null
  createdAt: string
}

/** A Hospital Admin's own staff profile — GET/PATCH /hospital-admin/profile. */
/** A Hospital Admin's own profile — GET/PATCH /hospital-admin/profile, and
 *  reused by GET /auth/me for the HospitalAdmin role (see staffProfile.service.ts). */
export interface StaffProfile {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  department: string | null
  phoneNumber: string | null
  hospitalId: string | null
  hospital: Hospital | null
  isVerified: boolean
  verifiedAt: string | null
  onboardingCompletedAt: string | null
  updatedAt: string
}

/** GET /hospital-admin/doctors's row shape — see toDoctorSummary. */
export interface HospitalAdminDoctorRow {
  id: string
  name: string
  specialty: string | null
  qualifications: string | null
  yearsExperience: number | null
  registrationNumber: string | null
  isVerified: boolean
  verifiedAt: string | null
  isActive: boolean
  email: string
  phoneNumber: string | null
  onboardingCompletedAt: string | null
  availability: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }>
}

export interface HospitalAdminPatientRow {
  id: string
  name: string
  lastActivity: string
  doctorName: string
}

/** GET /hospital-admin/appointments's row shape — a flat operational view,
 *  distinct from the patient-facing `Appointment` shape. */
export interface HospitalAdminAppointmentRow {
  id: string
  scheduledAt: string
  status: AppointmentStatus
  mode: AppointmentMode
  doctorName: string
  patientName: string
}

/** GET /hospital-admin/analytics's shape — see hospitalAdminService.getAnalytics. */
export interface HospitalAdminAnalytics {
  totalPatients: number
  activePatients: number
  doctorCount: number
  appointmentsByStatus: Partial<Record<AppointmentStatus, number>>
  appointmentTrend: Array<{ date: string; count: number }>
}

/** GET /ai/conversations's row shape — see ai.repository.ts's ConversationSummary. */
export interface AiConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export type AiMessageRole = 'User' | 'Assistant'

/** Every assistant turn's `kind` records what actually produced it — see the
 *  `AiMessageKind` enum doc comment in schema.prisma. Rendering it distinctly
 *  is what lets a patient always tell a fixed safety message from a real
 *  generated answer; 'Model' (a normal generated reply) has no special style. */
export type AiMessageKind =
  | 'Model'
  | 'Placeholder'
  | 'SafetyInterlock'
  | 'SafetyBlocked'
  | 'BudgetDeferred'
  | 'PolicyBlocked'

export interface AiMessage {
  id: string
  role: AiMessageRole
  content: string
  isPlaceholder: boolean
  kind: AiMessageKind
  createdAt: string
}

/** GET /ai/conversations/:id's shape — narrower than the summary (no
 *  createdAt/updatedAt/messageCount), see ai.service.ts's getConversation. */
export interface AiConversation {
  id: string
  title: string
  messages: AiMessage[]
}

// ── Clinical notes ───────────────────────────────────────────────────────────

/**
 * `CosignPending` is what a note becomes when its author lacks
 * `note:sign:own` — a resident's note is complete but not yet attested. It is
 * a distinct state from Draft: the author is finished with it and cannot edit
 * it further, but nobody has signed it, so it is not part of the legal record
 * either.
 */
export type ClinicalNoteStatus = 'Draft' | 'CosignPending' | 'Signed'

export interface ClinicalNoteAddendum {
  id: string
  noteId: string
  body: string
  authorUserId: string
  authorName: string
  authorRegistrationNumber: string | null
  createdAt: string
}

export interface ClinicalNote {
  id: string
  patientId: string
  encounterId: string | null
  appointmentId: string | null
  authorUserId: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  problemCode: string | null
  problemText: string | null
  status: ClinicalNoteStatus
  signedAt: string | null
  signedByUserId: string | null
  signerName: string | null
  signerRegistrationNumber: string | null
  /**
   * Set at sign time from the AUTHOR's capabilities, not read back from the
   * role. A note authored by someone without `note:sign:own` is complete but
   * unattested until a consultant counter-signs it.
   */
  requiresCosign: boolean
  cosignedAt: string | null
  cosignedByUserId: string | null
  /** ⚠️ Kept ALONGSIDE signerName, never replacing it. Both identities are
   *  part of the record — who wrote it and who stood behind it. */
  cosignerName: string | null
  cosignerRegistrationNumber: string | null
  returnedAt: string | null
  returnReason: string | null
  /**
   * The visit id of the encounter this note was written at, or null for a note
   * with no encounter. ⚠️ Distinct from `encounterId`, which is the internal
   * UUID — clinician routes are keyed on the visit id, so this is the one that
   * can be navigated to.
   */
  encounterVisitId: string | null
  createdAt: string
  updatedAt: string
  addenda: ClinicalNoteAddendum[]
}

// ── M-06 · Clinical authoring ────────────────────────────────────────────────
// Mirrors the server's M-06 response shapes. See the header of this file on
// why these are hand-mirrored rather than shared.

export type RoleNameWithResident = RoleName

/**
 * What a clinician sees of a patient — GET /patients/:shriPatientId/clinical.
 *
 * ⚠️ Distinct from `PatientProfile`, which is the patient's own self-read.
 * `knownAllergies` is the load-bearing field: the Z3 banner must show it as
 * text, and the prescription hard stop is evaluated against it.
 */
export interface ClinicalPatient {
  id: string
  shriPatientId: string
  firstName: string
  middleName: string | null
  lastName: string
  dateOfBirth: string | null
  dobIsEstimated: boolean
  age: number | null
  gender: string | null
  bloodGroup: string | null
  maritalStatus: string | null
  abhaId: string | null
  identityStatus: string
  registrationSource: string
  hasPortalAccount: boolean
  phoneNumber: string | null
  alternatePhone: string | null
  city: string | null
  district: string | null
  state: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  knownAllergies: string | null
  currentMedications: string | null
  existingDiseases: string | null
  familyHistory: string | null
  previousSurgeries: string | null
  smokingStatus: string | null
  alcoholStatus: string | null
  tobaccoStatus: string | null
  physicalActivity: string | null
  occupation: string | null
  updatedAt: string
}

export interface PatientSearchResult {
  id: string
  shriPatientId: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  identityStatus: string
  lastEncounterAt: string | null
}

/**
 * Mirrors the server's `EncounterType` enum exactly.
 *
 * ⚠️ This is a union, not `string`, on purpose. `createEncounter` previously
 * took a `string` and a plausible-looking value ("Outpatient") was rejected by
 * the server's zod schema at runtime — the clinician clicked "Start
 * consultation" and nothing happened. A wrong member now fails to compile.
 */
export type EncounterType =
  | 'ClinicVisit'
  | 'AmbulanceIntake'
  | 'Emergency'
  | 'Telehealth'
  | 'FollowUp'
  | 'Screening'
  | 'FieldRegistration'

export interface ClinicianEncounter {
  id: string
  visitId: string
  type: string
  startedAt: string
  patientId: string
  shriPatientId: string
  patientName: string
}

// ── Problems ─────────────────────────────────────────────────────────────────

export type ProblemStatus = 'Active' | 'Resolved'

export interface DiagnosisCode {
  code: string
  title: string
  parentCode: string | null
  /** ⚠️ Only a leaf may be coded. A parent is a category, not a diagnosis. */
  isLeaf: boolean
  isActive: boolean
}

export interface Problem {
  id: string
  patientId: string
  onsetEncounterId: string | null
  code: string
  codeTitle: string
  status: ProblemStatus
  onsetDate: string | null
  resolvedAt: string | null
  note: string | null
  recordedByUserId: string
  createdAt: string
  updatedAt: string
}

// ── Prescribing ──────────────────────────────────────────────────────────────

export type PrescriptionStatus = 'Draft' | 'Signed' | 'Cancelled'

export interface Drug {
  id: string
  genericName: string
  form: string
  strength: string
  route: string
  allergenClass: string | null
  therapeuticClass: string | null
  isNlem: boolean
  isActive: boolean
  /** False marks a drug added beyond UI_ATLAS §8.5's fixed vocabulary. */
  isAtlasVocabulary: boolean
}

export interface PrescriptionItem {
  id: string
  prescriptionId: string
  drugId: string
  dose: string
  doseUnit: string
  route: string
  frequency: string
  durationDays: number
  indicationCode: string | null
  substitutionAllowed: boolean
  instructions: string | null
  createdAt: string
  drug: Drug
}

export interface Prescription {
  id: string
  patientId: string
  encounterId: string | null
  rxNumber: string
  status: PrescriptionStatus
  authorUserId: string
  signedAt: string | null
  signerName: string | null
  signerRegistrationNumber: string | null
  signerHprId: string | null
  createdAt: string
  updatedAt: string
  items: PrescriptionItem[]
}

export interface AlternativeDrug {
  id: string
  genericName: string
  strength: string
  form: string
  route: string
  isNlem: boolean
}

/** A blocking allergy collision. ⚠️ Sign is disabled while any of these stand. */
export interface HardStop {
  itemId: string
  drugName: string
  allergenKey: string
  blocksClass: string
  rationale: string
  alternatives: AlternativeDrug[]
}

export type DoseVerdict =
  | { status: 'ok' }
  | { status: 'unknown'; message: string }
  | { status: 'below' | 'above'; message: string; min: number; max: number; unit: string }

export interface DoseWarning {
  itemId: string
  drugName: string
  verdict: DoseVerdict
}

export interface SafetyEvaluation {
  hardStops: HardStop[]
  /** Advisory only — an out-of-range dose warns, it does not block. */
  doseWarnings: DoseWarning[]
  canSign: boolean
  documentedAllergens: string[]
}

// ── Instructions & templates ─────────────────────────────────────────────────

export interface PatientInstruction {
  id: string
  patientId: string
  encounterId: string | null
  title: string
  body: string
  clinicianWording: string | null
  /** The language `title` and `body` above are written in — the patient's. */
  language: string
  /**
   * ⚠️ A6 — the English counterpart, for the bilingual printed sheet. Null when
   * `language` is `'en'` (the body already is English) and null when nobody
   * recorded one, which the printout states rather than papering over.
   */
  titleEnglish: string | null
  bodyEnglish: string | null
  issuedAt: string
  issuedByUserId: string
  issuedByName: string
  createdAt: string
}

export type TemplateScope = 'Personal' | 'Facility'

export interface ClinicalTemplate {
  id: string
  key: string
  name: string
  scope: TemplateScope
  category: string
  body: string
  ownerUserId: string
  ownerName: string
  effectiveFrom: string
  effectiveTo: string | null
  reviewDueAt: string | null
  promotionRequestedAt: string | null
  promotedAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Co-sign ──────────────────────────────────────────────────────────────────

export interface CosignQueueItem {
  id: string
  patientId: string
  shriPatientId: string
  patientName: string
  authoredBy: string | null
  authoredAt: string | null
  problemText: string | null
  ageHours: number
}

export interface QualityFinding {
  section: string
  term: string
  risk: string
  useInstead: string
  index: number
}

// ── Break-glass ──────────────────────────────────────────────────────────────

export type BreakGlassReason =
  | 'EmergencyCare'
  | 'CoveringColleague'
  | 'OnCallReview'
  | 'QualityReview'
  | 'Other'

/** ⚠️ Name and UHID only — nothing clinical before a reason is given. */
export interface BreakGlassIdentity {
  shriPatientId: string
  fullName: string
}

export interface BreakGlassGrantView {
  id: string
  patientId: string
  shriPatientId: string
  patientName: string
  reasonCategory: BreakGlassReason
  grantedAt: string
  expiresAt: string
}

export interface BreakGlassReviewRow {
  id: string
  patientName: string
  shriPatientId: string
  actorName: string
  reasonCategory: BreakGlassReason
  reason: string
  grantedAt: string
  expiresAt: string
  isExpired: boolean
  reviewedAt: string | null
  outcome: 'Appropriate' | 'Inappropriate' | null
  reviewNote: string | null
  ageHours: number
}
