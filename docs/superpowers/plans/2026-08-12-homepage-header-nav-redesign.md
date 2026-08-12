# Homepage / Header / Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not change deployment settings.

**Goal:** Rebuild the homepage as a single-scroll `Home -> Portfolio -> About` sequence with a founder introduction, a segmented nav (anchor baseline plus an enhanced sliding pill and scrollspy), and a bottom-of-page editorial three-card About bento, on the existing zero-dependency static site.

**Architecture:** One self-contained `index.html`. All CSS stays inline in the existing `<style>`. Navigation works with plain anchor links and CSS `scroll-behavior`; a single inline `<script>` at end of `<body>` adds the animated pill and an `IntersectionObserver` scrollspy as progressive enhancement. The bento is pure CSS (grid + `:has()` + `prefers-reduced-motion`), no JavaScript. One new same-origin asset: the founder photo.

**Tech Stack:** Static HTML5, inline CSS, a small amount of vanilla JS (nav only), Node `node:test` for HTML assertions, GitHub Pages.

**Design record:** `docs/superpowers/specs/2026-08-12-homepage-header-nav-redesign-design.md`

## Global Constraints

- Edit only `index.html`, `tests/portfolio-homepage.test.mjs`, and add `assets/founder-reiniel.jpg`. No new packages, frameworks, or build step.
- Keep all CSS inline in the existing `<style>`; only one new inline `<script>` at end of `<body>`, for the nav pill and scrollspy only.
- Page order inside `<main>`: `#home` -> `#portfolio` -> `#about`; `#about` is the last main section before `<footer>`. Do not style About as a hero.
- Preserve tested fragments: `Work built to make complex information useful.`, the three project titles, the three dashboard hrefs, the LinkedIn href, and the aurora fragments.
- Founder copy verbatim; no em dashes in public copy; no `Carbon Hoshi`; no `n8n`; no claim of established workflow-automation expertise.
- Card 3 tools are exactly: Excel, Power Query, Power Automate, Power BI, ChatGPT, Claude.
- Card 2 public label exactly `Metro Manila, Philippines`; no `Muntinlupa`, address, coordinates, precise/live location, or image metadata; no map API, iframe, remote tiles, tracking, or external map service.
- Reduced motion, visible keyboard focus, no horizontal overflow at narrow widths, and GitHub Pages compatibility (works from `file://`, no external requests) are required throughout.

---

### Task 1: Retarget the homepage test to the new intent (red first)

**Files:**
- Modify: `tests/portfolio-homepage.test.mjs`

**Interfaces:**
- Consumes: the raw `index.html` string already loaded at the top of the test.
- Produces: helpers `requireFragments(list)`, `refuseFragments(list)`, and `requireOrder(list)` used by later verification.

- [ ] **Step 1: Add absence and ordering helpers.**

```js
function refuseFragments(fragments) {
  for (const f of fragments) {
    assert.ok(!html.includes(f), `Forbidden fragment present: ${f}`);
  }
}
function requireOrder(markers) {
  let last = -1;
  for (const m of markers) {
    const i = html.indexOf(m);
    assert.ok(i !== -1, `Missing ordered marker: ${m}`);
    assert.ok(i > last, `Marker out of order: ${m}`);
    last = i;
  }
}
```

- [ ] **Step 2: Rescope the aurora "no JavaScript" assertion.**
  Replace the line `assert.ok(!html.includes("<script"), "The aurora must not add JavaScript");` (currently `tests/portfolio-homepage.test.mjs:38`). The pill/scrollspy needs JS by design; the intent this protects is that the *aurora background* is CSS-driven, not that the page has no JS. Replacement protects the real behavior:

```js
// The aurora is pure CSS: it is defined by body::before/::after and the
// aurora-drift keyframes, and no script drives it.
requireFragments(["body::before {", "body::after {", "@keyframes aurora-drift"]);
// The bento must not rely on JavaScript for hover behavior.
assert.ok(!html.includes("bentoHover") && !html.includes("data-bento-js"),
  "Bento hover must be CSS-only");
```

- [ ] **Step 3: Add section-order assertions.**

```js
test("orders the page Home -> Portfolio -> About above the footer", () => {
  requireOrder(['id="home"', 'id="portfolio"', 'id="about"', '</main>', '<footer']);
});
```

- [ ] **Step 4: Run tests and confirm the intended red state.**
  Run: `node --test tests/portfolio-homepage.test.mjs`
  Expected: FAIL on the new order/section assertions (index.html not yet updated); the preserved-content and aurora fragment checks still pass.

### Task 2: Founder introduction in `#home`

**Files:**
- Modify: `index.html` (hero/home area)
- Add: `assets/founder-reiniel.jpg` (owner-supplied; copied in, not generated)
- Modify: `tests/portfolio-homepage.test.mjs`

**Interfaces:**
- Consumes: the existing `.hero` section and shell layout.
- Produces: a `#home` section containing the hero headline, the founder photo, the `Hi, I'm Reiniel.` subheading, the approved body, and two CTA links.

- [ ] **Step 1: Write failing founder assertions.**

```js
test("renders the founder introduction with exact copy and CTAs", () => {
  requireFragments([
    'id="home"',
    "Work built to make complex information useful.",
    "Hi, I&#39;m Reiniel.",              // or "Hi, I'm Reiniel." depending on quote encoding
    "I&#39;m a carbon analyst specializing in greenhouse gas accounting across Scope 1, Scope 2, and Scope 3.",
    'src="assets/founder-reiniel.jpg"',
    'alt="Reiniel Celgie Chan standing on a forest trail beside a distance marker post."',
    '>View LinkedIn<',
    'href="https://www.linkedin.com/in/reiniel-celgie-chan-0a122428b/"',
    'rel="noopener noreferrer"',
    '>Email me<',
    'href="mailto:reinielcelgiechan@gmail.com"',
  ]);
});
```

  Note: match the apostrophe exactly as authored (`&#39;` if HTML-escaped, or a literal `'`). Pick one encoding in `index.html` and assert the same one.

- [ ] **Step 2: Run to confirm failure.**
  Run: `node --test tests/portfolio-homepage.test.mjs` - Expected: FAIL (founder block absent).

- [ ] **Step 3: Add the founder markup inside `#home`.**
  Give the home section `id="home"`. Keep the eyebrow and the `h1` headline. Replace the old hero-copy paragraph with a two-column founder block. Photo first in DOM order:

```html
<section class="shell hero" id="home" aria-labelledby="portfolio-title">
  <div class="hero-lead">
    <p class="eyebrow">Sustainability · Data · Automation</p>
    <h1 id="portfolio-title">Work built to make complex information useful.</h1>
  </div>
  <div class="founder">
    <img class="founder-photo" src="assets/founder-reiniel.jpg"
         alt="Reiniel Celgie Chan standing on a forest trail beside a distance marker post."
         width="960" height="1200" loading="eager" decoding="async">
    <div class="founder-copy">
      <h2 class="founder-hi">Hi, I'm Reiniel.</h2>
      <p class="founder-body">I'm a carbon analyst specializing in greenhouse gas accounting across Scope 1, Scope 2, and Scope 3. I work across the end-to-end process, from mapping business activities and identifying applicable emission sources to building dashboards and translating results into practical insights. My work helps teams assess decarbonization opportunities and understand their potential financial, energy, and emissions impacts.</p>
      <div class="founder-cta">
        <a class="button button-primary" href="https://www.linkedin.com/in/reiniel-celgie-chan-0a122428b/" target="_blank" rel="noopener noreferrer"><span>View LinkedIn</span><span aria-hidden="true">↗</span></a>
        <a class="button button-secondary" href="mailto:reinielcelgiechan@gmail.com"><span>Email me</span><span aria-hidden="true">→</span></a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add founder CSS (inline `<style>`).**
  Two-column at wide widths, single column at `max-width: 820px` with the photo first. Justify only `.founder-body` on wide viewports, left-align below the breakpoint:

```css
.founder { display: grid; grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr); gap: clamp(24px, 4vw, 56px); align-items: center; }
.founder-photo { width: 100%; height: auto; border-radius: 18px; box-shadow: var(--shadow); object-fit: cover; }
.founder-hi { margin: 0 0 16px; color: var(--forest-deep); font-size: clamp(28px, 4vw, 40px); letter-spacing: -0.03em; }
.founder-body { margin: 0 0 24px; color: var(--muted); font-size: 18px; line-height: 1.7; text-align: justify; hyphens: auto; }
.founder-cta { display: flex; flex-wrap: wrap; gap: 12px; }
@media (max-width: 820px) {
  .founder { grid-template-columns: 1fr; }
  .founder-body { text-align: left; hyphens: manual; }
}
```

- [ ] **Step 5: Run to confirm pass.**
  Run: `node --test tests/portfolio-homepage.test.mjs` - Expected: PASS for the founder test and the preserved-headline check.

- [ ] **Step 6: Commit.**

```bash
git add index.html assets/founder-reiniel.jpg tests/portfolio-homepage.test.mjs
git commit -m "feat: add founder introduction to home section"
```

### Task 3: Segmented navigation baseline (no JavaScript) and section ids

**Files:**
- Modify: `index.html` (header + section ids)
- Modify: `tests/portfolio-homepage.test.mjs`

**Interfaces:**
- Consumes: `#home` from Task 2.
- Produces: `#portfolio` and `#about` scroll targets and a `.segmented` nav of three anchor links with a `.seg-pill` element.

- [ ] **Step 1: Write failing nav assertions.**

```js
test("provides a Home/Portfolio/About segmented nav of anchor links", () => {
  requireFragments([
    'class="segmented"',
    '<a class="seg" href="#home"',
    '<a class="seg" href="#portfolio"',
    '<a class="seg" href="#about"',
    '>Home<', '>Portfolio<', '>About<',
    'class="seg-pill"', 'aria-hidden="true"',
  ]);
  requireOrder(['href="#home"', 'href="#portfolio"', 'href="#about"']);
});
```

- [ ] **Step 2: Run to confirm failure.** `node --test tests/portfolio-homepage.test.mjs` - Expected: FAIL.

- [ ] **Step 3: Add the nav markup in the header and the section ids.**

```html
<nav class="segmented" aria-label="Section navigation">
  <span class="seg-pill" aria-hidden="true"></span>
  <a class="seg" href="#home" aria-current="true">Home</a>
  <a class="seg" href="#portfolio">Portfolio</a>
  <a class="seg" href="#about">About</a>
</nav>
```

  Add `id="portfolio"` to the existing `.project-section`, and add the new `<section class="shell about" id="about">` (its content lands in Task 5). Confirm final `<main>` order is `#home`, `#portfolio`, `#about`.

- [ ] **Step 4: Add nav CSS with a CSS-only `:target` fallback.**
  The pill is positioned; without JS it stays put, so provide a `:target`-based active color so the clicked control still reads as active. Baseline anchor navigation and smooth scroll come from the existing `html { scroll-behavior: smooth; }`.

```css
.segmented { position: relative; display: inline-flex; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 999px; background: var(--white); }
.seg { position: relative; z-index: 1; padding: 8px 16px; border-radius: 999px; color: var(--muted); font-size: 14px; font-weight: 650; text-decoration: none; transition: color 240ms ease; }
.seg[aria-current="true"] { color: var(--forest-deep); }
.seg-pill { position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 4px; width: 84px; border-radius: 999px; background: var(--mint); transition: left 0.4s cubic-bezier(0.65, 0, 0.35, 1), width 0.4s cubic-bezier(0.65, 0, 0.35, 1); }
/* No-JS fallback: highlight the targeted control. */
#home:target ~ * .seg[href="#home"],
#portfolio:target ~ * .seg[href="#portfolio"],
#about:target ~ * .seg[href="#about"] { color: var(--forest-deep); }
@media (max-width: 820px) { .segmented { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .seg-pill { transition: none; } .seg { transition: none; } }
```

  Note: the `:target` selector combinator depends on DOM relationships; if the header precedes `<main>`, use a simpler robust fallback: on `:target` of a section, set a body-scoped custom highlight, or accept that the JS path is the primary active indicator and the no-JS fallback only needs anchor navigation to work (which it does). Keep whichever is correct for the final DOM; the non-negotiable is that clicking a control navigates and focus is visible without JS.

- [ ] **Step 5: Run to confirm pass.** `node --test tests/portfolio-homepage.test.mjs` - Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add index.html tests/portfolio-homepage.test.mjs
git commit -m "feat: add segmented Home/Portfolio/About nav baseline"
```

### Task 4: Nav enhancement script (sliding pill + scrollspy)

**Files:**
- Modify: `index.html` (one inline `<script>` at end of `<body>`)
- Modify: `tests/portfolio-homepage.test.mjs`

**Interfaces:**
- Consumes: `.segmented`, `.seg`, `.seg-pill`, and the three section ids.
- Produces: runtime behavior only; the test asserts the presence and shape of the enhancement, not runtime.

- [ ] **Step 1: Write failing assertions for the enhancement contract.**

```js
test("enhances the nav with an offset-measured pill and reduced-motion guard", () => {
  requireFragments([
    "offsetLeft", "offsetWidth",           // pill geometry read from the active control
    "IntersectionObserver",                // scrollspy follows scroll position
    "prefers-reduced-motion",              // guard in script
    "matchMedia",                          // reduced-motion detection
  ]);
});
```

- [ ] **Step 2: Run to confirm failure.** `node --test tests/portfolio-homepage.test.mjs` - Expected: FAIL.

- [ ] **Step 3: Add the inline script.**
  On load, resize, and `document.fonts.ready`, position the pill under the active control using `offsetLeft`/`offsetWidth`. Move `aria-current` on activation and via an `IntersectionObserver` that tracks which section is in view. Respect reduced motion for scripted scroll and pill snapping. Guard every DOM lookup.

```html
<script>
  (function () {
    var nav = document.querySelector('.segmented');
    if (!nav) return;
    var pill = nav.querySelector('.seg-pill');
    var links = Array.prototype.slice.call(nav.querySelectorAll('.seg'));
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    function movePill(el) {
      if (!pill || !el) return;
      if (reduce.matches) { pill.style.transition = 'none'; }
      pill.style.left = el.offsetLeft + 'px';
      pill.style.width = el.offsetWidth + 'px';
    }
    function setActive(el) {
      links.forEach(function (l) { l.removeAttribute('aria-current'); });
      if (el) { el.setAttribute('aria-current', 'true'); movePill(el); }
    }
    function linkFor(id) { return links.find(function (l) { return l.getAttribute('href') === '#' + id; }); }
    // Initial position (active link, default first).
    var initial = links.find(function (l) { return l.getAttribute('aria-current') === 'true'; }) || links[0];
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { movePill(initial); }); }
    window.addEventListener('load', function () { movePill(initial); });
    window.addEventListener('resize', function () {
      var cur = links.find(function (l) { return l.getAttribute('aria-current') === 'true'; }) || initial;
      var t = pill ? pill.style.transition : ''; if (pill) pill.style.transition = 'none';
      movePill(cur); if (pill) requestAnimationFrame(function () { pill.style.transition = t; });
    });
    // Click: set active + smooth scroll (auto under reduced motion).
    links.forEach(function (l) {
      l.addEventListener('click', function (e) {
        var id = l.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          setActive(l);
          target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + id);
        }
      });
    });
    // Scrollspy: active follows the section in view.
    var ids = ['home', 'portfolio', 'about'];
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { setActive(linkFor(en.target.id)); }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    ids.forEach(function (id) { var s = document.getElementById(id); if (s) obs.observe(s); });
  })();
</script>
```

- [ ] **Step 4: Run to confirm pass.** `node --test tests/portfolio-homepage.test.mjs` - Expected: PASS.

- [ ] **Step 5: Manual runtime check.** Open `index.html` from `file://`. Clicking each control smooth-scrolls and the pill animates with the specified easing; scrolling moves the pill via scrollspy; with reduced motion enabled the pill snaps and scroll is instant; with JS disabled the anchor links still navigate.

- [ ] **Step 6: Commit.**

```bash
git add index.html tests/portfolio-homepage.test.mjs
git commit -m "feat: enhance nav with sliding pill and scrollspy"
```

### Task 5: About bento (bottom-of-page, CSS only)

**Files:**
- Modify: `index.html` (`#about` content + inline CSS)
- Modify: `tests/portfolio-homepage.test.mjs`

**Interfaces:**
- Consumes: the `#about` section shell from Task 3.
- Produces: three `.bento-card` cells in DOM order Card 1, Card 2, Card 3.

- [ ] **Step 1: Write failing bento assertions (presence, exact copy, and absence).**

```js
test("renders the three-card About bento with exact content and no forbidden data", () => {
  requireFragments([
    'id="about"', 'class="bento"',
    "Regional emission-factor experience",
    "DCCEEW National Greenhouse Accounts (NGA) Factors",
    "DESNZ greenhouse gas reporting conversion factors",
    "Metro Manila, Philippines",
    "Tools I use",
    ">Excel<", ">Power Query<", ">Power Automate<", ">Power BI<", ">ChatGPT<", ">Claude<",
    "grid-template-columns: 1.1fr 0.9fr",   // uneven editorial grid
    ":has(",                                 // sibling dimming as progressive enhancement
  ]);
  refuseFragments([
    "Carbon Hoshi", "n8n", "Muntinlupa",
    "NGER",                                  // no mandatory-reporting suitability claim
    "<iframe", "maps.googleapis", "openstreetmap", "mapbox", "tile.",
  ]);
  requireOrder(['class="bento"', "Regional emission-factor experience", "Metro Manila, Philippines", "Tools I use"]);
});
```

- [ ] **Step 2: Run to confirm failure.** `node --test tests/portfolio-homepage.test.mjs` - Expected: FAIL.

- [ ] **Step 3: Add the bento markup (DOM order Card 1 -> 2 -> 3).**

```html
<section class="shell about" id="about" aria-labelledby="about-title">
  <div class="section-label">About</div>
  <h2 id="about-title" class="about-title">A bit about how I work</h2>
  <div class="bento">
    <article class="bento-card bento-lead">
      <p class="bento-eyebrow">Regional emission-factor experience</p>
      <p>Familiar with applying Australia's DCCEEW National Greenhouse Accounts (NGA) Factors and the UK's DESNZ greenhouse gas reporting conversion factors when preparing emissions estimates. Working familiarity only, not assurance or certification.</p>
    </article>
    <article class="bento-card bento-loc">
      <p class="bento-eyebrow">Based in</p>
      <div class="loc-visual" role="img" aria-label="Illustrated marker over Metro Manila"><!-- inline decorative SVG: soft landmass shape + oversized head marker, no coordinates --></div>
      <p class="loc-label">Metro Manila, Philippines</p>
    </article>
    <article class="bento-card bento-tools">
      <p class="bento-eyebrow">Tools I use</p>
      <ul class="tool-list">
        <li><span>Excel</span></li><li><span>Power Query</span></li><li><span>Power Automate</span></li>
        <li><span>Power BI</span></li><li><span>ChatGPT</span></li><li><span>Claude</span></li>
      </ul>
    </article>
  </div>
</section>
```

  The Card 2 SVG is inline, decorative, broad/abstract (a soft blob suggesting southern Metro Manila plus an oversized illustrated head marker). It encodes no coordinates, address, `Muntinlupa`, or metadata.

- [ ] **Step 4: Add bento CSS: uneven grid, monospace labels, interaction, fallbacks.**

```css
.bento { display: grid; grid-template-columns: 1.1fr 0.9fr; grid-auto-rows: 1fr; gap: 18px; }
.bento-card { display: flex; flex-direction: column; gap: 12px; padding: clamp(20px, 3vw, 32px); background: var(--white); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 200ms ease, border-color 200ms ease; }
.bento-lead { grid-column: 1; grid-row: 1 / span 2; }
.bento-loc { grid-column: 2; grid-row: 1; }
.bento-tools { grid-column: 2; grid-row: 2; }
.bento-eyebrow { margin: 0; color: var(--muted); font: 700 12px ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; }
.tool-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.tool-list li { font: 600 13px ui-monospace, monospace; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; color: var(--forest); }
/* Lift on hover and keyboard focus; restrained amber accent. */
.bento-card:hover, .bento-card:focus-within, .bento-card:focus-visible {
  transform: translateY(-4px) scale(1.015); border-color: var(--aurora-amber);
}
/* Sibling dimming: progressive enhancement, subtle, no shrink. */
.bento:has(> .bento-card:hover, > .bento-card:focus-within) > .bento-card { transition: opacity 200ms ease; }
.bento:has(> .bento-card:hover) > .bento-card:not(:hover),
.bento:has(> .bento-card:focus-within) > .bento-card:not(:focus-within) { opacity: 0.88; }
@media (max-width: 820px) {
  .bento { grid-template-columns: 1fr; }
  .bento-lead, .bento-loc, .bento-tools { grid-column: 1; grid-row: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .bento-card { transition: border-color 200ms ease, background 200ms ease; }
  .bento-card:hover, .bento-card:focus-within, .bento-card:focus-visible { transform: none; }
  .bento:has(> .bento-card:hover) > .bento-card:not(:hover),
  .bento:has(> .bento-card:focus-within) > .bento-card:not(:focus-within) { opacity: 1; }
}
```

- [ ] **Step 5: Run to confirm pass.** `node --test tests/portfolio-homepage.test.mjs` - Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add index.html tests/portfolio-homepage.test.mjs
git commit -m "feat: add bottom-of-page About bento"
```

### Task 6: Full verification

**Files:**
- Test: `tests/portfolio-homepage.test.mjs`, `tests/fleet-electrification.test.mjs`, `index.html`

- [ ] **Step 1: Automated.** Run `node --test tests/`. Expected: all pass (homepage + fleet).
- [ ] **Step 2: Content and privacy scan.** Confirm exact founder heading/body; photo `assets/founder-reiniel.jpg` + meaningful alt; exact LinkedIn (`rel="noopener noreferrer"`, new tab) and mailto; the six tools verbatim; `Metro Manila, Philippines`; and absence of `Carbon Hoshi`, `n8n`, `Muntinlupa`, coordinates, map APIs, `<iframe>`, remote tiles, and tracking.
- [ ] **Step 3: Regional-factor wording.** Card 1 states familiarity only; no assurance/certification/regulatory-advice/NGER-suitability wording; no hard-coded year.
- [ ] **Step 4: Nav + order.** Home/Portfolio/About target the correct sections; `#about` is the last main section before `<footer>`; DOM and keyboard tab order follow Home -> Portfolio -> About.
- [ ] **Step 5: Desktop bento.** Uneven grid (`1.1fr 0.9fr`), Card 1 tall/dominant spanning both rows, Cards 2 and 3 stacked right; deliberate compact spacing.
- [ ] **Step 6: Mobile.** At `<=820px` and `<=460px`: single-column bento, founder block stacked photo-first, segmented control wraps, no horizontal overflow.
- [ ] **Step 7: Resting state and touch.** Every bento card is readable without hover; on a touch device the cards do not require hover and do not look falsely clickable.
- [ ] **Step 8: Keyboard + focus.** Tabbing reaches nav links and any card links; focus is visible; `:focus-within`/`:focus-visible` lift works.
- [ ] **Step 9: Reduced motion.** With reduce enabled: nav pill snaps, label crossfade off, scripted scroll instant, bento lift/scale/sibling-dim removed.
- [ ] **Step 10: Progressive enhancement.** With `:has()` unsupported, siblings do not dim but each card still lifts and content is correct. With JavaScript disabled, anchor links still navigate and smooth scroll still works.
- [ ] **Step 11: GitHub Pages.** Open from `file://` with no server; confirm zero external requests in the network panel and no console errors. Do not change Pages settings.

## Self-Review (performed while writing this plan)

- **Spec coverage:** Founder intro (Task 2), nav baseline + order + ids (Task 3), pill + scrollspy + reduced motion (Task 4), three-card bento with hierarchy/DOM order/grid/interaction/fallbacks (Task 5), full verification incl. privacy, no-JS, no-`:has()`, contrast, overflow, GitHub Pages (Task 6). About-is-bottom-most enforced in Tasks 3 and 6.
- **Placeholder scan:** no TBD/TODO; each code step carries real HTML/CSS/JS or test code.
- **Type/name consistency:** class names `.segmented`, `.seg`, `.seg-pill`, `.bento`, `.bento-card`, `.bento-lead/loc/tools`, `.bento-eyebrow`, `.tool-list` are used identically across markup, CSS, and tests.
- **Known judgment calls flagged for the implementer:** the apostrophe encoding in founder copy must match between `index.html` and the test; the `:target` no-JS fallback selector must be adjusted to the final DOM (the non-negotiable is that anchor navigation and visible focus work without JS, which they do regardless of the fallback highlight).
