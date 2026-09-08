import { Reveal, SectionHead } from './primitives.jsx'
import { BODY, STRONG, DISPLAY, CREAM, PAPER, INK, INK_BODY, RULE, FLOW_GOLD, TINT } from './theme.js'

/* ═══════════════════════════════════════════════════════════════════
   PartnerMap — the catchment map and the numbers that go with it.

   The artwork is a light-ground map, so it sits on paper rather than needing
   the command centre's dark plate. Legend swatches are keyed to colours
   sampled out of the map itself (#FA3D52 priority, #3A528C partner,
   #FED349 catchment) so the key actually matches the picture.

   Layout: map beside the panels from 1080px, stacked below that, with the
   panels going two-up on tablets before collapsing to one column.
═══════════════════════════════════════════════════════════════════ */

const MAP_RED = '#FA3D52'
const MAP_BLUE = '#3A528C'
const MAP_GOLD = '#F2B824'

const STATS = [
  { value: '23', label: 'partner sites', ink: MAP_RED },
  { value: '6', label: 'districts, 2 states', ink: INK },
  { value: '≤110 km', label: 'farthest site', ink: '#8C6114' },
]

const DISTANCES = [
  { place: 'Coimbatore', km: 'The hub', mark: true },
  { place: 'Mettupalayam', km: '32 km' },
  { place: 'Palladam', km: '36 km' },
  { place: 'Pollachi', km: '40 km' },
  { place: 'Palakkad (Kerala)', km: '42 km' },
  { place: 'Chittur (Kerala)', km: '42 km' },
  { place: 'Erode', km: '91 km' },
  { place: 'Tiruchengode', km: '110 km', mark: true },
]

const PHASES = [
  { name: 'Phase 1', dot: MAP_RED, towns: 'Coimbatore · Tiruppur · Erode' },
  { name: 'Phase 2', dot: MAP_BLUE, towns: 'Pollachi · Mettupalayam · Nilgiris' },
  { name: 'Phase 3', dot: '#9A9A90', towns: 'Remaining towns inside 110 km, incl. Kerala' },
]

const LEGEND = [
  { label: 'Hub', dot: MAP_GOLD },
  { label: 'Priority scan hub', dot: MAP_RED },
  { label: 'Partner scan centre', dot: MAP_BLUE },
  { label: 'Imaging density', dot: '#F58BA0' },
  { label: 'Golden-hour catchment', dash: true },
]

export default function PartnerMap() {
  return (
    <section id="network" style={{
      background: PAPER,
      borderTop: `1px solid ${RULE}`,
      position: 'relative', zIndex: 10,
      scrollMarginTop: '124px',
    }}>
      <style>{`
        .sa-map-grid { display: grid; gap: clamp(16px, 2.2vw, 28px); align-items: start; }
        @media (min-width: 1080px) {
          .sa-map-grid { grid-template-columns: minmax(0, 1fr) minmax(430px, 44%); }
        }

        /* No card, no border: the artwork is a transparent PNG and reads best
           sitting straight on the page ground. */
        .sa-map-plate { margin: 0; }
        .sa-map-plate img {
          display: block;
          width: 100%;
          height: auto;
          max-width: 100%;
          margin: 0 auto;
          /* Invariant: never distort, whatever the box does. */
          object-fit: contain;
        }
        /* Ceiling keeps the artwork from setting the section's height — it
           scales down and centres instead of pushing everything taller. Only
           above the panning breakpoint: below it a height cap fights the
           min-width that keeps the place names legible, and the two together
           squash the map. */
        @media (min-width: 700px) {
          .sa-map-plate img {
            width: auto;
            max-height: clamp(340px, 50vh, 520px);
          }
        }

        /* On a phone the place names shrink past reading size, so the map gets
           its own horizontal scroll and keeps a legible intrinsic width. The
           scroll is contained by the figure — the page itself never scrolls
           sideways. */
        .sa-map-hint { display: none; }
        @media (max-width: 699px) {
          .sa-map-plate { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .sa-map-plate img { min-width: 560px; max-height: none; height: auto; }
          .sa-map-hint {
            display: block;
            margin: 9px 0 0;
            font-family: 'Lato', system-ui, sans-serif;
            font-size: 11.5px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: ${INK_BODY};
          }
        }

        .sa-map-side { display: grid; gap: clamp(12px, 1.6vw, 18px); align-content: start; }
        /* Two-up from tablet upward, figures spanning — stacking all three was
           what made this section so tall. */
        @media (min-width: 680px) {
          .sa-map-side { grid-template-columns: 1fr 1fr; }
          .sa-map-side > :first-child { grid-column: 1 / -1; }
        }

        .sa-map-card {
          background: ${CREAM};
          border: 1px solid ${RULE};
          border-radius: 10px;
          padding: clamp(16px, 1.8vw, 24px);
        }

        /* Figures, divided the way the reference divides them */
        .sa-map-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .sa-map-stats > * { padding: 0 clamp(6px, 1vw, 14px); text-align: center; }
        .sa-map-stats > * + * { border-left: 1px solid ${RULE}; }
        .sa-map-stats > *:first-child { padding-left: 0; }
        .sa-map-stats > *:last-child { padding-right: 0; }

        .sa-map-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          padding: clamp(7px, 0.8vw, 9px) 0;
        }
        .sa-map-row + .sa-map-row { border-top: 1px solid ${RULE}; }

        .sa-map-legend {
          list-style: none;
          margin: clamp(20px, 3vw, 32px) 0 0;
          padding: clamp(16px, 2vw, 22px) 0 0;
          border-top: 1px solid ${RULE};
          display: flex;
          flex-wrap: wrap;
          gap: clamp(12px, 2.4vw, 38px);
          align-items: center;
          justify-content: center;
        }
        .sa-map-legend li { display: flex; align-items: center; gap: 9px; }
      `}</style>

      <div style={{
        maxWidth: '1800px', margin: '0 auto',
        padding: 'clamp(2.25rem, 4vw, 3.5rem) clamp(1.25rem, 3vw, 2.5rem)',
      }}>
        <Reveal>
          <SectionHead
            label="The Partner Network"
            title="Built to reach further."
            lede="Every scan centre and lab within reach of the hub — close enough to return a patient inside the golden hour."
          />
        </Reveal>

        <Reveal delay={80} style={{ marginTop: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}>
          <div className="sa-map-grid">
            <figure className="sa-map-plate">
              <img
                src="/partner-map.webp"
                alt="Map of the partner network: Coimbatore at the hub, with scan centres and labs across six districts in Tamil Nadu and Kerala, all inside a 110 km golden-hour catchment."
                width="1700" height="1415"
                loading="lazy" decoding="async"
              />
              <figcaption className="sa-map-hint">Scroll the map sideways to read the sites →</figcaption>
            </figure>

            <div className="sa-map-side">
              <div className="sa-map-card sa-map-stats">
                {STATS.map(({ value, label, ink }) => (
                  <div key={label}>
                    <div style={{
                      /* nowrap + a modest ceiling: "≤110 km" is the long one, and
                         letting it break made this column taller than the others */
                      ...DISPLAY, fontSize: 'clamp(1.15rem, 1.8vw, 1.6rem)',
                      lineHeight: 1.1, letterSpacing: '-0.02em', color: ink,
                      whiteSpace: 'nowrap',
                    }}>
                      {value}
                    </div>
                    <div style={{
                      ...BODY, fontSize: 'clamp(10.5px, 0.85vw, 12px)',
                      lineHeight: 1.4, color: INK_BODY, marginTop: '7px',
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sa-map-card">
                <h3 style={{
                  ...STRONG, fontSize: '11px', letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: INK_BODY, margin: '0 0 clamp(8px, 1vw, 12px)',
                }}>
                  Distance from hub
                </h3>
                {DISTANCES.map(({ place, km, mark }) => (
                  <div key={place} className="sa-map-row">
                    <span style={{ ...BODY, fontSize: 'clamp(12.5px, 1vw, 13.5px)', color: INK_BODY }}>
                      {place}
                    </span>
                    <span style={{
                      ...STRONG, fontSize: 'clamp(12.5px, 1vw, 13.5px)',
                      color: mark ? '#8C6114' : INK, whiteSpace: 'nowrap',
                    }}>
                      {km}
                    </span>
                  </div>
                ))}
              </div>

              <div className="sa-map-card">
                <h3 style={{
                  ...STRONG, fontSize: '11px', letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: INK_BODY, margin: '0 0 clamp(10px, 1.2vw, 14px)',
                }}>
                  Rollout phasing
                </h3>
                {PHASES.map(({ name, dot, towns }, i) => (
                  <div key={name} style={{ marginTop: i ? 'clamp(12px, 1.4vw, 16px)' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span aria-hidden="true" style={{
                        width: '9px', height: '9px', borderRadius: '50%',
                        background: dot, boxShadow: `0 0 0 1px rgba(22,22,15,0.22)`,
                        flexShrink: 0,
                      }} />
                      <span style={{ ...STRONG, fontSize: 'clamp(12.5px, 1vw, 13.5px)', color: INK }}>
                        {name}
                      </span>
                    </div>
                    <p style={{
                      ...BODY, fontSize: 'clamp(12px, 0.95vw, 13px)', lineHeight: 1.55,
                      color: INK_BODY, margin: '5px 0 0 18px',
                    }}>
                      {towns}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <ul className="sa-map-legend">
            {LEGEND.map(({ label, dot, dash }) => (
              <li key={label}>
                {dash ? (
                  <svg width="26" height="8" viewBox="0 0 26 8" fill="none" aria-hidden="true">
                    <path d="M1 4h24" stroke={FLOW_GOLD} strokeWidth="2.4"
                      strokeLinecap="round" strokeDasharray="5 4" />
                  </svg>
                ) : (
                  <span aria-hidden="true" style={{
                    width: '11px', height: '11px', borderRadius: '50%',
                    background: dot, boxShadow: '0 0 0 1px rgba(22,22,15,0.28)',
                    flexShrink: 0,
                  }} />
                )}
                <span style={{ ...BODY, fontSize: 'clamp(11.5px, 0.95vw, 13px)', color: INK_BODY }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
