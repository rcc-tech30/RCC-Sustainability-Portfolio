# RCC Sustainability Portfolio - Design Rulebook

Shared design rules for `index.html`. This is the source of truth for layout,
typography, navigation, motion, and privacy decisions on the homepage. Keep it
in sync when the homepage changes.

## Voice and direction

- Founder-led sustainability portfolio, not a SaaS dashboard.
- Human, practical, premium but simple.
- Avoid AI-slop patterns: purple gradients, excessive equal cards, generic
  three-column feature grids, heavy animation.
- No em dashes in public copy.

## Colour

Defined once as CSS custom properties on `:root` in `index.html`.

- Forest `#0b3b31`, forest-deep `#072a24`, emerald `#278963`, mint `#dceee5`.
- Aurora accents (background only): blue `#5b8def`, mint `#69a781`,
  amber `#d49a35`. Amber is a restrained interaction accent only.
- Paper `#f7f8f5`, white `#ffffff`, ink `#17211e`, muted `#607069`,
  line `#d5ded8`.

The edge-aurora background stays pure CSS (`body::before` / `body::after`).
No JavaScript names or drives the aurora.

## Typography

- Sans only. Keep the existing RCC font stack
  (`Avenir, "Avenir Next", "Segoe UI", Arial, sans-serif`). Do not introduce a
  serif/editorial face.
- Proportional scale, largest to smallest, so Home reads as the lead and
  About as the quietest section:
  - Home heading (`h1`, "Hi, I'm Reiniel."): `clamp(40px, 6vw, 72px)`.
  - Portfolio section heading ("Featured work"): `clamp(32px, 4.5vw, 52px)`.
  - Project card titles: `clamp(32px, 4vw, 48px)`.
  - About heading: `clamp(28px, 4vw, 44px)`.
- Eyebrow labels and monospace tool/eyebrow labels stay small and uppercase.
- Justify the founder body on both desktop and mobile for a consistent block
  edge, but only while readability stays acceptable. Guard narrow-width spacing
  with `hyphens: auto`, `text-align-last: left`, a constrained `max-width`
  (~60ch), and comfortable `line-height` (1.7). If justification ever produces
  severe rivers/gaps at small widths, fall back to left alignment.

## Information architecture

Inside `<main>`, top to bottom: `#home` -> `#portfolio` -> `#about`, then the
footer. `#about` is the last main section and is not a second hero.

### Home (`#home`)

- Two-column layout on desktop: text on the left, founder photo on the right.
- DOM order is text first, photo second, so mobile stacks text above the photo.
- Leads with: eyebrow `Sustainability · Data · Automation`, heading
  `Hi, I'm Reiniel.`, the approved founder body paragraph, then the
  `View LinkedIn` and `Email me` calls to action.
- Remove dead top whitespace: the hero uses a compact top padding
  (`clamp(24px, 4vw, 56px)`), not the previous oversized clamp.
- Founder photo: `assets/founder-reiniel.jpg`, meaningful alt text, no inferred
  or precise location in copy, alt text, filename, caption, or metadata.

### Portfolio (`#portfolio`)

- Starts with a real enlarged section heading `Featured work`
  (`.portfolio-title`).
- Immediately followed by the smaller subheader
  `Work built to make complex information useful.` (`.portfolio-sub`).
- The three existing project cards follow, unchanged in content and links.

### About (`#about`)

- The three-card bento (regional emission-factor experience, location,
  tools) with its approved content and CSS-only interaction. Unchanged by
  layout refinements.

## Navigation

- One segmented control with exactly three anchor links, in order:
  `Home`, `Portfolio`, `About`.
- The segmented control lives in a sticky dock (`.nav-dock`,
  `position: sticky`) pinned top-centre while scrolling.
- At rest the nav pill visually anchors to the header divider line: it is
  pulled up (negative `margin-top`) so its centre straddles the 1px line under
  the brand, rather than floating in a dead gap below it. This makes the top of
  the page read as intentional.
- The brand/header area stays visually light (compact, muted wordmark, reduced
  header height) so it does not dominate the landing view.
- The brand wordmark `RCC Sustainability Portfolio` stays in the normal
  (non-sticky) header and is never part of the sticky nav.
- Anchored sections carry `scroll-margin-top` so headings are not hidden
  beneath the pinned nav.
- Baseline works with JavaScript disabled (anchor links + CSS smooth scroll).
  Progressive enhancement adds the sliding pill (`offsetLeft`/`offsetWidth`,
  `cubic-bezier(0.65, 0, 0.35, 1)` over `0.4s`) and an `IntersectionObserver`
  scrollspy. The pill is `aria-hidden`; active state is conveyed by
  `aria-current`.

## Motion and accessibility

- Respect `prefers-reduced-motion: reduce`: no aurora drift, no pill
  transition, no bento lift, scripted scroll uses `behavior: 'auto'`.
- Keyboard focus stays visible (`a:focus-visible` emerald outline).
- No horizontal overflow at any width; `body` keeps `overflow-x: hidden` and
  layouts collapse to a single column at `<= 820px`.

## Privacy and content constraints

- No precise location: do not display or encode Muntinlupa, an address,
  coordinates, live location, or image metadata. Location label is
  `Metro Manila, Philippines` only; the location visual is a decorative inline
  SVG, not a real map.
- No map APIs, iframes, geolocation, external map tiles, external scripts, or
  external stylesheets. The site is a single self-contained `index.html` plus
  same-origin static assets.
- Do not add Carbon Hoshi. Do not add n8n. Do not add NGER or imply NGA Factors
  are suitable for mandatory NGER reporting. Regional factor experience is
  stated as familiarity only, never assurance, certification, or regulatory
  advice.
- Company X and all figures remain fictional and illustrative.
