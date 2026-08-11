# Board Payback Interpretation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Overview explain live payback outcomes and break-even fleet conditions in board-ready language, with critical errors above KPIs and explanatory notes below the graphs.

**Architecture:** Add one pure interpretation function beside the existing calculation model. It derives payback status, cost direction, and a strict whole-number fleet boundary from the unchanged scenario result. The existing render cycle consumes that data to update a concise KPI and a semantic Board interpretation section, while message severity determines top-versus-bottom placement.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, Node.js built-in test runner, existing PowerShell portfolio verifier, Chromium browser verification.

## Global Constraints

- Do not change `DEFAULT_SCENARIO`, `calculateScenario()`, `validateScenario()`, financial formulas, scenario values, persistence, exports, charts, or non-Overview views.
- Keep the assessment self-contained with no external scripts, stylesheets, fonts, packages, or network calls.
- Payback remains available only when `annualOperatingChange < 0`; no maximum acceptable payback period is introduced.
- When payback exists, the card subline is exactly `Based on [currency] [annual savings] annual savings`.
- When annual cost increases, the card subline is exactly `Annual operating cost increases by [currency] [amount]`.
- When annual operating change is zero, the card subline is exactly `No annual operating savings`.
- The fleet boundary holds Vehicles transitioning and all financial and energy assumptions constant.
- The largest whole-number fleet with positive savings is the largest integer strictly below `current annual fuel cost × vehicles transitioning / electricity cost change`.
- Do not show a numeric fleet boundary for no-transition, zero-fuel-cost, nonpositive-electricity-change, or no-valid-boundary cases.
- Only validation errors render above KPIs; non-blocking warnings and all decision notes render after the graphs.
- Avoid duplicate generic no-payback warnings in the bottom notes because the live explanation replaces them.
- The simple-payback limitation remains visible below the graphs.
- All dynamic explanation content must be assigned through `textContent`, not interpolated into HTML.
- Desktop and mobile views must remain readable without page overflow or console errors.

## File Structure

- Modify `dashboards/fleet-electrification-transition/index.html`: add the interpretation model export, Board interpretation markup and styles, severity routing, live KPI copy, and live explanatory text.
- Modify `tests/fleet-electrification.test.mjs`: add exact boundary and edge-case tests plus Overview structure/wiring regressions.
- Modify `dashboards/fleet-electrification-transition/README.md`: explain the live board interpretation and strict break-even boundary.

---

### Task 1: Tested Payback Interpretation Model

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:168-348`

**Interfaces:**
- Produces: `largestIntegerBelow(value: number): number | null`
- Produces: `derivePaybackInterpretation(input, result): { hasPayback: boolean, annualSavings: number, annualCostIncrease: number, operatingChangeIsZero: boolean, boundary: { kind: string, maxTotalFleet: number | null }, fuelCostAvoided: number, electricityCostChange: number, transitionInvestment: number, incrementalInvestment: number, simplePaybackTransition: number | null, simplePaybackIncremental: number | null, vehiclesTransitioning: number }`
- Extends: `globalThis.__fleetModel` with `largestIntegerBelow` and `derivePaybackInterpretation`.

- [ ] **Step 1: Write failing interpretation tests**

Append:

```js
test("payback interpretation exposes the live fleet boundary", async () => {
  const { model } = await loadApp();
  const defaultResult = model.calculateScenario(model.DEFAULT_SCENARIO);
  const available = model.derivePaybackInterpretation(model.DEFAULT_SCENARIO, defaultResult);
  assert.equal(available.hasPayback, true);
  assert.ok(close(available.annualSavings, 8902));
  assert.equal(available.annualCostIncrease, 0);
  assert.deepEqual(toHostRecord(available.boundary), { kind: "finite", maxTotalFleet: 14 });

  const fifteenVehicles = { ...model.DEFAULT_SCENARIO, totalIceVehicles: 15 };
  const noPaybackResult = model.calculateScenario(fifteenVehicles);
  const unavailable = model.derivePaybackInterpretation(fifteenVehicles, noPaybackResult);
  assert.equal(unavailable.hasPayback, false);
  assert.ok(close(unavailable.annualCostIncrease, 1098));
  assert.deepEqual(toHostRecord(unavailable.boundary), { kind: "finite", maxTotalFleet: 14 });
});

test("fleet boundary remains strict at exact whole numbers", async () => {
  const { model } = await loadApp();
  assert.equal(model.largestIntegerBelow(15), 14);
  assert.equal(model.largestIntegerBelow(15.000000000000002), 14);
  assert.equal(model.largestIntegerBelow(14.2), 14);
  assert.equal(model.largestIntegerBelow(Number.POSITIVE_INFINITY), null);
});

test("payback interpretation identifies uncomputable fleet boundaries", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const cases = [
    [{ ...model.DEFAULT_SCENARIO, vehiclesTransitioning: 0 }, { ...result, vehiclesTransitioning: 0 }, "no-transition"],
    [{ ...model.DEFAULT_SCENARIO, currentAnnualFuelCost: 0 }, result, "no-fuel-cost"],
    [model.DEFAULT_SCENARIO, { ...result, electricityCostChange: 0 }, "nonpositive-electricity-change"],
    [{ ...model.DEFAULT_SCENARIO, currentAnnualFuelCost: 1000 }, { ...result, electricityCostChange: 2000 }, "no-valid-boundary"],
  ];
  for (const [scenario, scenarioResult, kind] of cases) {
    const interpretation = model.derivePaybackInterpretation(scenario, scenarioResult);
    assert.deepEqual(toHostRecord(interpretation.boundary), { kind, maxTotalFleet: null });
  }
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test --test-name-pattern="payback interpretation|fleet boundary" tests/fleet-electrification.test.mjs
```

Expected: FAIL because the new functions are not exported.

- [ ] **Step 3: Implement the strict integer helper and interpretation model**

Add inside `<script data-fleet-model>` after the existing small presentation helpers:

```js
function largestIntegerBelow(value) {
  if (!Number.isFinite(value)) return null;
  const nearestInteger = Math.round(value);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 16;
  return Math.abs(value - nearestInteger) <= tolerance
    ? nearestInteger - 1
    : Math.floor(value);
}

function derivePaybackInterpretation(input, result) {
  const s = { ...DEFAULT_SCENARIO, ...input };
  const vehiclesTransitioning = result.vehiclesTransitioning;
  let boundary;
  if (!(vehiclesTransitioning > 0)) {
    boundary = { kind: "no-transition", maxTotalFleet: null };
  } else if (!(s.currentAnnualFuelCost > 0)) {
    boundary = { kind: "no-fuel-cost", maxTotalFleet: null };
  } else if (!(result.electricityCostChange > 0)) {
    boundary = { kind: "nonpositive-electricity-change", maxTotalFleet: null };
  } else {
    const rawBoundary = s.currentAnnualFuelCost * vehiclesTransitioning / result.electricityCostChange;
    const maxTotalFleet = largestIntegerBelow(rawBoundary);
    boundary = maxTotalFleet < vehiclesTransitioning
      ? { kind: "no-valid-boundary", maxTotalFleet: null }
      : { kind: "finite", maxTotalFleet };
  }
  return {
    hasPayback: result.simplePaybackTransition !== null,
    annualSavings: result.annualOperatingChange < 0 ? Math.abs(result.annualOperatingChange) : 0,
    annualCostIncrease: result.annualOperatingChange > 0 ? result.annualOperatingChange : 0,
    operatingChangeIsZero: result.annualOperatingChange === 0,
    boundary,
    fuelCostAvoided: result.fuelCostAvoided,
    electricityCostChange: result.electricityCostChange,
    transitionInvestment: result.transitionInvestment,
    incrementalInvestment: result.incrementalInvestment,
    simplePaybackTransition: result.simplePaybackTransition,
    simplePaybackIncremental: result.simplePaybackIncremental,
    vehiclesTransitioning,
  };
}
```

Export both functions through `globalThis.__fleetModel` without removing existing exports.

- [ ] **Step 4: Run focused and full tests**

Run:

```powershell
node --test --test-name-pattern="payback interpretation|fleet boundary" tests/fleet-electrification.test.mjs
node --test tests/fleet-electrification.test.mjs
```

Expected: 3 focused tests pass; the full suite reports 22 tests passing and zero failures.

- [ ] **Step 5: Commit the interpretation model**

```powershell
git add -- tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "feat: derive live payback interpretation"
```

---

### Task 2: Board-Ready Overview Presentation

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:10-61,348-540`
- Modify: `dashboards/fleet-electrification-transition/README.md`

**Interfaces:**
- Consumes: `derivePaybackInterpretation(scenario, result)` from Task 1.
- Produces: `#board-interpretation`, `#payback-explanation`, `#payback-boundary`, `#overview-warning-list`, and `#payback-limitation`.
- Produces: `renderPaybackInterpretation(interpretation, warnings): void`.

- [ ] **Step 1: Write failing Overview structure and wiring tests**

Append:

```js
test("overview places board interpretation after graphs and errors before KPIs", async () => {
  const { html } = await loadApp();
  const chartMarkup = '<div class="chart-grid">';
  const notesMarkup = '<section class="board-interpretation" id="board-interpretation"';
  assert.ok(html.indexOf(notesMarkup) > html.indexOf(chartMarkup));
  assert.match(html, /id="warning-stack"[^>]*aria-label="Input errors"[^>]*aria-live="assertive"/);
  assert.match(html, /id="board-interpretation"[^>]*aria-labelledby="board-interpretation-title"/);
  assert.match(html, /id="payback-explanation"/);
  assert.match(html, /id="payback-boundary"/);
  assert.match(html, /id="overview-warning-list"/);
  assert.match(html, /id="payback-limitation"/);
  assert.match(html, /const errors = messages\.filter\(message => message\.severity === "error"\)/);
  assert.match(html, /const warnings = messages\.filter\(message => message\.severity === "warning"/);
});

test("overview payback explanation uses live interpretation values", async () => {
  const { html } = await loadApp();
  assert.match(html, /const payback = derivePaybackInterpretation\(scenario, result\)/);
  assert.match(html, /function renderPaybackInterpretation\(interpretation, warnings\)/);
  assert.match(html, /q\("#payback-explanation"\)\.textContent =/);
  assert.match(html, /q\("#payback-boundary"\)\.textContent =/);
  assert.match(html, /Based on \$\{formatMoney\(interpretation\.annualSavings\)\} annual savings/);
  assert.match(html, /Annual operating cost increases by \$\{formatMoney\(interpretation\.annualCostIncrease\)\}/);
  assert.match(html, /holding other assumptions constant/);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test --test-name-pattern="board interpretation|payback explanation" tests/fleet-electrification.test.mjs
```

Expected: FAIL because the new section and render function do not exist.

- [ ] **Step 3: Add semantic Board interpretation markup after the graphs**

Immediately after the closing `.chart-grid` element in the Overview, add:

```html
<section class="board-interpretation" id="board-interpretation" aria-labelledby="board-interpretation-title">
  <div class="board-interpretation-heading"><p class="eyebrow">Decision support</p><h2 id="board-interpretation-title">Board interpretation</h2></div>
  <div class="board-note"><strong>Payback outlook</strong><p id="payback-explanation"></p><p id="payback-boundary"></p></div>
  <div class="board-note" id="overview-warning-note" hidden><strong>Scenario warnings</strong><ul id="overview-warning-list"></ul></div>
  <div class="board-note"><strong>Important limitation</strong><p id="payback-limitation">Simple payback excludes maintenance, financing, tax, depreciation, battery replacement and time value of money.</p></div>
</section>
```

Change the top message region to:

```html
<div id="warning-stack" class="warning-stack" aria-label="Input errors" aria-live="assertive"></div>
```

- [ ] **Step 4: Style notes as a low-elevation reading section**

Add:

```css
.board-interpretation{margin-top:26px;padding-top:24px;border-top:1px solid var(--line)}
.board-interpretation-heading{margin-bottom:8px}.board-interpretation-heading h2{margin:0;color:var(--navy);font-size:20px;letter-spacing:-.025em}
.board-note{display:grid;grid-template-columns:minmax(150px,.25fr) minmax(0,1fr);gap:10px 24px;padding:16px 0;border-bottom:1px solid var(--line)}
.board-note:last-child{border-bottom:0}.board-note strong{color:var(--navy);font-size:12px}.board-note p{margin:0;color:var(--muted);font-size:13px;line-height:1.55}.board-note p+p{grid-column:2}.board-note ul{grid-column:2;margin:0;padding-left:18px;color:var(--muted);font-size:13px;line-height:1.55}
```

At the 640px breakpoint, add:

```css
.board-note{grid-template-columns:1fr;gap:7px}.board-note p+p,.board-note ul{grid-column:1}
```

- [ ] **Step 5: Implement live explanation rendering**

Add `derivePaybackInterpretation` to the model destructuring in the UI closure.

After the formatting helpers, add:

```js
function renderPaybackInterpretation(interpretation, warnings) {
  const card = q("#payback-card");
  card.className = `kpi${interpretation.hasPayback ? "" : " warn"}`;
  q("#kpi-payback").textContent = interpretation.hasPayback
    ? `${formatNumber(interpretation.simplePaybackTransition, 2)} years`
    : "No payback";
  q("#kpi-payback-sub").textContent = interpretation.hasPayback
    ? `Based on ${formatMoney(interpretation.annualSavings)} annual savings`
    : interpretation.operatingChangeIsZero
      ? "No annual operating savings"
      : `Annual operating cost increases by ${formatMoney(interpretation.annualCostIncrease)}`;

  q("#payback-explanation").textContent = interpretation.hasPayback
    ? `Transition investment of ${formatMoney(interpretation.transitionInvestment)} divided by ${formatMoney(interpretation.annualSavings)} annual operating savings produces a ${formatNumber(interpretation.simplePaybackTransition, 2)}-year simple payback. Incremental payback versus planned replacement ICE vehicles is ${formatNumber(interpretation.simplePaybackIncremental, 2)} years.`
    : interpretation.operatingChangeIsZero
      ? `Fuel savings of ${formatMoney(interpretation.fuelCostAvoided)} exactly equal the ${formatMoney(interpretation.electricityCostChange)} electricity and certificate increase, leaving no annual operating savings.`
      : `Fuel savings of ${formatMoney(interpretation.fuelCostAvoided)} do not cover the ${formatMoney(interpretation.electricityCostChange)} electricity and certificate increase, resulting in a ${formatMoney(interpretation.annualCostIncrease)} annual operating cost increase.`;

  const boundaryMessages = {
    "no-transition": "A fleet boundary cannot be calculated until at least one vehicle is transitioning.",
    "no-fuel-cost": "A fleet boundary cannot be calculated until current annual fleet fuel cost is greater than zero.",
    "nonpositive-electricity-change": "No upper fleet boundary is shown because the electricity and certificate cost change is zero or lower.",
    "no-valid-boundary": "No valid total-fleet size produces annual savings with the current vehicles transitioning and cost assumptions.",
  };
  const boundary = interpretation.boundary;
  q("#payback-boundary").textContent = interpretation.hasPayback
    ? ""
    : boundary.kind === "finite"
      ? `With ${formatNumber(interpretation.vehiclesTransitioning)} vehicles transitioning, annual savings require a total fleet of ${formatNumber(boundary.maxTotalFleet)} vehicles or fewer, holding other assumptions constant.`
      : boundaryMessages[boundary.kind];
  q("#payback-boundary").hidden = interpretation.hasPayback;

  const warningList = q("#overview-warning-list");
  warningList.replaceChildren(...warnings.map(message => {
    const item = document.createElement("li");
    item.textContent = message.text;
    return item;
  }));
  q("#overview-warning-note").hidden = warnings.length === 0;
}
```

- [ ] **Step 6: Route severity and connect the render cycle**

Replace the top warning rendering with:

```js
const errors = messages.filter(message => message.severity === "error");
const warnings = messages.filter(message => message.severity === "warning" && message.text !== "No payback under current assumptions.");
q("#warning-stack").innerHTML = errors.map(message => `<div class="alert error">${escapeHtml(message.text)}</div>`).join("");
q("#warning-stack").hidden = errors.length === 0;
```

Immediately after the severity-routing block has defined `errors` and `warnings`, derive and render:

```js
const payback = derivePaybackInterpretation(scenario, result);
renderPaybackInterpretation(payback, warnings);
```

Remove the old direct assignments to `#kpi-payback` and `#kpi-payback-sub`. Do not change the cost-detail view's calculation table or interpretation.

- [ ] **Step 7: Run focused and full automated verification**

Run:

```powershell
node --test --test-name-pattern="board interpretation|payback explanation" tests/fleet-electrification.test.mjs
node --test tests/fleet-electrification.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git diff --check
```

Expected: 2 focused tests pass; the full suite reports 24 tests passing; the portfolio verifier prints `Portfolio verification passed.`; diff check reports no errors.

- [ ] **Step 8: Document the board interpretation**

Add to the assessment README:

```markdown
## Board interpretation

The Overview keeps critical input errors above the KPIs and places explanatory notes below the graphs. Its payback card and Board interpretation update from the current scenario, including annual savings or cost increase and a strict whole-number fleet boundary where that boundary is meaningful.

The boundary holds Vehicles transitioning and every financial and energy assumption constant. It is decision support, not a permanent fleet rule.
```

- [ ] **Step 9: Verify the complete flow in a browser**

At 1440 by 1000 and 390 by 844, verify these live scenarios without reload:

```text
Default: 41.56 years; Based on AUD 8,902 annual savings; notes below graphs; no top warnings.
Total fleet 14: numeric payback remains; live annual-savings subline and calculation note update.
Total fleet 15: No payback; AUD 1,098 annual increase; AUD 20,000 avoided vs AUD 21,098 increase; boundary 14 or fewer.
Exact zero savings using Current fleet fuel cost `21098`: No payback; No annual operating savings; explanation says the two amounts exactly equal.
Vehicles transitioning 0: no numeric boundary; note names the no-transition condition.
Current fleet fuel cost 0: no numeric boundary; note names the missing fuel-cost condition.
Invalid vehicles transitioning > total fleet: critical error appears above KPIs and not in bottom warnings.
User Data with the sample grid factor: warning appears only in Board interpretation below graphs.
Simple-payback limitation remains below graphs.
All dynamic values update immediately.
No horizontal page overflow or console/page errors.
```

Confirm the Cost and payback view retains its existing table and limitation callout.

- [ ] **Step 10: Commit the board presentation**

```powershell
git add -- tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html dashboards/fleet-electrification-transition/README.md
git commit -m "feat: explain live payback outcomes"
```

- [ ] **Step 11: Review final branch scope**

Run:

```powershell
git status -sb
git diff --stat main...HEAD
git log --oneline main..HEAD
```

Expected: only the approved spec, plan, assessment HTML, tests, and assessment README are changed; the tracked working tree is clean.
