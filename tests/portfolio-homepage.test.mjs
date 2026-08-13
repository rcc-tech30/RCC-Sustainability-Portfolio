import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const philippinesMap = readFileSync(new URL("../assets/rcc-philippines-map.jpg", import.meta.url));

function requireFragments(fragments) {
  for (const fragment of fragments) {
    assert.ok(html.includes(fragment), `Missing required fragment: ${fragment}`);
  }
}

function refuseFragments(fragments) {
  for (const fragment of fragments) {
    assert.ok(!html.includes(fragment), `Forbidden fragment present: ${fragment}`);
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

// The inline <script> body (nav enhancement only).
const scriptBody = (() => {
  const s = html.indexOf("<script>");
  const e = html.indexOf("</script>");
  return s === -1 || e === -1 ? "" : html.slice(s, e);
})();

test("preserves the current portfolio content and destinations", () => {
  requireFragments([
    "Work built to make complex information useful.",
    "Fleet Electrification Transition Assessment",
    "Company X GHG Dashboard",
    "Company X Native Power BI Dashboard",
    'href="dashboards/fleet-electrification-transition/"',
    'href="dashboards/company-x-ghg/"',
    'href="dashboards/company-x-power-bi/company-x-sustainability-dashboard.pbix"',
    'href="https://www.linkedin.com/in/reiniel-celgie-chan-0a122428b/"'
  ]);
});

test("defines the approved asymmetric edge aurora (CSS only)", () => {
  requireFragments([
    "--aurora-blue: #5b8def;",
    "--aurora-mint: #69a781;",
    "--aurora-amber: #d49a35;",
    "body::before {",
    "body::after {",
    "filter: blur(56px);",
    "animation: aurora-drift 22s ease-in-out infinite alternate;",
    "pointer-events: none;",
    "@keyframes aurora-drift"
  ]);
  // The aurora and every visual background stay CSS-driven: no script names them.
  assert.ok(!/aurora/i.test(scriptBody), "The aurora must not be driven by JavaScript");
});

test("adds no external script or stylesheet dependencies", () => {
  refuseFragments([
    "<script src",
    "<script type=\"module\"",
    'rel="stylesheet"',
    "@import",
    'src="http',
    'src="//'
  ]);
});

test("applies the approved light UI polish", () => {
  requireFragments([
    "--line: #d5ded8;",
    "--shadow: 0 18px 52px rgba(7, 42, 36, 0.10);",
    "padding: clamp(24px, 4vw, 56px) 0 72px;",
    "border-radius: 24px;",
    "transform: rotate(-0.7deg);",
    ".project:hover .dashboard-preview { transform: rotate(0deg) translateY(-3px); }"
  ]);
});

test("provides static motion fallbacks and visible keyboard focus", () => {
  requireFragments([
    "a:focus-visible {",
    "outline: 3px solid var(--emerald);",
    "@media (max-width: 820px)",
    "body::before { animation: none; transform: none; }",
    "@media (prefers-reduced-motion: reduce)",
    ".dashboard-preview, .button { transition: none; }"
  ]);
});

test("orders the page Home -> Portfolio -> About above the footer", () => {
  requireOrder(['id="home"', 'id="portfolio"', 'id="about"', "</main>", "<footer"]);
});

test("renders the approved footer copyright", () => {
  requireFragments(["© 2026. All rights reserved."]);
  refuseFragments(["<footer class=\"shell\">\r\n    <span>Reiniel Celgie Chan</span>"]);
});

test("provides a Home/Portfolio/About segmented nav of anchor links", () => {
  requireFragments([
    'class="segmented"',
    '<a class="seg" href="#home"',
    '<a class="seg" href="#portfolio"',
    '<a class="seg" href="#about"',
    ">Home<",
    ">Portfolio<",
    ">About<",
    'class="seg-pill"'
  ]);
  requireOrder(['href="#home"', 'href="#portfolio"', 'href="#about"']);
});

test("enhances the nav with offset-measured pill and reduced-motion guard", () => {
  // Nav enhancement lives in the inline script and reads pixel geometry.
  assert.ok(scriptBody.includes("offsetLeft"), "pill must read offsetLeft");
  assert.ok(scriptBody.includes("offsetWidth"), "pill must read offsetWidth");
  assert.ok(scriptBody.includes("IntersectionObserver"), "active state must follow scroll");
  assert.ok(scriptBody.includes("prefers-reduced-motion"), "script must guard reduced motion");
  assert.ok(scriptBody.includes("matchMedia"), "script must detect reduced motion");
  // Pill easing/duration is declared in CSS.
  requireFragments([
    "transition: left 0.4s cubic-bezier(0.65, 0, 0.35, 1), width 0.4s cubic-bezier(0.65, 0, 0.35, 1);"
  ]);
});

test("renders the founder introduction with exact copy and CTAs", () => {
  requireFragments([
    'id="home"',
    "Hi, I'm Reiniel.",
    "I'm a carbon analyst specializing in greenhouse gas accounting across Scope 1, Scope 2, and Scope 3. I work across the end-to-end process, from mapping business activities and identifying applicable emission sources to building dashboards and translating results into practical insights. My work helps teams assess decarbonization opportunities and understand their potential financial, energy, and emissions impacts.",
    'src="assets/founder-reiniel.jpg"',
    'alt="Reiniel Celgie Chan standing on a forest trail beside a distance marker post."',
    ">View LinkedIn<",
    'rel="noopener noreferrer"',
    ">Email me<",
    'href="mailto:reinielcelgiechan@gmail.com"'
  ]);
  // Justified on desktop for a clean block edge (with hyphenation and a left
  // last line), but reverted to left alignment on mobile where justification
  // produced severe word gaps at ~375px. Readability wins over strict matching.
  requireFragments([
    "text-align: justify;",
    "text-align-last: left;",
    "hyphens: auto;",
    "text-align: left; hyphens: manual;"
  ]);
});

test("renders the four-card About bento with exact content", () => {
  requireFragments([
    'id="about"',
    'class="bento"',
    "grid-template-columns: 1.35fr 1fr;",
    "grid-template-rows: minmax(230px, auto) minmax(120px, auto) auto;",
    "Regional emission-factor experience",
    "Working experience with applying Australia's DCCEEW National Greenhouse Accounts (NGA) Factors",
    "DCCEEW National Greenhouse Accounts (NGA) Factors",
    "DESNZ greenhouse gas reporting conversion factors",
    'class="region-factor-grid"',
    'class="region-factor-card"',
    'class="region-factor-pill"',
    "gap: 28px;",
    "align-items: start;",
    'class="section-separator"',
    "margin: 22px 0 18px;",
    "height: 1px;",
    "background: var(--line);",
    "margin: 0 0 14px;",
    "min-height: 230px;",
    "width: min(220px, 100%);",
    "min-height: 218px;",
    ".factor-lines i:nth-child(5)",
    "<i></i><i></i><i></i><i></i><i></i>",
    "Metro Manila, Philippines",
    ".bento-loc {",
    "min-height: 230px;",
    "Open to working with Australia and UK-aligned reporting hours.",
    'src="assets/rcc-philippines-map.jpg"',
    "max-height: 168px;",
    "max-height: 215px;",
    "Tools I currently use",
    'class="tool-marquee"',
    'class="tool-track"',
    "animation: tool-marquee 22s linear infinite;",
    "@keyframes tool-marquee",
    'class="tool-logo mk-spreadsheet"',
    'class="tool-logo mk-transform"',
    'class="tool-logo mk-flow"',
    'class="tool-logo mk-analytics"',
    'class="tool-logo mk-assistant"',
    'class="tool-logo mk-reasoning"',
    'class="chatgpt-knot"',
    'class="claude-sunburst"',
    'class="claude-ray"',
    'aria-hidden="true" focusable="false"',
    ">Excel<",
    ">Power Query<",
    ">Power Automate<",
    ">Power BI<",
    ">ChatGPT<",
    ">Claude<",
    "Currently exploring",
    ".bento-explore {",
    "min-height: 120px;",
    "justify-content: center;",
    ">n8n<",
    ">SQL<",
    "Learning in progress, not claimed as working expertise."
  ]);
  assert.match(
    html,
    /<div class="region-factor-card">[\s\S]*Australia[\s\S]*<span class="region-factor-pill">DCCEEW NGA<\/span>[\s\S]*<\/div>/,
    "DCCEEW NGA must sit inside the Australia region card"
  );
  assert.match(
    html,
    /<div class="region-factor-card">[\s\S]*United Kingdom[\s\S]*<span class="region-factor-pill">DEFRA \/ DESNZ<\/span>[\s\S]*<\/div>/,
    "DEFRA / DESNZ must sit inside the United Kingdom region card"
  );
  requireOrder([
    "regulatory advice.</p>",
    'class="section-separator"',
    "Regions and factor sets",
    'class="region-factor-grid"',
    "Open to working with Australia and UK-aligned reporting hours."
  ]);
  requireOrder([
    'class="bento"',
    "Regional emission-factor experience",
    "Metro Manila, Philippines",
    "Currently exploring",
    "Tools I currently use"
  ]);
  refuseFragments([
    "Working familiarity",
    "animation: tool-marquee 6s linear infinite;",
    "animation: tool-marquee 16s linear infinite;",
    ">and more<",
    'role="progressbar"',
    'class="tool-progress"',
    '<span class="tool-mark">X</span>',
    '<span class="tool-mark">PQ</span>',
    '<span class="tool-mark power">PA</span>',
    '<span class="tool-mark bi">BI</span>',
    'r="18" fill="#e7f4ee"',
    '<g stroke="#d97745" stroke-width="3.2" stroke-linecap="round">',
    'aria-label="Illustrated marker over Metro Manila"',
    'viewBox="0 0 240 160"',
    "locGlow",
    "Working across Australian and UK reporting hours from Luzon."
  ]);
  assert.doesNotMatch(
    html,
    /\.bento-subhead::after/,
    "bento subheads must not use side-line pseudo-element separators"
  );
  assert.doesNotMatch(html, /Frameworks I apply|Frameworks I work with/);
});

test("tools marquee is pure CSS and duplicated for a seamless loop", () => {
  const firstSet = html.indexOf('class="tool-set"');
  const secondSet = html.indexOf('class="tool-set"', firstSet + 1);
  assert.ok(firstSet !== -1, "first tool list missing");
  assert.ok(secondSet !== -1, "second duplicated tool list missing");
  assert.ok(!/tool-marquee/i.test(scriptBody), "tool marquee must not use JavaScript");
  requireFragments([
    ".tool-marquee:hover .tool-track",
    "animation-play-state: paused;",
    "mask-image: linear-gradient",
    ".tool-set:nth-child(2)"
  ]);
  assert.equal((html.match(/class="tool-logo mk-spreadsheet"/g) || []).length, 2, "spreadsheet mark should exist in both marquee copies");
  assert.equal((html.match(/class="tool-logo mk-transform"/g) || []).length, 2, "transform mark should exist in both marquee copies");
  assert.equal((html.match(/class="tool-logo mk-flow"/g) || []).length, 2, "flow mark should exist in both marquee copies");
  assert.equal((html.match(/class="tool-logo mk-analytics"/g) || []).length, 2, "analytics mark should exist in both marquee copies");
  assert.equal((html.match(/class="tool-logo mk-assistant"/g) || []).length, 2, "assistant mark should exist in both marquee copies");
  assert.equal((html.match(/class="tool-logo mk-reasoning"/g) || []).length, 2, "reasoning mark should exist in both marquee copies");
  assert.notEqual((html.match(/class="tool-logo mk-assistant"/g) || []).length, 0, "ChatGPT mark must be present");
  assert.notEqual((html.match(/class="tool-logo mk-reasoning"/g) || []).length, 0, "Claude mark must be present");
});

test("uses the approved same-origin Philippines map asset", () => {
  assert.equal(philippinesMap.length, 42956, "approved map byte length changed");
  assert.equal(philippinesMap.subarray(0, 3).toString("hex"), "ffd8ff", "map must be a JPEG");
  assert.equal(
    createHash("sha256").update(philippinesMap).digest("hex").toUpperCase(),
    "0B754750F3123F64D9ADF59497236BF694BBA3582E7DF8A7D2384AD21A9B11AF"
  );
});

test("bento interaction is progressive enhancement and CSS only", () => {
  requireFragments([":has(", "@media (prefers-reduced-motion: reduce)"]);
  // No JavaScript drives the bento.
  assert.ok(!/bento/i.test(scriptBody), "bento hover must be CSS-only");
});

test("home leads with text then photo and greets as the heading", () => {
  requireFragments([
    'class="hero-text"',
    'id="home-heading"',
    'class="founder-photo"'
  ]);
  // DOM order: eyebrow -> greeting heading -> body -> CTAs -> photo (photo last).
  requireOrder([
    'id="home"',
    'class="eyebrow"',
    "Hi, I'm Reiniel.",
    'class="founder-body"',
    'class="founder-cta"',
    'class="founder-photo"'
  ]);
  // The old Home headline is no longer the Home H1.
  assert.ok(
    !/<h1[^>]*>\s*Work built to make complex information useful\./.test(html),
    "'Work built...' must not be the Home H1"
  );
});

test("portfolio starts with a Featured work heading and the relocated subheader", () => {
  requireFragments([
    'class="portfolio-title"',
    ">Featured work<",
    'class="portfolio-sub"',
    "font-size: clamp(32px, 4.5vw, 52px);"
  ]);
  requireOrder([
    'id="portfolio"',
    'class="portfolio-title"',
    'class="portfolio-sub"',
    "Work built to make complex information useful.",
    'class="projects"'
  ]);
});

test("keeps a sticky nav dock with only the segmented control, brand outside it", () => {
  requireFragments([
    'class="shell nav-dock"',
    "position: sticky;",
    "scroll-margin-top: 88px;"
  ]);
  // Brand sits before the nav dock, and the segmented control is inside the dock.
  requireOrder([
    'class="brand"',
    'class="shell nav-dock"',
    'class="segmented"'
  ]);
  // The brand wordmark is not part of the segmented nav.
  const navStart = html.indexOf('class="segmented"');
  const navEnd = html.indexOf("</nav>", navStart);
  const navMarkup = html.slice(navStart, navEnd);
  assert.ok(!navMarkup.includes("RCC Sustainability Portfolio"), "brand must not be inside the sticky nav");
});

test("excludes forbidden content and external map/location data", () => {
  refuseFragments([
    "Carbon Hoshi",
    "Muntinlupa",
    "NGER",
    "<iframe",
    "maps.googleapis",
    "openstreetmap",
    "mapbox",
    "tile.",
    "navigator.geolocation"
  ]);
});
