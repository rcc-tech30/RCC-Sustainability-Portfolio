import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

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
  // Justify only on wide viewports, revert on mobile.
  requireFragments(["text-align: justify;", "text-align: left; hyphens: manual;"]);
});

test("renders the three-card About bento with exact content", () => {
  requireFragments([
    'id="about"',
    'class="bento"',
    "grid-template-columns: 1.1fr 0.9fr;",
    "Regional emission-factor experience",
    "DCCEEW National Greenhouse Accounts (NGA) Factors",
    "DESNZ greenhouse gas reporting conversion factors",
    "Metro Manila, Philippines",
    "Tools I use",
    ">Excel<",
    ">Power Query<",
    ">Power Automate<",
    ">Power BI<",
    ">ChatGPT<",
    ">Claude<"
  ]);
  requireOrder([
    'class="bento"',
    "Regional emission-factor experience",
    "Metro Manila, Philippines",
    "Tools I use"
  ]);
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
    "n8n",
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
