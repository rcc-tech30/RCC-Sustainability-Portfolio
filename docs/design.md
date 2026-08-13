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
- Justify the founder body on desktop for a clean block edge (guarded with
  `hyphens: auto`, `text-align-last: left`, ~60ch `max-width`, 1.7
  `line-height`). On mobile (`<= 820px`) revert the body to left alignment:
  at ~375px justification produced severe word gaps/rivers that hurt
  readability. Mobile readability wins over matching the desktop justification.

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

- The four-card bento uses an asymmetric editorial grid: dominant regional
  card, location card, full-width tools marquee card, and a smaller currently
  exploring card.
- The `Tools I currently use` card uses a pure-CSS horizontal marquee. Duplicate the tool list
  inside one animated track, animate `translateX(0)` to `translateX(-50%)`,
  run it at a calm 22s linear loop, pause on hover, mask the edges with a fade
  gradient, and disable the marquee under reduced motion and on mobile. Do not
  add a visible bottom scroll bar, progress indicator, or "and more" navigator.
- At mobile widths (`<= 820px`), the Tools card becomes a non-animated,
  two-column grid of six compact cards. The duplicate marquee set is hidden;
  each card uses centered logo and label content with no horizontal overflow.
- Tool cards should use same-file decorative, neutral outline SVG marks plus
  visible text labels. Keep the approved reference set: spreadsheet window,
  funnel, node flow, bar chart, assistant bubble, and sparkle. Do not regress
  to plain letter badges such as `X`, `PQ`, `PA`, `BI`, `◎`, or `*`, or to
  mismatched colored vendor-style approximations.
- The regional card states working experience, not weak familiarity. Country
  and factor sets are grouped as nested region cards: Australia contains
  `DCCEEW NGA`; United Kingdom contains `DEFRA / DESNZ`. The grouping must not
  read as four unrelated pills.
  - The regional card needs visible breathing room between the body paragraph
  and `Regions and factor sets`. Keep the factor layout gap generous and the
  subhead margins larger than ordinary paragraph spacing.
  Use a thin standalone separator line between the paragraph and
  `Regions and factor sets`. Do not put the line beside the label. The
  frameworks subsection is intentionally omitted until there is enough
  substantive content to justify another visual group.
- The regional document visuals should fill their side of the large card
  proportionally. Avoid short floating cards that leave a large unused bottom
  area; use taller document cards with enough internal stub rows to look
  intentional.
- At mobile widths, the regional document cards must leave absolute positioning
  and stack in normal flow with a fixed gap. No document card may overlap the
  paragraph, region cards, map, tools card, or footer.
  - The right column is intentionally uneven but compact: the `Based in` card
  remains slightly taller than `Currently exploring`, without leaving a large
  empty lower area in either card.
- The location card keeps a professional text-left / image-right composition
  on desktop: `Based in`, `Metro Manila, Philippines`, the approved supporting
  sentence, and the same-origin JPG map asset on the right.
  - Location supporting copy:
  `Open to working with Australia and UK-aligned reporting hours.`
- Location visual source: `assets/rcc-philippines-map.jpg`. Do not redraw it
  inline, trace it from a screenshot, replace it with a pin marker, or fetch an
  external map.

## Navigation

- One segmented control with exactly three anchor links, in order:
  `Home`, `Portfolio`, `About`.
- The segmented control lives in a sticky dock (`.nav-dock`,
  `position: sticky`) pinned top-centre while scrolling.
- On desktop, at rest the nav pill visually anchors to the header divider line:
  it is pulled up (negative `margin-top`) so its centre straddles the 1px line
  under the brand, rather than floating in a dead gap below it. This makes the
  top of the page read as intentional.
- On mobile (`<= 820px`) the nav pill is NOT forced onto the divider: the brand
  wordmark can wrap to two lines there, so straddling the line looks cramped and
  collides with the brand. Instead the pill sits cleanly below the divider with
  a positive `margin-top`, centred, so brand, divider, and nav read as
  deliberate.
- The divider belongs to the header, not the nav: it scrolls away with the
  header. When the nav sticks, it is a standalone pill (opaque background,
  border, shadow, own stacking context) with no horizontal rule attached to or
  travelling with it.
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
  `Metro Manila, Philippines` only; the location visual is the approved
  same-origin static JPG asset, not a live or precise map.
- No map APIs, iframes, geolocation, external map tiles, external scripts, or
  external stylesheets. The site is a single self-contained `index.html` plus
  same-origin static assets.
- Do not add Carbon Hoshi. `n8n` is allowed only inside the `Currently
  exploring` card and must be framed as learning in progress, not working
  expertise. Do not add NGER or imply NGA Factors are suitable for mandatory
  NGER reporting. Regional factor copy may say working experience, but must
  remain hands-on only and must never imply assurance, certification, or
  regulatory advice.
- Company X and all figures remain fictional and illustrative.
