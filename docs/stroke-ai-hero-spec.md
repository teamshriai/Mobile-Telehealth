# Hero Section — Build Spec

**Project:** Stroke-AI (working name — replace `<BRAND>` throughout)
**Reference:** `https://www.qure.ai/` — above-the-fold region only
**Scope:** Ticker bar → header → hero → trust strip. Nothing below the compliance badge row.
**Audience for this file:** Claude Code. Build exactly what's specified; ask before substituting.

---

## 0. How to read this file

- **Part 1** is the reference teardown. Layout, order and behaviour come from here — match it.
- **Part 2** is our own visual identity. Colour, type and copy come from here — do *not* copy qure.ai's palette, typeface or wording. Same skeleton, different skin.
- Every number in this file is a decision, not a suggestion. If a value is missing, it's listed in **Part 11** as an open question — ask rather than invent.
- Anything marked **[VERIFY]** is a legal/medical claim that must not ship until a human confirms it.

---

# PART 1 — Reference teardown

## 1.1 Verified element inventory

Pulled from the live DOM, top to bottom:

| # | Element | Contents on reference |
|---|---|---|
| 1 | Announcement ticker | 2 rotating linked items, each prefixed with a "NEW" badge |
| 2 | Sticky header | Wordmark (SVG) · nav: Products (dropdown), Impact, Evidence, Insights, Contact Us · CTA button · locale switcher with globe icon labelled "Global" |
| 3 | H1 | Three stacked lines: `World's` / `Most Adopted` / `Healthcare AI` |
| 4 | Primary CTA | Single button, "Contact Us" |
| 5 | Stat trio | `45M+` — Lives impacted to date · `105+` — Countries via 5500+ sites · `1B+` — Training datasets |
| 6 | Media | Looping `.mp4`, no controls (`Homepage_animation`) |
| 7 | Partner marquee | 16 logos, track duplicated ×6 in the DOM for a seamless infinite scroll |
| 8 | Compliance badges | CE · EU GDPR · HIPAA · FDA Cleared |

## 1.2 What actually makes it work

Four things carry the section. Preserve all four:

1. **A three-line headline set in a single weight and colour.** No highlighted word, no gradient text, no italic. The line breaks do the emphasis. This is why it reads institutional rather than startup-y.
2. **Proof sits immediately under the CTA, not further down the page.** Three numbers, above the fold, no scroll required. The section's entire argument is "this is already deployed at scale."
3. **One continuous motion element** (the looping animation) against otherwise static content. Motion is used once, for attention, not scattered across the section.
4. **Two separate trust layers.** Customer logos (social proof) and regulatory badges (institutional proof) are visually distinct rows doing different jobs. Don't merge them.

## 1.3 Composition

DOM order is: headline → CTA → stats → video → marquee → badges. The video sits in the flow *after* the stats, which on a wide viewport reads as a two-column split (copy left, media right) with the trust rows full-bleed beneath.

Build it as a **55 / 45 split**, copy left, media right:

```
┌──────────────────────────────────────────────────────────────┐
│  New · <ticker item, auto-rotating>                     ×    │  40px
├──────────────────────────────────────────────────────────────┤
│  <BRAND>    Products ▾  Evidence  Impact  Insights   ⌾ Global│  72px sticky
│                                          [ Book a demo ]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Every minute                    ┌──────────────────────┐   │
│   costs 1.9 million               │                      │   │
│   neurons                         │   looping perfusion  │   │
│                                   │   / vessel animation │   │
│   <subhead, ≤58ch, 2 lines>       │                      │   │
│                                   │   ┌────────────────┐ │   │
│   [ Book a demo ]                 │   │ 04:12 to needle│ │   │  overlay
│                                   │   └────────────────┘ │   │
│   ──────────┬──────────┬────────  │                      │   │
│    31 min   │  1,240   │   94%    └──────────────────────┘   │
│    faster   │  hospitals│  triage                            │
│    to needle│          │  accuracy                           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│   ‹ logo   logo   logo   logo   logo   logo   logo   logo ›  │  56px marquee
├──────────────────────────────────────────────────────────────┤
│   CE      MDR      HIPAA      ISO 13485                      │  32px badges
└──────────────────────────────────────────────────────────────┘
```

Copy column is **left-aligned throughout**. Do not centre the headline — centred hero copy is the generic default and it breaks the alignment relationship between the H1, the CTA and the stat rules.

---

# PART 2 — Our design system

## 2.1 Palette

Grounded in stroke imaging, not in generic health-tech teal. The base is the darkened reading room a neuroradiologist actually works in; the accents come from CT perfusion colour maps, where clinicians read infarct core against salvageable penumbra.

```css
:root {
  --ink:        #0A1520;  /* base — reading-room dark, blue-shifted not neutral */
  --slate:      #16242F;  /* raised surfaces, media panel frame, ticker bar */
  --hairline:   #24343F;  /* 1px rules, dividers, borders */
  --bone:       #E9EEF2;  /* primary text — bone-window white, never pure #FFF */
  --bone-dim:   #8CA0AF;  /* subhead, stat labels, nav rest state */
  --core:       #FF4D6D;  /* infarct core — the single hot accent. Time-critical only. */
  --penumbra:   #5FE0BE;  /* salvageable tissue — success, live/active states */
}
```

**Rules for `--core`:** it appears at most **twice** in the whole section — the CTA fill and the clock overlay on the media panel. Nowhere else. It is the colour of tissue you're about to lose, so it only ever marks urgency or the one action we want taken.

**Rules for `--penumbra`:** the ticker's live dot and the media panel's "processing" indicator. Never used for body text.

Never introduce a gradient wash as decoration. The only gradients permitted are the marquee's edge mask and the media panel's bottom scrim.

## 2.2 Type

**One family: Archivo (variable).** Load weights 400–700 and use the width axis for display sizes. It's engineered and slightly condensed at large sizes, which holds a long headline tightly without looking like a marketing font.

```
Display  Archivo Expanded 600
Body/UI  Archivo 400 / 500
Numerals font-variant-numeric: tabular-nums  ← mandatory on stats and clock
```

Tabular figures are not optional. The clock overlay counts and the digits must not shift width.

| Role | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| H1 | `clamp(2.75rem, 7.2vw, 6.5rem)` | 0.94 | −0.03em | 600 |
| Subhead | 1.125rem / 18px | 1.55 | −0.005em | 400 |
| Stat number | `clamp(2rem, 3.4vw, 3.25rem)` | 1 | −0.02em | 600 |
| Stat label | 0.8125rem / 13px | 1.35 | 0 | 400 |
| Nav / button | 0.9375rem / 15px | 1 | −0.005em | 500 |
| Ticker | 0.8125rem / 13px | 1 | 0 | 500 |

**Typographic prohibitions** (each one is a tell — treat as hard constraints):
- No ALL-CAPS labels anywhere. Sentence case only, including the ticker badge: "New", not "NEW".
- No single word in the H1 coloured, italicised or weighted differently from the rest.
- No eyebrow label above the H1.
- No `→` appended to button or link text.
- No monospace face for the stat labels or the clock.

## 2.3 Layout & spacing

- Canvas reference 1440px. Content max-width **1280px**, centred, **80px** side padding (desktop).
- 12-column grid, 24px gutters. Copy column spans 1–7, media panel spans 8–12.
- Spacing scale, 4px base: `4 8 12 16 24 32 48 64 96 128`.
- Radii: **0** on the media panel and stat rules; **999px** on the CTA and ticker badge; **8px** on the clock overlay chip. Three distinct radii, each assigned by function — do not unify them.
- Hero block min-height: `calc(100svh - 112px)`, with a 96px top offset below the header and 64px bottom padding before the marquee.

---

# PART 3 — Component specs

## 3.1 Announcement ticker

- 40px tall, full-bleed, `--slate` background, 1px bottom border in `--hairline`.
- Content: `[Live dot] [New] <headline text> ` — whole row is one link. Dot is 6px, `--penumbra`, with a 2s pulse (opacity 1 → 0.35 → 1).
- Holds ≥2 items, cross-fades every **6s**: outgoing `opacity 1→0` over 240ms, incoming `opacity 0→1` + `translateY(4px→0)` over 320ms, 80ms overlap.
- Pauses on hover and on keyboard focus.
- Dismiss `×` at the right edge. Persist dismissal in a cookie for 7 days — **not** `localStorage`, so SSR doesn't flash.
- Collapses to a single non-rotating item under 640px; truncate with ellipsis at one line.

## 3.2 Header

- 72px tall, `position: sticky; top: 0`, transparent over the hero at scroll 0.
- Past 24px scroll: height → 64px, background → `--ink` at 82% with `backdrop-filter: blur(16px)`, bottom hairline appears. Transition 240ms ease-out on height, background and border together.
- Nav rest `--bone-dim`, hover/focus `--bone`, 160ms. Active page carries a 1px underline in `--core` at 2px offset.
- "Products ▾" opens a panel on hover **and** on click/Enter. Panel: `--slate` background, 1px `--hairline` border, 24px padding, two columns of product links. Escape closes and returns focus to the trigger. 8px hover-out grace period so the pointer can travel to the panel.
- Locale switcher: 16px globe glyph + label, right of the CTA, `--bone-dim`.
- Under 1024px: nav collapses to a hamburger, full-screen overlay panel, CTA stays visible in the bar.

## 3.3 Headline

Three lines, hard-broken with explicit spans — not left to natural wrapping:

```
Every minute
costs 1.9 million
neurons
```

- Each line is its own block-level `<span>` inside the `<h1>` so the mask reveal can stagger them.
- Wrapper needs `overflow: hidden` per line for the clip reveal.
- Below 640px, allow the middle line to wrap naturally to two lines rather than shrinking the type further.
- **[VERIFY]** the 1.9 million figure and its source before this ships. Cite it in the subhead or drop the number and use a non-quantified line.

## 3.4 Subhead

- Max-width **58ch**. One or two lines. 24px below the H1.
- `--bone-dim`. Sits between headline and CTA — do not move it below the CTA.

## 3.5 Primary CTA

- Single button. Height 52px, horizontal padding 28px, `999px` radius, `--core` fill, `--ink` text, weight 500.
- Hover: brightness 1.08 + `translateY(-1px)`, 160ms. Active: `translateY(0)` + brightness 0.96.
- Focus-visible: 2px `--bone` outline at 3px offset. Must be clearly visible against both the fill and the dark background.
- Label states what happens: "Book a demo". Not "Learn more", not "Get started", no arrow glyph.
- One CTA only. A secondary ghost button here dilutes the section — if a second action is needed, ask first.

## 3.6 Stat trio

- Horizontal row, 48px below the CTA. `display: grid; grid-template-columns: repeat(3, minmax(0,1fr));`
- Number in `--bone`, label in `--bone-dim` beneath it, 8px gap. Label max-width **18ch**, 2 lines max.
- Separated by 1px vertical rules in `--hairline`, 48px tall, vertically centred. The rules encode that these three numbers are one grouped claim — keep them.
- Tabular numerals. No count-up animation by default: three numbers ticking on load pulls attention away from the media panel, which is the section's one intentional motion moment. If a count-up is wanted later, apply it to the time-based stat only.
- Under 768px: 2-up grid (third stat wraps), vertical rules swap to a single horizontal hairline above the row.

## 3.7 Media panel — the section's focal element

This is where the design spends its boldness. Everything else in the hero stays quiet so this reads as the subject of the page.

- Aspect ratio **4:5** on desktop (portrait — matches how axial CT stacks are actually viewed), 16:10 on mobile. Fills grid columns 8–12.
- Content: looping animation of a stroke case progressing — non-contrast CT → vessel occlusion highlighted → perfusion overlay separating core from penumbra. Muted palette, with `--core` and `--penumbra` doing the overlay work.
- Implementation: `<video autoplay muted loop playsinline preload="metadata">` with a `poster` frame. Provide **both** `.webm` (VP9) and `.mp4` (H.264) sources, webm first.
- 1px `--hairline` border, 0 radius, no drop shadow. A shadow would make it a card; it should read as a viewport.
- Bottom scrim: `linear-gradient(to top, var(--ink) 0%, transparent 40%)` so the overlay chip stays legible over any frame.
- **Clock overlay chip:** bottom-left, 20px inset. 8px radius, `--ink` at 88% + 8px blur, 1px `--hairline`. Contains a monotonic `mm:ss` counter in `--core` with tabular figures, plus a 13px `--bone-dim` label reading "to needle". Counter runs 00:00 → 04:12 over the video loop and resets with it. This is the "time is brain" idea made literal, and it's the one thing on the page that moves for its own sake.
- **Reduced motion:** video is replaced by the poster image, clock renders its final static value. Do not autoplay anything.
- **[VERIFY]** if any frame shows real patient imaging, confirm de-identification and usage rights. Use synthetic or licensed phantom data if there's any doubt.

## 3.8 Partner logo marquee

- 56px row, full-bleed, 64px above and below.
- Logos: max-height 28px, width auto, `--bone-dim` at 55% opacity, `filter: grayscale(1)`. On hover of an individual logo: opacity 1, grayscale 0, 200ms.
- 64px gap between logos. Track duplicated **×2** (the reference duplicates ×6, which is wasteful) and translated `-50%` over **40s linear infinite**. Duplicate must be `aria-hidden="true"`.
- Edge fade via `mask-image: linear-gradient(to right, transparent, black 120px, black calc(100% - 120px), transparent)`.
- Pauses on hover and on focus-within. `prefers-reduced-motion` → static, horizontally scrollable row with visible scrollbar.
- **[VERIFY]** every logo needs written permission from that organisation before it goes live. Named hospital and OEM logos on a medical-device page imply endorsement.

## 3.9 Compliance badges

- Single row, left-aligned with the content grid, 32px badge height, 32px gap, 48px below the marquee.
- Each badge is an SVG at 100% opacity — these are regulatory marks and must not be dimmed, recoloured or greyscaled.
- Each has a descriptive `alt` and links to the relevant page (regulatory statement, privacy notice).
- **[VERIFY] — highest priority in this file.** Ship only marks actually held. If the product has CE marking under MDR, say so precisely; if it doesn't, remove the badge. Do not display an FDA mark, a class, or a clearance number that hasn't been granted. Placeholder regulatory badges are a real liability, not a design detail.

---

# PART 4 — Motion

One orchestrated page-load sequence. No scroll-triggered reveals on this section, no hover lift on the stat cells.

| t (ms) | Element | Transform | Duration | Easing |
|---|---|---|---|---|
| 0 | Media panel | `opacity 0→1`, `scale 1.04→1` | 900 | `cubic-bezier(.16,1,.3,1)` |
| 120 | H1 line 1 | `translateY(100%→0)` inside clip | 700 | `cubic-bezier(.16,1,.3,1)` |
| 200 | H1 line 2 | same | 700 | same |
| 280 | H1 line 3 | same | 700 | same |
| 460 | Subhead | `opacity 0→1` | 500 | ease-out |
| 560 | CTA | `opacity 0→1`, `translateY(8px→0)` | 400 | ease-out |
| 640 | Stat rules | `scaleY(0→1)` from centre | 500 | ease-out |
| 680 | Stat content | `opacity 0→1` | 400 | ease-out |
| 900 | Marquee | begins scrolling | — | linear |

- Total sequence under 1.4s. Nothing waits on the video to load — the poster carries the first frame.
- `@media (prefers-reduced-motion: reduce)`: all of the above resolve instantly to final state. Ticker stops rotating, marquee stops scrolling, video is swapped for the poster, clock is static.
- Animate `transform` and `opacity` only. No `height`, `top` or `width` transitions in this section.

---

# PART 5 — Responsive

| Breakpoint | Layout |
|---|---|
| ≥1280px | Two-column 55/45 as wireframed. 80px page padding. |
| 1024–1279px | Same split, page padding 48px, H1 clamps down, media panel 4:5 held. |
| 768–1023px | Single column. Copy block first, media panel below at 16:10 full-width. Nav → hamburger. Stats stay 3-up. |
| 640–767px | Stats → 2-up with the third wrapping. Page padding 24px. Media panel 16:10. |
| <640px | Page padding 20px. H1 at floor size, middle line may wrap. Ticker single static item. Marquee 40px row, logos 22px. Badges wrap to two rows. |

Use `100svh` not `100vh` for the hero min-height — `vh` breaks under mobile Safari's collapsing toolbar.

---

# PART 6 — Asset checklist

Build with these placeholders present; flag any that are missing rather than substituting stock imagery.

| Asset | Format | Spec | Notes |
|---|---|---|---|
| Wordmark | SVG | ~140×28 | Needs a light-on-dark variant |
| Hero animation | WebM + MP4 | 1200×1500, 8–12s loop, ≤2.5MB total | Muted, no audio track |
| Poster frame | WebP + AVIF | 1200×1500 | Must be a real frame from the loop |
| Partner logos | SVG | Uniform 28px optical height | Not raster — greyscale filter on PNG looks muddy |
| Compliance badges | SVG | 32px height | Official artwork only |
| Globe icon | SVG | 16×16 | 1.5px stroke |
| OG image | PNG | 1200×630 | Not part of the hero, but generate alongside |

Optical height matters more than bounding-box height for the logos: a wordmark and a circular mark at the same pixel height look different sizes. Normalise by eye, per logo.

---

# PART 7 — Accessibility & performance

**Non-negotiable:**
- One `<h1>` on the page, and it's the hero headline. Ticker and nav use no headings.
- Contrast: `--bone` on `--ink` ≈ 15:1. `--bone-dim` on `--ink` ≈ 6.2:1 — passes AA for the 13px stat labels. `--ink` on `--core` ≈ 6.4:1 for the CTA. Verify each with a checker after any colour tweak; do not lighten `--bone-dim` further without re-testing.
- Visible focus ring on every interactive element: ticker link, dismiss button, all nav items, dropdown trigger and its children, CTA, locale switcher, each logo link, each badge link.
- Tab order follows visual order. The duplicated marquee track is `aria-hidden`.
- Video carries `aria-label` describing what it shows; the clock chip is decorative and `aria-hidden`, since the same claim appears in the stat row.
- The dropdown is a real disclosure: `aria-expanded`, `aria-controls`, Escape to close, focus returns to trigger.

**Budget:**
- LCP element is the H1 or the poster image — inline critical CSS for both, `fetchpriority="high"` on the poster.
- Self-host Archivo as WOFF2, `font-display: swap`, preload the two weights actually used. No Google Fonts CDN request.
- Video `preload="metadata"` only. Never `preload="auto"` on a hero.
- Target LCP <2.0s on a throttled 4G profile, CLS <0.02. The ticker is the CLS risk — reserve its 40px whether or not it's dismissed.

---

# PART 8 — Stack & file structure

Default assumption — **Next.js App Router + TypeScript + Tailwind v4 + Framer Motion**. If the repo already uses something else, follow the repo and say what you changed.

```
src/
  app/
    page.tsx                  # composes the four blocks, nothing else
    globals.css               # tokens as CSS vars, @theme mapping, font-face
  components/hero/
    AnnouncementTicker.tsx
    SiteHeader.tsx
    ProductsMenu.tsx
    HeroBlock.tsx             # headline + subhead + CTA + stats
    HeroMedia.tsx             # video + poster + clock overlay
    StatRow.tsx
    LogoMarquee.tsx
    ComplianceRow.tsx
  content/
    hero.ts                   # all copy + stats as typed data, no strings in JSX
public/
  media/ hero-loop.webm  hero-loop.mp4  hero-poster.webp
  logos/ *.svg
  badges/ *.svg
```

- Every string and number lives in `content/hero.ts`. No copy hardcoded in components — the stats and badges will change and shouldn't require touching JSX.
- Tokens as CSS custom properties in `globals.css`, surfaced to Tailwind via `@theme`. Don't hardcode hex values in class names.
- Server components by default. `AnnouncementTicker`, `ProductsMenu` and `HeroMedia` need `"use client"`; the rest should not.
- No `localStorage` or `sessionStorage`. Ticker dismissal uses a cookie.
- Watch selector specificity between the section wrapper and the block components — the reference's vertical rhythm is easy to break with competing padding rules on `.section` vs. the child blocks.

---

# PART 9 — Copy deck

All placeholder. Every claim needs sign-off.

**Ticker**
1. New · Multi-site validation results now published
2. New · <BRAND> joins the <network name> stroke network

**H1** — `Every minute / costs 1.9 million / neurons` **[VERIFY]**

**Subhead** — "<BRAND> reads non-contrast CT, flags large vessel occlusion and alerts your whole stroke team from one scan — while the patient is still on the table."

**CTA** — "Book a demo"

**Stats** *(all placeholder — replace with figures from your own validation data, each with a citable source)* **[VERIFY]**

| Number | Label |
|---|---|
| 31 min | faster to needle |
| 1,240 | hospitals connected |
| 94% | LVO triage accuracy |

**Nav** — Products ▾ · Evidence · Impact · Insights · Contact

Copy rules: sentence case throughout. Active voice. Say what the product does in words a stroke coordinator would use, not "AI-powered care orchestration platform." A number with no source is worse than no number — on a clinical page it invites exactly the scrutiny you don't want.

---

# PART 10 — Acceptance checklist

Verify each before calling it done. Screenshot at 1440, 1024, 768 and 390 and review them.

- [ ] Four blocks present in order: ticker, header, hero, trust rows. Nothing below the badges.
- [ ] H1 breaks into exactly three lines at ≥1024px, left-aligned, one weight, one colour.
- [ ] `--core` appears in exactly two places: CTA fill and clock counter.
- [ ] No ALL-CAPS text, no eyebrow label, no arrow glyph in any button, no highlighted word in the H1.
- [ ] Stat numbers and the clock use tabular figures; digits don't shift width as the clock runs.
- [ ] Marquee loops seamlessly with no visible seam or jump; duplicate track is `aria-hidden`.
- [ ] Marquee and ticker both pause on hover and on focus.
- [ ] Load sequence completes under 1.4s and fires once, not on scroll.
- [ ] With `prefers-reduced-motion: reduce`: nothing moves, video replaced by poster, all content at final state.
- [ ] Full keyboard pass with a visible ring on every interactive element; dropdown closes on Escape and restores focus.
- [ ] Hero occupies roughly one viewport at 1440×900 without the marquee being cut off mid-row.
- [ ] No `100vh`, no browser storage, no hardcoded hex outside the token block.
- [ ] Every **[VERIFY]** item is either confirmed by a human or visibly marked as placeholder in the UI.

---

# PART 11 — Open questions

Ask before guessing on any of these:

1. **Framework and styling** — is there an existing repo, and does it already use Tailwind? Part 8 is an assumption.
2. **Brand name and wordmark** — `<BRAND>` is used throughout; is there existing identity work, or should the palette and type in Part 2 be treated as a proposal?
3. **The hero animation is the whole design.** Does the perfusion/occlusion loop exist, is it commissionable, or does this need a fallback treatment (static imaging still, or a coded SVG/canvas animation)? If the loop can't be produced, the composition needs rethinking rather than a stock-video substitute.
4. **Real stats.** Which three numbers do you actually have validated data for? The stat trio should reflect your strongest evidence, not the reference's categories.
5. **Regulatory status** — what marks does the product actually hold, in which markets? If none yet, the badge row comes out and the marquee moves up.
6. **Nav destinations** — are Evidence / Impact / Insights real routes, and what's in the Products dropdown?
7. **Locale switcher** — is the site multi-region, or should the globe come out?
