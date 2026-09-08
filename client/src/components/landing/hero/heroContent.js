/* ═══════════════════════════════════════════════════════════════════
   Hero copy + data — every string and number the hero renders lives here.

   Numbers are drawn from data already established elsewhere on this page:
   the stat trio reuses the partner-network figures from PartnerMap.jsx
   (23 partner sites / 6 districts / ≤110km catchment) rather than inventing
   deployment or accuracy numbers Stroke AI doesn't have yet — the product
   is pre-launch (see LandingHeader's former "Launching soon" tag), so
   figures like "1,240 hospitals connected" or "94% triage accuracy" would
   be unsourced medical claims. The neuron figure in the headline is the
   same citation already used in the "Why It Matters" section below
   (Saver, J.L., "Time Is Brain — Quantified," Stroke, 2006).
═══════════════════════════════════════════════════════════════════ */

export const TICKER_ITEMS = [
  { text: 'Stroke AI is a joint programme from SHRI-AI and IndoStates Health Hospital', href: '#team' },
  { text: 'See how the response path works, end to end', href: '/demo' },
]

export const HEADLINE_LINES = ['Every minute', 'costs 1.9 million', 'neurons']

export const SUBHEAD =
  'Stroke AI reads non-contrast CT, flags large-vessel occlusion, and alerts your whole stroke ' +
  'team from one scan — so every layer of delay between symptom and treatment collapses into one race against the clock.'

export const CTA = { label: 'Explore the platform', href: '/demo' }

export const STATS = [
  { value: '23', label: 'partner sites' },
  { value: '6', label: 'districts across two states' },
  { value: '≤110 km', label: 'farthest site from the hub' },
]

export const STAT_SOURCE_NOTE = 'Coimbatore rollout network — see the partner map below.'

export const NEURON_CITATION = 'Saver, J.L., "Time Is Brain — Quantified," Stroke, 2006.'
