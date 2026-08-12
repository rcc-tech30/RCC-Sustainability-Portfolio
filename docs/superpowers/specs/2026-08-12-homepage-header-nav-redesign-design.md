# Homepage / Header / Nav Redesign - Design Specification

## Purpose

Improve the RCC Sustainability Portfolio homepage so it reads as a polished,
human, founder-led portfolio, without drifting into generic SaaS-dashboard
styling. The page presents a single-scroll sequence `Home -> Portfolio ->
About`, driven by a segmented navigation control. This pass covers the
hero/header, the founder introduction, the segmented nav, and a bottom-of-page
About section containing an editorial three-card bento. It does not restyle the
existing project cards, and it does not change deployment.

## Design direction

- Portfolio site, not a SaaS dashboard.
- Human, sustainability-focused, practical, founder-led.
- Premium but simple.
- Avoid AI-slop patterns: purple gradients, excessive cards, generic
  three-column feature grids, heavy animation, em dashes in copy.
- Keep mobile readable and fast. No new dependencies, no build step.

The existing forest/emerald/mint palette and the approved edge-aurora background
are kept as-is. This redesign layers structure, a founder introduction, a
navigation control, and an About bento on top of that visual language rather
than replacing it. Amber (`--aurora-amber`) may appear only as a restrained
interaction accent, and only where contrast and cohesion are verified.

## Page information architecture

Top to bottom, inside `<main>`:

1. `#home` - top hero plus the founder introduction (headline, founder photo,
   approved intro copy, two calls to action). The nav "Home" control targets
   this area.
2. `#portfolio` - the existing three portfolio projects, unchanged in content.
   The nav "Portfolio" control targets this section.
3. `#about` - the bottom-most main section, containing the complete three-card
   bento. The nav "About" control targets this section.

No additional main section appears after `#about`; only the existing footer
follows it. The About section is a distinct bottom-of-page About section. It is
not a "third hero" and must not be styled or described as one.

## Founder introduction (in `#home`)

The founder introduction is the primary intro block. The existing hero headline
`Work built to make complex information useful.` is retained (it is protected by
the homepage test). The previous hero-copy paragraph (`I'm Reiniel Celgie
Chan...`) is not test-protected and is replaced by this block.

Approved copy (owner-approved, reproduce exactly, no em dashes):

- Heading (a subheading below the hero headline): `Hi, I'm Reiniel.`
- Body (one paragraph): `I'm a carbon analyst specializing in greenhouse gas
  accounting across Scope 1, Scope 2, and Scope 3. I work across the end-to-end
  process, from mapping business activities and identifying applicable emission
  sources to building dashboards and translating results into practical
  insights. My work helps teams assess decarbonization opportunities and
  understand their potential financial, energy, and emissions impacts.`

Calls to action (two explicit, accessible links; the whole section is NOT one
big link):

- `View LinkedIn` -> `https://www.linkedin.com/in/reiniel-celgie-chan-0a122428b/`
  opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.
- `Email me` -> `mailto:reinielcelgiechan@gmail.com`.

Founder photo:

- Owner-supplied photo, used during later implementation. Do not generate,
  replace, or modify it during planning.
- Asset path: `assets/founder-reiniel.jpg`.
- Alt text (meaningful, concise, from visible context only, no inferred
  location): `Reiniel Celgie Chan standing on a forest trail beside a distance
  marker post.`
- Privacy boundary: do not expose or infer a precise location from the
  photograph in copy, alt text, filename, caption, or metadata.
- The photo is a portrait-orientation image; the block is a two-column
  photo/text layout on wide viewports and stacks to one column on mobile with
  the photo first in DOM order.

Justified text: apply `text-align: justify` with hyphenation only to the founder
body paragraph on wide viewports; revert to left-aligned below the tablet
breakpoint (`max-width: 820px`) to avoid rivers and awkward word spacing. Short
copy (hero headline, subheading, labels, CTAs) stays left-aligned.

Positioning: keep the framing balanced for both employers and consulting
clients. Do not mention Carbon Hoshi. Do not claim established
workflow-automation expertise.

## Segmented navigation

A single segmented control in the header with exactly three controls, in order:
`Home`, `Portfolio`, `About`.

Baseline (works with JavaScript disabled):

- The three controls are semantic anchor links (`<a href="#home">`,
  `<a href="#portfolio">`, `<a href="#about">`). Clicking navigates to the
  target section with no JavaScript.
- Smooth scrolling is provided by the existing CSS `html { scroll-behavior:
  smooth; }`, which already reverts to `auto` under reduced motion. No
  JavaScript is required for basic navigation or smooth scrolling.

Progressive enhancement (JavaScript present):

- A sliding active "pill" sits behind the active label. On activation and on
  load, script reads the active control's `offsetLeft` and `offsetWidth` and
  sets the pill's `left` and `width`. The pill transitions `left` and `width`
  with `cubic-bezier(0.65, 0, 0.35, 1)` over `0.4s`. The active label color
  crossfades (a `color` transition, not an abrupt swap).
- The pill is recomputed on window `resize` and after `document.fonts.ready`
  (with a `load` fallback) so it never drifts.
- Active-state rule (not ambiguous): the active state updates on activation AND
  follows scroll position. A single `IntersectionObserver` watches `#home`,
  `#portfolio`, and `#about`; the control for the section currently in view
  becomes active (`aria-current="true"`) and the pill animates to it. This makes
  the pill reflect what the reader is viewing during scroll, not only clicks.

Why JavaScript is needed for the pill: a sliding pill that measures each
control's pixel geometry (`offsetLeft`/`offsetWidth`) and a scrollspy that reads
which section is on screen cannot be done in HTML/CSS alone. Pure CSS can show
an active state via `:target`, but `:target` only reflects the last clicked
anchor (not scroll position) and cannot animate a shared pill between differing
control widths. Therefore:

- Without JavaScript: anchor links navigate, smooth scroll works, focus is
  visible, and a CSS `:target`-based highlight shows the clicked control as
  active. The animated pill and scrollspy are simply absent, with no loss of
  navigation.
- The pill element is inert decoration (`aria-hidden="true"`); assistive tech
  relies on `aria-current` on the active control, not the pill.

Accessibility and motion for the nav:

- Keyboard focus stays visible, consistent with the existing `a:focus-visible`
  outline.
- On mobile the segmented control wraps or drops below the brand and must not
  cause horizontal overflow.
- Under `prefers-reduced-motion: reduce`: the pill snaps (no transition), the
  label crossfade is removed, scripted scrolling passes `behavior: 'auto'`, and
  CSS `scroll-behavior` is already `auto` via the existing reduced-motion block.

## About bento (in `#about`)

An editorial three-card bento, adapted to the forest/emerald/mint language.
Uneven grid, not three equal dashboard cards: one visually dominant tall cell
and two supporting cells.

Visual hierarchy decision (encoded, not left open): Card 1 (Regional
emission-factor experience) is the dominant cell. Rationale: regional factor
experience is the most professionally relevant signal to employers and
consulting clients, so it earns the largest, tallest cell.

Desktop layout (>= 821px):

- Two-column grid: `grid-template-columns: 1.1fr 0.9fr;` with two rows.
- Card 1 occupies the left column and spans both rows (the tall hero cell).
- Card 2 occupies the right column, top row.
- Card 3 occupies the right column, bottom row.
- Spacing deliberate and compact (gap around `18px`), no crowding.

Mobile layout (<= 820px):

- Single column, one card per row, full width.
- Reading order: Card 1, then Card 2, then Card 3.

DOM order is always Card 1 -> Card 2 -> Card 3, matching the mobile reading
order and the keyboard tab order, regardless of desktop grid placement (grid
placement is visual only via `grid-column` / `grid-row`).

Card eyebrow labels and the tool labels use a monospaced face
(`ui-monospace, monospace`, consistent with the existing `.project-number`).

### Card 1 - Regional emission-factor experience (dominant)

- Content: working experience / familiarity with regional emission factors.
  - Australia: DCCEEW National Greenhouse Accounts (NGA) Factors.
  - UK: DESNZ greenhouse gas reporting conversion factors.
- Wording presents familiarity or working experience only. It must not imply
  assurance, certification, regulatory advice, guaranteed compliance, or that
  NGA Factors are suitable for mandatory NGER reporting.
- No hard-coded publication year. (No maintainable year-update strategy is being
  built, so the copy names the factor sets without a year, e.g. "Familiar with
  applying Australia's DCCEEW NGA Factors and the UK's DESNZ conversion factors
  for greenhouse gas reporting.")

### Card 2 - Location

- Visible public label: `Metro Manila, Philippines`.
- A broad, privacy-preserving visual centered generally around southern Metro
  Manila, rendered as a self-contained static CSS/SVG illustration with an
  oversized illustrated avatar/head marker over the area.
- The SVG is decorative and labelled as such: `role="img"` with an accessible
  name like `Illustrated marker over Metro Manila` (or `aria-hidden="true"` if
  the visible label already conveys the meaning). It must not pretend to be a
  geographically precise map.
- Must not display or encode Muntinlupa, an address, coordinates, live location,
  precise location, or image metadata. No map API, tracking, credentials,
  iframe, remote tiles, or external map service. Inline SVG only.

### Card 3 - Tools I use

- Exactly these six, each with a visible text label (logos/icons must never be
  the only identification, and no external icon requests or packages):
  Excel, Power Query, Power Automate, Power BI, ChatGPT, Claude.
- Do not include n8n. Do not claim automation as an established specialization.

### Bento interaction (CSS only, no JavaScript)

Resting state: every card is fully readable and understandable with no hover
required. Cards carry a subtle border and shadow in the resting state and do not
look clickable unless they contain a real link (these cards have no card-level
destination, so the cursor stays default and the lift is presentational only).

Hover and keyboard focus (concrete values, not "spring"):

- Target card on `:hover`, `:focus-visible`, or `:focus-within`:
  `transform: translateY(-4px) scale(1.015);`
  `transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 200ms
  ease, border-color 200ms ease;` optional restrained amber accent on the border
  and eyebrow label, applied only if contrast is verified.
- Sibling dimming is progressive enhancement via `:has()`: when the bento
  container matches `:has(> .bento-card:hover, > .bento-card:focus-within)`, the
  non-targeted siblings drop to `opacity: 0.88` with `transition: opacity 200ms
  ease` and NO scale-down. Dimming stays subtle and must retain accessible text
  contrast. Sibling opacity must never go to `0.45`, and siblings must not
  shrink aggressively.
- Without `:has()` support: siblings never dim; each card still lifts
  independently on hover/focus. Layout and content remain correct.
- Touch users get the full experience without hover: the resting state is
  complete, and `:focus-within` covers tap focus.
- Transforms must not clip content, overlap neighbors, cause horizontal
  overflow, or destabilize layout. Reserve space (padding / `will-change:
  transform` optional) so the 4px lift and 1.5% scale never spill outside the
  section.
- Under `prefers-reduced-motion: reduce`: remove lift, scale, and sibling-
  opacity transitions; keep only a static border-color/background change on
  hover/focus.
- No JavaScript is added for bento hover behavior.

## Constraints inherited from the repo

- Single self-contained `index.html`; all CSS stays inline in the existing
  `<style>` block; the only new JavaScript is one inline `<script>` at the end
  of `<body>` for the nav pill and scrollspy (never for the bento).
- No external requests, no frameworks, no package manager, no new packages.
- The founder photo `assets/founder-reiniel.jpg` is a same-origin static asset
  (the only new asset); it is not an external request.
- Preserve all existing content strings and destinations the homepage test
  asserts (headline `Work built to make complex information useful.`, the three
  project titles, the three dashboard hrefs, the LinkedIn href).
- Preserve the approved aurora background and its tested fragments; the aurora
  stays pure CSS.
- Company X and all figures remain fictional and illustrative; no new claims.

## Owner-approved decisions vs remaining implementation judgments

Owner-approved (do not change without owner sign-off):

- The `Home -> Portfolio -> About` order and About as the bottom-most section.
- Founder heading, body, and both CTA labels/destinations (verbatim).
- Use of the owner-supplied photo.
- The three bento cards' exact contents and prohibitions (no Carbon Hoshi, no
  n8n, exact six-tool list, `Metro Manila, Philippines` label, no precise
  location, no map API/external requests).
- Nav order Home/Portfolio/About and the CTA-in-new-tab requirement.

Remaining implementation judgments (this spec's calls, adjustable):

- Photo asset path/filename `assets/founder-reiniel.jpg` and the alt-text
  wording above (from visible context only).
- Card 1 as the dominant cell and the `1.1fr 0.9fr` grid.
- Concrete motion values (`translateY(-4px) scale(1.015)`, `200ms`, easing,
  sibling `opacity: 0.88`).
- Active-state rule (activation plus scrollspy) and the `:target` no-JS
  fallback.
- The specific SVG marker composition for Card 2.

## Testable outcomes

- `#home`, `#portfolio`, and `#about` exist; `#about` is the last main section
  before the footer; DOM order of the three matches Home/Portfolio/About.
- Founder heading `Hi, I'm Reiniel.` and the exact founder body are present.
- Founder photo references `assets/founder-reiniel.jpg` with meaningful alt text
  and no precise-location text.
- `View LinkedIn` links to the exact LinkedIn URL with `rel="noopener
  noreferrer"` and opens a new tab; `Email me` links to the exact mailto.
- No occurrence of `Carbon Hoshi`; no occurrence of `n8n`; no `Muntinlupa`, no
  coordinates, no map-API/iframe/remote-tile/tracking references.
- The six tools appear exactly, each as visible text.
- Card 1 copy avoids assurance/certification/NGER-suitability wording and hard-
  coded years.
- The nav pill transition declares `cubic-bezier(0.65, 0, 0.35, 1)` near `0.4s`;
  reduced-motion handling for the pill and scripted scroll is present.
- The bento desktop grid is uneven (`1.1fr 0.9fr`, Card 1 spanning both rows);
  mobile collapses to a single column; no horizontal overflow at narrow widths.
- Bento hover/focus lift has touch, reduced-motion, and no-`:has()` fallbacks
  and adds no JavaScript.
- Basic navigation and smooth scroll work with JavaScript unavailable.
- All previously required content fragments still pass; the aurora remains pure
  CSS.
