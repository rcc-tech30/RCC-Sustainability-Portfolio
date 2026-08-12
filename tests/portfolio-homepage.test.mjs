import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function requireFragments(fragments) {
  for (const fragment of fragments) {
    assert.ok(html.includes(fragment), `Missing required fragment: ${fragment}`);
  }
}

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

test("defines the approved asymmetric edge aurora", () => {
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
  assert.ok(!html.includes("<script"), "The aurora must not add JavaScript");
});

test("applies the approved light UI polish", () => {
  requireFragments([
    "--line: #d5ded8;",
    "--shadow: 0 18px 52px rgba(7, 42, 36, 0.10);",
    "padding: clamp(64px, 9.5vw, 128px) 0 68px;",
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
    "body::before { animation: none; transform: none; }",
    ".dashboard-preview, .button { transition: none; }"
  ]);
});
