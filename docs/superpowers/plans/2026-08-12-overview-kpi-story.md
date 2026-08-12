# Overview KPI Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Fleet Electrification Overview cards and add live Scope 2 and net pre-certificate emissions KPIs that explain the transition pathway without changing the model.

**Architecture:** Add one pure presentation helper that derives Scope 2 increase, net emissions change, direction, and card tone from the existing `calculateScenario` result. Keep the financial and emissions model authoritative and unchanged. Rebuild only the eight-card Overview markup and its render bindings, while retaining BEV electricity and certificate cost in the detailed views.

**Tech Stack:** Self-contained HTML, native CSS and vanilla JavaScript; Node.js built-in test runner and VM; PowerShell portfolio verifier; installed Chromium browser verification.

## Global Constraints

- Preserve the current light theme, navy and emerald brand treatment, card dimensions, typography, responsive grid, accessibility behavior, inputs, charts, detailed views, and calculation model.
- Use eight Overview cards in this exact DOM and visual order: Fleet transition, Scope 1 avoided, Scope 2 increase, Residual after certificates, Annual operating impact, Simple payback, Net emissions change, Net transition investment.
- Every KPI must update through the existing render cycle whenever any contributing input changes. No displayed number or direction word may be hard-coded from the sample scenario.
- Scope 2 increase is `postTransitionGridScope2 - baselineGridScope2` and is not reduced by certificate coverage.
- Net emissions change is `baselineTotalEmissions - residualBeforeCertificates`, which equals Scope 1 avoided minus Scope 2 increase.
- Net emissions change uses an absolute displayed value with direction in words: Reduction before certificates, Increase before certificates, or No change before certificates.
- Use green for a reduction, amber for an increase, and navy for neutral information. Color is not the only signal.
- Remove BEV electricity added and Additional certificate cost from Overview cards only. Retain both calculations and both detailed-view rows.
- The Residual after certificates subline is `Before certificates: [residualBeforeCertificates]`; do not call that combined residual a grid-based result.
- Do not modify scenario formulas, defaults, input fields, validation, persistence, exports other than the new presentation helper, charts, navigation, payback interpretation, or detailed-view values.
- Add no dependencies and avoid unrelated refactoring.

---

### Task 1: Implement and Verify the Live KPI Narrative

**Files:**
- Modify: `dashboards/fleet-electrification-transition/index.html:47-55`
- Modify: `dashboards/fleet-electrification-transition/index.html:300-355`
- Modify: `dashboards/fleet-electrification-transition/index.html:414-435`
- Modify: `dashboards/fleet-electrification-transition/index.html:606-652`
- Modify: `tests/fleet-electrification.test.mjs:90-130`
- Modify: `tests/fleet-electrification.test.mjs:430-470`

**Interfaces:**
- Consumes: the unchanged `calculateScenario(input) -> ScenarioResult` result fields `baselineGridScope2`, `postTransitionGridScope2`, `baselineTotalEmissions`, and `residualBeforeCertificates`.
- Produces: `deriveOverviewKpiStory(result) -> OverviewKpiStory` with this exact shape:

```js
{
  scope2Increase: number,
  scope2Tone: "good" | "warn" | "neutral",
  netEmissionsChange: number,
  netEmissionsMagnitude: number,
  netTone: "good" | "warn" | "neutral",
  netSubline: "Reduction before certificates" | "Increase before certificates" | "No change before certificates",
}
```

- Exports `deriveOverviewKpiStory` through `globalThis.__fleetModel` for dependency-free executable tests.
- The UI script imports `deriveOverviewKpiStory` from `globalThis.__fleetModel` and calls it once per render.

- [ ] **Step 1: Write failing executable tests for live KPI derivation**

Add tests using real sample results and independent synthetic fixtures:

```js
test("overview KPI story derives live Scope 2 and net emissions changes", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const story = model.deriveOverviewKpiStory(result);

  assert.ok(close(story.scope2Increase, 24.552));
  assert.equal(story.scope2Tone, "warn");
  assert.ok(close(story.netEmissionsChange, 21.937536));
  assert.ok(close(story.netEmissionsMagnitude, 21.937536));
  assert.equal(story.netTone, "good");
  assert.equal(story.netSubline, "Reduction before certificates");
});

test("overview KPI story communicates increase and exact-zero states", async () => {
  const { model } = await loadApp();

  const increase = model.deriveOverviewKpiStory({
    baselineGridScope2: 100,
    postTransitionGridScope2: 130,
    baselineTotalEmissions: 150,
    residualBeforeCertificates: 170,
  });
  assert.deepEqual(toHostRecord(increase), {
    scope2Increase: 30,
    scope2Tone: "warn",
    netEmissionsChange: -20,
    netEmissionsMagnitude: 20,
    netTone: "warn",
    netSubline: "Increase before certificates",
  });

  const noChange = model.deriveOverviewKpiStory({
    baselineGridScope2: 100,
    postTransitionGridScope2: 100,
    baselineTotalEmissions: 170,
    residualBeforeCertificates: 170,
  });
  assert.deepEqual(toHostRecord(noChange), {
    scope2Increase: 0,
    scope2Tone: "neutral",
    netEmissionsChange: 0,
    netEmissionsMagnitude: 0,
    netTone: "neutral",
    netSubline: "No change before certificates",
  });
});
```

Name the breaks these tests catch:

- a hard-coded sample value or a helper derived from scenario inputs instead of live model results;
- a negative reduction displayed without clear increase wording;
- a zero result inheriting green or amber styling.

- [ ] **Step 2: Write a failing test for exact card order and detail retention**

Add:

```js
test("overview presents the approved eight-card KPI story in reading order", async () => {
  const { html } = await loadApp();
  const grid = html.match(/<div class="kpi-grid">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(grid, "Overview KPI grid exists");

  const valueIds = [...grid.matchAll(/id="(kpi-[^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(valueIds, [
    "kpi-fleet",
    "kpi-fleet-sub",
    "kpi-scope1",
    "kpi-scope2-increase",
    "kpi-scope2-increase-sub",
    "kpi-residual",
    "kpi-residual-sub",
    "kpi-operating",
    "kpi-payback",
    "kpi-payback-sub",
    "kpi-net-emissions",
    "kpi-net-emissions-sub",
    "kpi-investment",
    "kpi-investment-sub",
  ]);

  assert.doesNotMatch(grid, /BEV electricity added|Additional certificate cost/);
  assert.match(html, /\["BEV electricity added",`\$\{formatNumber\(result\.bevElectricityAdded\)\} kWh`/);
  assert.match(html, /\["Additional certificate cost",formatMoney\(result\.additionalCertificateCost\)/);
});
```

Name the breaks this catches:

- visual CSS reordering without matching DOM reading order;
- accidentally removing electricity or certificate-cost disclosure from the detailed views;
- retaining obsolete Overview element IDs that the renderer can update stalely.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
node --test --test-name-pattern="overview KPI story derives|overview KPI story communicates|approved eight-card KPI story" tests/fleet-electrification.test.mjs
```

Expected: FAIL because `deriveOverviewKpiStory` does not exist and the current card order still contains BEV electricity and certificate cost.

- [ ] **Step 4: Implement the pure presentation helper**

Add immediately after `calculateScenario` or beside the other pure presentation helpers:

```js
function deriveOverviewKpiStory(result) {
  const scope2Increase = result.postTransitionGridScope2 - result.baselineGridScope2;
  const netEmissionsChange = result.baselineTotalEmissions - result.residualBeforeCertificates;
  const netTone = netEmissionsChange > 0
    ? "good"
    : netEmissionsChange < 0
      ? "warn"
      : "neutral";

  return {
    scope2Increase,
    scope2Tone: scope2Increase > 0 ? "warn" : scope2Increase < 0 ? "good" : "neutral",
    netEmissionsChange,
    netEmissionsMagnitude: Math.abs(netEmissionsChange),
    netTone,
    netSubline: netTone === "good"
      ? "Reduction before certificates"
      : netTone === "warn"
        ? "Increase before certificates"
        : "No change before certificates",
  };
}
```

Export it through `globalThis.__fleetModel` and add it to the UI script destructuring assignment. Do not alter `calculateScenario`.

- [ ] **Step 5: Replace and reorder the Overview card markup**

Replace the eight articles inside `.kpi-grid` with this semantic order and IDs:

```html
<article class="kpi"><span class="label">Fleet transition</span><strong class="value" id="kpi-fleet">10 of 10</strong><span class="sub" id="kpi-fleet-sub">100% of fleet transitioned</span></article>
<article class="kpi good"><span class="label">Scope 1 avoided</span><strong class="value" id="kpi-scope1">46.49 tCO2e</strong><span class="sub">Mobile combustion eliminated</span></article>
<article class="kpi warn" id="scope2-card"><span class="label">Scope 2 increase</span><strong class="value" id="kpi-scope2-increase">24.55 tCO2e</strong><span class="sub" id="kpi-scope2-increase-sub">Grid Scope 2: 124.00 to 148.55 tCO2e</span></article>
<article class="kpi good"><span class="label">Residual after certificates</span><strong class="value" id="kpi-residual">0.00 tCO2e</strong><span class="sub" id="kpi-residual-sub">Before certificates: 148.55 tCO2e</span></article>
<article class="kpi good" id="operating-card"><span class="label">Annual operating impact</span><strong class="value" id="kpi-operating">AUD 8,902 savings</strong><span class="sub">Electricity, certificates and avoided fuel</span></article>
<article class="kpi" id="payback-card"><span class="label">Simple payback</span><strong class="value" id="kpi-payback">41.56 years</strong><span class="sub" id="kpi-payback-sub">Based on AUD 8,902 annual savings</span></article>
<article class="kpi good" id="net-emissions-card"><span class="label">Net emissions change</span><strong class="value" id="kpi-net-emissions">21.94 tCO2e</strong><span class="sub" id="kpi-net-emissions-sub">Reduction before certificates</span></article>
<article class="kpi"><span class="label">Net transition investment</span><strong class="value" id="kpi-investment">AUD 370,000</strong><span class="sub" id="kpi-investment-sub">AUD 120,000 vs new ICE purchase</span></article>
```

These initial values match the default scenario to avoid a misleading flash before the synchronous first render.

- [ ] **Step 6: Wire live rendering and card states**

In `render()`, derive once and replace the old electricity and certificate bindings:

```js
const kpiStory = deriveOverviewKpiStory(result);

q("#scope2-card").className = `kpi${kpiStory.scope2Tone === "neutral" ? "" : ` ${kpiStory.scope2Tone}`}`;
q("#kpi-scope2-increase").textContent = formatT(kpiStory.scope2Increase);
q("#kpi-scope2-increase-sub").textContent = `Grid Scope 2: ${formatT(result.baselineGridScope2)} to ${formatT(result.postTransitionGridScope2)}`;

q("#kpi-residual").textContent = formatT(result.residualAfterCertificates);
q("#kpi-residual-sub").textContent = `Before certificates: ${formatT(result.residualBeforeCertificates)}`;

q("#net-emissions-card").className = `kpi${kpiStory.netTone === "neutral" ? "" : ` ${kpiStory.netTone}`}`;
q("#kpi-net-emissions").textContent = formatT(kpiStory.netEmissionsMagnitude);
q("#kpi-net-emissions-sub").textContent = kpiStory.netSubline;
```

Keep the existing live investment bindings, but let their relocated markup establish position eight. Delete all Overview queries for `#kpi-electricity`, `#kpi-electricity-sub`, `#kpi-certificate`, and `#kpi-certificate-sub` so removed elements cannot cause runtime errors.

- [ ] **Step 7: Run focused and full automated verification**

Run:

```powershell
node --test --test-name-pattern="overview KPI story derives|overview KPI story communicates|approved eight-card KPI story" tests/fleet-electrification.test.mjs
node --test tests/fleet-electrification.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git diff --check
```

Expected: all focused tests pass; the full suite reports zero failures; portfolio verification passes; diff check prints no errors.

- [ ] **Step 8: Verify desktop and mobile behavior in Chromium**

At `1440x1000` and `390x844`, reload the local dashboard and exercise these states:

1. Default sample:
   - cards appear in the approved order;
   - Scope 2 increase is `24.55 tCO2e` with `Grid Scope 2: 124.00 to 148.55 tCO2e`;
   - Net emissions change is `21.94 tCO2e`, green, with `Reduction before certificates`;
   - Residual subline says `Before certificates: 148.55 tCO2e`.
2. Change Annual distance per vehicle from `18000` to `20000`:
   - Scope 2 increase updates to `27.28 tCO2e`;
   - Net emissions change updates to approximately `19.21 tCO2e` reduction;
   - no stale value remains after navigating away from and back to Overview.
3. Restore Annual distance to `18000`, then set Grid emission factor to `2`:
   - Scope 2 increase becomes `79.20 tCO2e`;
   - Net emissions change becomes approximately `32.71 tCO2e`;
   - card state is amber and subline is `Increase before certificates`.
4. Set Grid emission factor to `1.1739781818181818`:
   - Net emissions change displays `0.00 tCO2e`;
   - card is neutral and subline is `No change before certificates`.
5. Open Emissions and Cost/payback:
   - BEV electricity added remains visible in Emissions;
   - Additional certificate cost remains visible in Cost/payback.
6. Confirm no horizontal overflow, clipped values, console errors, page errors, incorrect reading order, or color-only direction at either viewport.

- [ ] **Step 9: Run the Taste-informed pre-flight for this targeted dashboard change**

Record pass/fail for the applicable checks only:

- one existing light theme retained;
- one existing emerald accent family retained, with amber reserved for adverse state;
- one existing panel-radius system retained;
- no new elevation, icon, motion, dependency, or visual motif;
- every new visible string is plain, grammatical, and contains no em dash;
- direction is communicated in words as well as color;
- desktop card labels and values fit without unintended wrapping;
- two-column and single-column responsive collapse remain intact;
- no accessibility behavior regressed.

- [ ] **Step 10: Self-review and commit**

Confirm the final diff changes only Overview presentation logic, the exported presentation helper, and covering tests. Confirm `calculateScenario`, defaults, detailed result arrays, validation, persistence, charts, and payback interpretation are unchanged.

```powershell
git diff --check
git status --short
git add -- dashboards/fleet-electrification-transition/index.html tests/fleet-electrification.test.mjs
git commit -m "feat: clarify overview emissions story"
```
