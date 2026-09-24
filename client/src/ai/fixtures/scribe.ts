import type { ConfidenceBand } from '../types'

/**
 * `AI-101` / `AI-104` — the ambient scribe's canned consultation.
 *
 * ⚠️ NOTHING IS TRANSCRIBED HERE. No audio is captured, sent or processed. The
 * microphone permission the overlay requests is real because the *consent and
 * recording flow* is what `S-06-04` is specifying, but the words below are
 * fixed text played back on a timer. Every surface that shows them says so.
 *
 * ⚠️ CODE-MIXED KANNADA AND ENGLISH, per the drawing note at §6634: "that is
 * the Indian consulting-room reality". A scribe demo in clean English is a
 * demo of a problem nobody in this market has. The Kannada is transliterated
 * into Latin script, which is how it is actually typed and read here.
 *
 * ⚠️ EVERY DRAFTED SENTENCE CARRIES THE UTTERANCE IDS IT CAME FROM. §6602
 * makes the transcript span behind each sentence a **mandatory** explainability
 * requirement for `AI-101`, and it is the whole reason a clinician can trust a
 * draft they did not write: they can point at a sentence and see what was said.
 *
 * Sample data is `SD-P-01` Meera Krishnan's six-minute thyroid review (§6632),
 * with four sections drafted and one at MED confidence (§4.5 wants one
 * mid-confidence item visible so the band means something).
 */

export interface Utterance {
  id: string
  /** Seconds from the start of the recording. */
  at: number
  speaker: 'clinician' | 'patient'
  text: string
  /** Marks a line that is wholly or partly Kannada, for the language chip. */
  mixed?: boolean
}

export interface ScribeDraft {
  section: 'subjective' | 'objective' | 'assessment' | 'plan'
  text: string
  band: ConfidenceBand
  /** ⚠️ The utterances this text came from. Never empty. */
  from: string[]
}

/** ~6 minutes of consultation, in the order it was spoken. */
export const TRANSCRIPT: readonly Utterance[] = Object.freeze([
  { id: 'u1', at: 4, speaker: 'clinician', text: 'Namaskara Meera avare, banni koothkolli. How have you been since the last visit?', mixed: true },
  { id: 'u2', at: 11, speaker: 'patient', text: 'Swalpa better sir, but tumba sustu aagtide — especially morning time.', mixed: true },
  { id: 'u3', at: 19, speaker: 'patient', text: 'Weight also two kilo jaasti aagide, and hair fall is still there.', mixed: true },
  { id: 'u4', at: 27, speaker: 'clinician', text: 'Tablet regular thagothidheera? The seventy-five microgram one, empty stomach?', mixed: true },
  { id: 'u5', at: 34, speaker: 'patient', text: 'Haudu, daily morning. But sometimes coffee kudidmele thagontheeni.', mixed: true },
  { id: 'u6', at: 42, speaker: 'clinician', text: 'That is the problem. Coffee and calcium reduce absorption. Take it and wait thirty to sixty minutes before anything else.' },
  { id: 'u7', at: 55, speaker: 'clinician', text: 'Let me check. Pulse is seventy-two, regular. Blood pressure one eighteen over seventy-six.' },
  { id: 'u8', at: 66, speaker: 'clinician', text: 'Thyroid is not enlarged, no nodule palpable. Ankle reflexes slightly delayed. No pedal oedema.' },
  { id: 'u9', at: 80, speaker: 'patient', text: 'Sir, thale suttidange aagtide sometimes when I stand up fast.', mixed: true },
  { id: 'u10', at: 88, speaker: 'clinician', text: 'Noted. We will keep an eye on that. Your last TSH was eight point two, which is still high.' },
  { id: 'u11', at: 99, speaker: 'clinician', text: 'The dose is probably fine — the timing is what is undoing it. Let us correct the timing first and repeat the TSH in six weeks.' },
  { id: 'u12', at: 114, speaker: 'clinician', text: 'Continue seventy-five micrograms daily. Repeat TSH after six weeks. Come back with the report.' },
  { id: 'u13', at: 126, speaker: 'patient', text: 'Sari sir. Yaavaga barbeku?', mixed: true },
  { id: 'u14', at: 131, speaker: 'clinician', text: 'Six weeks. And if the giddiness gets worse or you feel your heart racing, come earlier.' },
])

/**
 * What the scribe produces from the above.
 *
 * ⚠️ `assessment` is deliberately MED. The Atlas asks for one mid-confidence
 * section (§6566) and the clinical reason is honest: the clinician said the
 * dose is "probably" fine, so a confident assessment would be asserting more
 * than was said. A scribe that upgrades hedged speech into flat statements is
 * the specific failure mode this band exists to expose.
 */
export const DRAFTS: readonly ScribeDraft[] = Object.freeze([
  {
    section: 'subjective',
    text:
      'Attends for thyroid review. Reports feeling somewhat better than at the last visit but '
      + 'describes persistent fatigue, worse in the mornings. Two kilogram weight gain and '
      + 'ongoing hair fall. Takes levothyroxine 75 micrograms each morning, but sometimes after '
      + 'coffee. Also reports intermittent light-headedness on standing quickly.',
    band: 'HIGH',
    from: ['u2', 'u3', 'u5', 'u9'],
  },
  {
    section: 'objective',
    text:
      'Pulse 72, regular. Blood pressure 118/76. Thyroid not enlarged, no palpable nodule. '
      + 'Ankle reflexes slightly delayed. No pedal oedema.',
    band: 'HIGH',
    from: ['u7', 'u8'],
  },
  {
    section: 'assessment',
    text:
      'Hypothyroidism, inadequately controlled — last TSH 8.2. The dose appears adequate; '
      + 'absorption is likely being reduced by taking the tablet with coffee.',
    band: 'MED',
    from: ['u10', 'u11', 'u5'],
  },
  {
    section: 'plan',
    text:
      'Continue levothyroxine 75 micrograms daily, on an empty stomach, with a 30 to 60 minute '
      + 'gap before food, coffee or calcium. Repeat TSH in six weeks and review with the report. '
      + 'Advised to return sooner if the light-headedness worsens or palpitations develop.',
    band: 'HIGH',
    from: ['u6', 'u11', 'u12', 'u14'],
  },
])

/** Total recorded length, used for the timer and the ≥10s gate. */
export const DURATION_SECONDS = 140

/**
 * ⚠️ The `AI-ABSTAIN` copy, fixed here rather than in a component.
 * §6626: audio unintelligible → say so and keep the transcript; **never a
 * fabricated draft**. The temptation on a demo is to always produce something.
 */
export const ABSTAIN_REASON =
  'Could not make out enough of this recording to draft from it. The transcript is kept below '
  + 'exactly as captured — nothing has been guessed or filled in. Type the note, or record again '
  + 'somewhere quieter.'
