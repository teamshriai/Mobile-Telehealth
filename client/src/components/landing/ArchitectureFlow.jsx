import { BODY, STRONG, PAPER, INK, INK_BODY, RULE, FLOW_AMBER, FLOW_GOLD, FLOW_NAVY, TINT } from './theme.js'

/* ═══════════════════════════════════════════════════════════════════
   ArchitectureFlow — the response path, drawn.

   Five steps run left to right, each reporting up to the command centre that
   spans the top. Below 1200px the diagram stands on end: the steps become
   rows and the arrows point down, because five photo cards across cannot
   survive a laptop, let alone a phone.

   Layout note: connector and card live together inside one `<li>` of a single
   five-column grid. The obvious alternative — a row of connectors above a row
   of cards, as two sibling grids — drifts out of alignment, because `1fr`
   tracks floor at min-content and the two rows hold different content.

   The photographs are placeholders. Swap the URLs in STEPS for real assets.
═══════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    num: '01',
    tint: TINT.sand,
    title: 'Patient alert',
    chip: 'Alert received',
    desc: 'The patient or a bystander triggers the mobile health app.',
    photo: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=70',
    alt: 'A smartphone home screen held in one hand',
  },
  {
    num: '02',
    tint: TINT.sky,
    title: 'Nearest ambulance',
    chip: 'Dispatch + vitals',
    desc: 'Reaches the patient, starts initial care, then drives to the scan lab.',
    photo: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=600&q=70',
    alt: 'An ambulance on a city street',
  },
  {
    num: '03',
    tint: TINT.teal,
    title: 'Partnered scan lab',
    chip: 'Scan data + AI',
    desc: 'CT imaging is done and the scan data goes straight to the command centre.',
    /* Axial brain CT, Wikimedia Commons, CC0:
       commons.wikimedia.org/wiki/File:CT_scan_of_a_pacchionian_body_-_transverse_plane.jpg
       Letterboxed on black locally so the skull isn't cropped by the 5:4 frame. */
    photo: '/scan-brain-ct.webp',
    alt: 'An axial CT slice of a brain',
  },
  {
    num: '04',
    tint: TINT.clay,
    title: 'Stroke AI ambulance',
    chip: 'Meds decided',
    desc: 'Meets the patient at the lab and gives the medication en route.',
    /* Side profile facing right, so the vehicle reads as travelling along the
       flow. Wikimedia Commons, CC0 (Raysonho), hosted locally:
       commons.wikimedia.org/wiki/File:YorkRegionParamedicAmbulance.jpg */
    photo: '/stroke-ambulance.webp',
    alt: 'A paramedic ambulance seen side-on',
    badge: 'AI',
  },
  {
    num: '05',
    tint: TINT.sage,
    title: 'IndoStates Health hub',
    chip: 'Therapy plan',
    desc: 'The patient arrives and the agreed therapy begins immediately.',
    photo: '/indostates-hub.webp',
    alt: 'The IndoStates Health hospital building',
    terminal: true,
  },
]

/* Response-path arrows.

   Drawn as ONE filled polygon rather than a stroked shaft plus a stroked head.
   Two stroked subpaths cannot meet cleanly: the shaft's own outline and round
   cap surface inside the V of the head, which showed as a nick at the joint.
   A single outlined shape has no internal seam to leak through. */
function SolidArrow({ w, h, box, points, outline = 1.5 }) {
  return (
    <svg width={w} height={h} viewBox={box} aria-hidden="true">
      <polygon
        points={points}
        fill="currentColor"
        stroke={INK}
        strokeWidth={outline}
        strokeLinejoin="round"
        strokeLinecap="round"
        shapeRendering="geometricPrecision"
      />
    </svg>
  )
}

const ArrowRight = () => (
  <SolidArrow w={46} h={20} box="0 0 46 20"
    points="2.5,7.9 25,7.9 25,2.8 43.4,10 25,17.2 25,12.1 2.5,12.1" />
)

const ArrowDown = () => (
  <SolidArrow w={20} h={46} box="0 0 20 46"
    points="7.9,2.5 7.9,25 2.8,25 10,43.4 17.2,25 12.1,25 12.1,2.5" />
)

/* Carets stay stroked — a three-point chevron is a single subpath, so it has
   no joint to give away. */
function Arrow({ paths, w, h, box, weight = 3.4, outline = 1.8 }) {
  return (
    <svg width={w} height={h} viewBox={box} fill="none" aria-hidden="true">
      <g stroke={INK} strokeWidth={weight + outline} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </g>
      <g stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  )
}

const CaretUp = () => (
  <Arrow w={15} h={10} box="0 0 9 6" paths={['M1 5L4.5 1L8 5']} weight={2} outline={1.4} />
)
const CaretDown = () => (
  <Arrow w={15} h={10} box="0 0 9 6" paths={['M1 1L4.5 5L8 1']} weight={2} outline={1.4} />
)

export default function ArchitectureFlow() {
  return (
    <div className="sa-arch">
      <style>{`
        .sa-arch {
          --gap: clamp(28px, 3.4vw, 62px);
          --conn-h: clamp(88px, 8.6vw, 124px);
          --photo: clamp(120px, 26vw, 210px);   /* stacked layout only */
        }
        .sa-sr {
          position: absolute;
          width: 1px; height: 1px;
          padding: 0; margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }

        /* ── Command centre ── */
        /* The command centre is the one element that outranks the steps, so it
           gets the only saturated ground on the page. */
        .sa-arch-bar {
          background: linear-gradient(104deg, ${FLOW_NAVY} 0%, #1D2A4A 52%, #141D33 100%);
          border: 1.5px solid ${FLOW_GOLD}D9;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(22,22,15,.06), 0 18px 38px -24px rgba(20,29,51,.8);
          padding: clamp(16px, 2.2vw, 26px) clamp(18px, 2.4vw, 30px);
          display: flex;
          align-items: center;
          gap: clamp(14px, 2.2vw, 30px);
        }
        .sa-arch-bar-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }

        /* Ribbon mark in a gold ring, as in the reference artboard */
        .sa-arch-bar-mark {
          flex-shrink: 0;
          width: clamp(56px, 5.6vw, 84px);
          height: clamp(56px, 5.6vw, 84px);
          border-radius: 50%;
          border: 1.5px solid ${FLOW_GOLD}B3;
          /* White, not a 5% wash — on navy the wash left the ring looking empty. */
          background: #FFFFFF;
          display: grid;
          place-items: center;
        }
        .sa-arch-bar-mark img { width: 68%; height: 68%; object-fit: contain; display: block; }

        /* The IndoStates wordmark is dark artwork, so it needs a light plate to
           sit on rather than the navy. */
        .sa-arch-bar-logo {
          flex-shrink: 0;
          background: #FFFFFF;
          border-radius: 7px;
          padding: clamp(7px, 0.9vw, 11px) clamp(10px, 1.2vw, 15px);
        }
        .sa-arch-bar-logo img {
          height: clamp(26px, 2.6vw, 38px);
          width: auto;
          max-width: 100%;
          object-fit: contain;   /* never let a squeeze distort the mark */
          display: block;
        }
        @media (max-width: 767px) {
          .sa-arch-bar { flex-wrap: wrap; }
          .sa-arch-bar-main { flex-basis: 100%; order: 3; }
        }

        /* ── Steps ── */
        .sa-arch-steps { list-style: none; margin: 0; padding: 0; }

        /* Ground colour is set per step, inline — each card carries its own tint. */
        .sa-arch-card {
          position: relative;
          background: ${PAPER};
          border: 1px solid ${RULE};
          border-radius: 10px;
          overflow: hidden;
          height: 100%;
          box-sizing: border-box;
          box-shadow: 0 1px 2px rgba(22,22,15,.04), 0 10px 28px -18px rgba(22,22,15,.30);
        }
        /* The path ends where the colour of the path lands. The cap has to ride
           above the photograph, which covers the card's own top edge. */
        .sa-arch-card[data-terminal="true"]::before {
          content: '';
          position: absolute;
          inset: 0 0 auto 0;
          height: 4px;
          background: ${FLOW_AMBER};
          z-index: 1;
        }

        .sa-arch-photo {
          position: relative;
          aspect-ratio: 5 / 4;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px ${RULE};
        }
        .sa-arch-photo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sa-arch-badge {
          position: absolute;
          top: 8px; right: 8px;
          background: ${INK};
          color: ${PAPER};
          font-family: 'Lato', system-ui, sans-serif;
          font-weight: 700;
          font-size: 9.5px;
          letter-spacing: 0.08em;
          line-height: 1;
          padding: 5px 7px;
          border-radius: 3px;
        }

        .sa-arch-body { padding: clamp(11px, 1.15vw, 15px) clamp(12px, 1.3vw, 16px) clamp(12px, 1.3vw, 16px); }
        .sa-arch-num {
          font-family: 'Lato', system-ui, sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.14em;
          display: block;
          margin-bottom: 5px;
        }
        .sa-arch-title {
          font-family: 'Lato', system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(13px, 1.05vw, 14.5px);
          line-height: 1.28;
          color: ${INK};
          margin: 0 0 5px;
        }
        .sa-arch-desc {
          font-family: 'Lato', system-ui, sans-serif;
          font-size: clamp(11px, 0.85vw, 12px);
          line-height: 1.54;
          color: ${INK_BODY};
          margin: 0;
        }

        /* ── Two-way connector up to the command centre ── */
        .sa-arch-conn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          color: ${FLOW_AMBER};
        }
        .sa-arch-rule { width: 2px; flex: 1; min-height: 12px; background: ${FLOW_AMBER}80; border-radius: 2px; }
        .sa-arch-chip {
          font-family: 'Lato', system-ui, sans-serif;
          font-size: 11px;
          letter-spacing: 0.02em;
          color: ${INK_BODY};
          background: ${PAPER};
          border: 1px solid ${RULE};
          border-radius: 3px;
          padding: 5px 10px;
          white-space: nowrap;
        }

        /* ── Legend ── */
        .sa-arch-legend {
          display: flex;
          flex-wrap: wrap;
          gap: clamp(12px, 3vw, 40px);
          align-items: center;
          border-top: 1px solid ${RULE};
          padding-top: clamp(14px, 2vw, 20px);
          margin-top: clamp(22px, 3vw, 34px);
        }
        .sa-arch-legend-item {
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: 'Lato', system-ui, sans-serif;
          font-size: 12px;
          color: ${INK_BODY};
        }
        .sa-arch-legend-item svg { flex-shrink: 0; }

        /* ═══ Wide: five across ═══ */
        @media (min-width: 1200px) {
          .sa-arch-steps {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            column-gap: var(--gap);
            margin-top: clamp(8px, 1.2vw, 16px);
          }
          .sa-arch-step {
            position: relative;
            display: flex;
            flex-direction: column;
          }
          .sa-arch-conn { height: var(--conn-h); }
          /* Centred on the card, sitting in the column gap */
          .sa-arch-chev-right {
            position: absolute;
            left: calc(var(--gap) / -2);
            top: calc(var(--conn-h) + (100% - var(--conn-h)) * 0.4);
            transform: translate(-50%, -50%);
            color: ${FLOW_AMBER};
            display: block;
          }
          .sa-arch-step:first-child .sa-arch-chev-right { display: none; }
          .sa-arch-chev-down { display: none; }
          .sa-only-narrow { display: none; }
        }

        /* ═══ Narrow: the same flow, stood on end ═══ */
        @media (max-width: 1199px) {
          .sa-arch-steps {
            display: flex;
            flex-direction: column;
            margin-top: clamp(18px, 4vw, 26px);
          }
          .sa-arch-step { position: relative; padding-bottom: clamp(58px, 9vw, 70px); }
          .sa-arch-step:last-child { padding-bottom: 0; }

          /* The connector collapses to its label — one element, restyled, so the
             text never duplicates in the accessibility tree. */
          .sa-arch-conn {
            display: block;
            height: auto;
            margin-bottom: 9px;
          }
          .sa-arch-rule, .sa-arch-conn > svg { display: none; }
          .sa-arch-chip {
            display: inline-block;
            font-size: 10.5px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          /* Card turns into a row: photograph left, copy right */
          .sa-arch-card {
            display: grid;
            grid-template-columns: var(--photo) minmax(0, 1fr);
            align-items: stretch;
          }
          .sa-arch-photo { aspect-ratio: auto; height: 100%; min-height: 92px; }
          .sa-arch-body { padding: clamp(13px, 3.4vw, 18px); }

          .sa-arch-chev-right { display: none; }
          .sa-arch-chev-down {
            position: absolute;
            left: calc(var(--photo) / 2);
            bottom: clamp(6px, 1.4vw, 10px);
            transform: translateX(-50%);
            color: ${FLOW_AMBER};
            display: block;
          }
          .sa-arch-step:last-child .sa-arch-chev-down { display: none; }
          .sa-only-wide { display: none; }
        }
      `}</style>

      {/* ── Command centre ── */}
      <div className="sa-arch-bar">
        <span className="sa-arch-bar-mark">
          <img src="/shri-ai-mark.webp" alt="" aria-hidden="true" width="360" height="360" decoding="async" />
        </span>

        <div className="sa-arch-bar-main">
          <h3 style={{ ...STRONG, fontSize: 'clamp(15.5px, 1.6vw, 20px)', lineHeight: 1.3, color: '#FFFDF8', margin: 0 }}>
            SHRI-AI + IndoStates Health Command Centre
          </h3>
          <p style={{ ...STRONG, fontSize: 'clamp(12.5px, 1.1vw, 14.5px)', lineHeight: 1.4, color: FLOW_GOLD, margin: 0 }}>
            Mobile doctor + AI inference
          </p>
          <p style={{ ...BODY, fontSize: 'clamp(12px, 1vw, 13.5px)', lineHeight: 1.55, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            Coordinates every step below, both ways.
          </p>
        </div>

        <span className="sa-arch-bar-logo">
          <picture>
            <source srcSet="/logo-indostates-trans.webp" type="image/webp" />
            <img
              src="/logo-indostates.png"
              alt="IndoStates Health Hospital"
              width="640" height="156" decoding="async"
            />
          </picture>
        </span>
      </div>

      <p className="sa-sr">
        Every step below both reports to the command centre and takes direction from it.
      </p>

      {/* ── The response path ── */}
      <ol className="sa-arch-steps" role="list" aria-label="Stroke response path, five steps">
        {STEPS.map(({ num, tint, title, chip, desc, photo, alt, badge, terminal }) => (
          <li key={num} className="sa-arch-step">
            <span className="sa-arch-chev-right"><ArrowRight /></span>

            <div className="sa-arch-conn">
              <CaretUp />
              <span className="sa-arch-rule" />
              <span className="sa-arch-chip">{chip}</span>
              <span className="sa-arch-rule" />
              <CaretDown />
            </div>

            <article className="sa-arch-card" data-terminal={terminal ? 'true' : 'false'} style={{ background: tint.bg }}>
              <div className="sa-arch-photo">
                <img src={photo} alt={alt} loading="lazy" decoding="async" />
                {badge && <span className="sa-arch-badge">{badge}</span>}
              </div>
              <div className="sa-arch-body">
                <span className="sa-arch-num" style={{ color: tint.ink }}>{num}</span>
                <h4 className="sa-arch-title">{title}</h4>
                <p className="sa-arch-desc">{desc}</p>
              </div>
            </article>

            <span className="sa-arch-chev-down"><ArrowDown /></span>
          </li>
        ))}
      </ol>

      {/* ── Legend ── */}
      <div className="sa-arch-legend">
        <span className="sa-arch-legend-item">
          <span style={{ color: FLOW_AMBER, display: 'inline-flex' }}>
            <SolidArrow w={34} h={16} box="0 0 34 16"
              points="1.5,6.2 18,6.2 18,2.4 32,8 18,13.6 18,9.8 1.5,9.8" outline={1.3} />
          </span>
          <span className="sa-only-wide">Response path, left to right</span>
          <span className="sa-only-narrow">Response path, top to bottom</span>
        </span>
        <span className="sa-arch-legend-item">
          <span style={{ color: FLOW_AMBER, display: 'inline-flex' }}>
            <Arrow w={26} h={16} box="0 0 26 16" paths={['M13 2.4v11.2', 'M10 5.4L13 2l3 3.4', 'M10 10.6L13 14l3-3.4']} weight={2} outline={1.4} />
          </span>
          Two-way coordination with the command centre at every step
        </span>
      </div>
    </div>
  )
}
