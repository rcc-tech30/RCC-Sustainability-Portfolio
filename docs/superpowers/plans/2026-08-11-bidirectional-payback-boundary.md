# Bidirectional Payback Fleet Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live board explanation report an exact maximum fleet, minimum fleet, or safe non-numeric condition for every valid Distance-based and Fallback scenario.

**Architecture:** Keep `calculateScenario` as the only financial source of truth. Replace the one-direction boundary search with a pure classifier that evaluates the unchanged model at feasible whole-fleet sizes, determines whether annual operating change rises or falls with total fleet, and uses bracketing plus binary search in the correct direction. Extract pure boundary copy so executable tests cover the actual wording used by the renderer.

**Tech Stack:** Self-contained HTML, CSS and vanilla JavaScript; Node.js built-in test runner and VM; PowerShell portfolio verifier; installed Chromium browser verification.

## Global Constraints

- Do not modify any emissions, electricity, certificate, fuel, investment, payback, default, validation, persistence, export, or chart formula.
- `calculateScenario` remains the single source of truth for every candidate fleet evaluation; do not duplicate its formulas in the boundary helper.
- Whole-fleet thresholds are strict: annual operating change must be negative; exactly zero is no payback.
- Support both increasing and decreasing operating-cost relationships without assuming Distance-based and Fallback move in the same direction.
- Do not use an arbitrary fleet search limit. Use JavaScript safe-integer bounds and suppress a numeric threshold if it cannot be established reliably.
- Dynamic board copy must use `textContent`, communicate direction in words, and remain live on every input change.
- Keep the existing rule that threshold copy is hidden when the current scenario already has payback.
- Add no dependencies and avoid unrelated refactoring.

---

### Task 1: Classify and Render Bidirectional Fleet Thresholds

**Files:**
- Modify: `dashboards/fleet-electrification-transition/index.html:235-289`
- Modify: `dashboards/fleet-electrification-transition/index.html:490-513`
- Modify: `tests/fleet-electrification.test.mjs:276-370`

**Interfaces:**
- Consumes: `calculateScenario(input) -> ScenarioResult`, `derivePaybackInterpretation(input, result) -> PaybackInterpretation`, and the existing render cycle.
- Produces: `derivePaybackFleetBoundary(input, result) -> Boundary`, where `Boundary` is one of:
  - `{ kind: "maximum", maxTotalFleet: number, minTotalFleet: null }`
  - `{ kind: "minimum", maxTotalFleet: null, minTotalFleet: number }`
  - `{ kind: "no-finite-boundary" | "no-valid-boundary" | "no-transition" | "no-fuel-cost" | "nonpositive-electricity-change", maxTotalFleet: null, minTotalFleet: null }`
- Produces: `formatPaybackBoundaryMessage(boundary, vehiclesTransitioning, formatValue) -> string`.
- Exports both helpers through `globalThis.__fleetModel` for dependency-free executable tests.

- [ ] **Step 1: Add failing real-model tests for both threshold directions**

Replace the current boundary expectations and add the inverse Fallback fixture using hand-derived values:

```js
test("payback interpretation classifies maximum and minimum whole-fleet thresholds", async () => {
  const { model } = await loadApp();

  const distanceNoPayback = { ...model.DEFAULT_SCENARIO, totalIceVehicles: 15 };
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    distanceNoPayback,
    model.calculateScenario(distanceNoPayback),
  )), { kind: "maximum", maxTotalFleet: 14, minTotalFleet: null });

  const fallbackMaximum = {
    ...model.DEFAULT_SCENARIO,
    bevMethod: "Fallback",
    totalIceVehicles: 20,
  };
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    fallbackMaximum,
    model.calculateScenario(fallbackMaximum),
  )), { kind: "maximum", maxTotalFleet: 15, minTotalFleet: null });

  const fallbackMinimum = {
    ...model.DEFAULT_SCENARIO,
    bevMethod: "Fallback",
    totalIceVehicles: 10,
    currentCertificateCoverage: 1,
    targetCertificateCoverage: 0,
    certificateCostPerKwh: 0.02,
    currentAnnualFuelCost: 5000,
  };
  assert.ok(close(model.calculateScenario({ ...fallbackMinimum, totalIceVehicles: 13 }).annualOperatingChange, 8.974987384620817));
  assert.ok(close(model.calculateScenario({ ...fallbackMinimum, totalIceVehicles: 14 }).annualOperatingChange, -277.38036885714155));
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    fallbackMinimum,
    model.calculateScenario(fallbackMinimum),
  )), { kind: "minimum", maxTotalFleet: null, minTotalFleet: 14 });
});
```

Name the break this catches: reversing certificate coverage can make savings begin at a minimum fleet, so an implementation that assumes savings must exist at the smallest fleet returns the wrong state.

- [ ] **Step 2: Add failing tests for strict, unbounded, and unavailable states**

```js
test("payback fleet boundary preserves strict and non-numeric states", async () => {
  const { model } = await loadApp();

  const exactZero = {
    ...model.DEFAULT_SCENARIO,
    totalIceVehicles: 15,
    currentAnnualFuelCost: 31647,
  };
  assert.ok(close(model.calculateScenario(exactZero).annualOperatingChange, 0));
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    exactZero,
    model.calculateScenario(exactZero),
  )), { kind: "maximum", maxTotalFleet: 14, minTotalFleet: null });

  const fallbackAllSavings = {
    ...model.DEFAULT_SCENARIO,
    bevMethod: "Fallback",
    currentCertificateCoverage: 1,
    targetCertificateCoverage: 0,
    certificateCostPerKwh: 0.02,
  };
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    fallbackAllSavings,
    model.calculateScenario(fallbackAllSavings),
  )), { kind: "no-finite-boundary", maxTotalFleet: null, minTotalFleet: null });

  const noValidFleet = { ...model.DEFAULT_SCENARIO, currentAnnualFuelCost: 1000 };
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    noValidFleet,
    model.calculateScenario(noValidFleet),
  )), { kind: "no-valid-boundary", maxTotalFleet: null, minTotalFleet: null });
});
```

Keep executable coverage for `no-transition`, `no-fuel-cost`, and `nonpositive-electricity-change`, updating their expected object shape to include both numeric fields as `null`.

- [ ] **Step 3: Add failing executable tests for the actual boundary copy**

```js
test("payback boundary copy states maximum and minimum direction in words", async () => {
  const { model } = await loadApp();
  const formatValue = value => String(value);

  assert.equal(
    model.formatPaybackBoundaryMessage(
      { kind: "maximum", maxTotalFleet: 14, minTotalFleet: null },
      10,
      formatValue,
    ),
    "With 10 vehicles transitioning, annual savings require a total fleet of 14 vehicles or fewer, holding other assumptions constant.",
  );
  assert.equal(
    model.formatPaybackBoundaryMessage(
      { kind: "minimum", maxTotalFleet: null, minTotalFleet: 14 },
      10,
      formatValue,
    ),
    "With 10 vehicles transitioning, annual savings require a total fleet of 14 vehicles or more, holding other assumptions constant.",
  );
});
```

Name the break this catches: the model can classify a minimum correctly while the renderer still says `or fewer`.

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
node --test --test-name-pattern="payback interpretation classifies|payback fleet boundary preserves|payback boundary copy states" tests/fleet-electrification.test.mjs
```

Expected: FAIL because `derivePaybackFleetBoundary` and `formatPaybackBoundaryMessage` do not exist and the current inverse scenario returns `no-valid-boundary`.

- [ ] **Step 5: Implement the pure bidirectional classifier**

Add `derivePaybackFleetBoundary` before `derivePaybackInterpretation`. Use this structure and keep every candidate evaluation delegated to `calculateScenario`:

```js
function derivePaybackFleetBoundary(input, result) {
  const s = { ...DEFAULT_SCENARIO, ...input };
  const vehiclesTransitioning = result.vehiclesTransitioning;
  const empty = kind => ({ kind, maxTotalFleet: null, minTotalFleet: null });
  if (!(vehiclesTransitioning > 0)) return empty("no-transition");
  if (!(s.currentAnnualFuelCost > 0)) return empty("no-fuel-cost");
  if (!(result.electricityCostChange > 0)) return empty("nonpositive-electricity-change");

  const minimumFleet = Math.ceil(vehiclesTransitioning);
  if (!Number.isSafeInteger(minimumFleet)) return empty("no-valid-boundary");
  const annualChange = totalIceVehicles => calculateScenario({
    ...s,
    totalIceVehicles,
  }).annualOperatingChange;
  const hasSavings = totalIceVehicles => annualChange(totalIceVehicles) < 0;
  const firstChange = annualChange(minimumFleet);
  const secondChange = annualChange(minimumFleet + 1);
  const scale = Math.max(1, Math.abs(firstChange), Math.abs(secondChange));
  const tolerance = Number.EPSILON * scale * 32;
  const direction = secondChange - firstChange > tolerance
    ? "increasing"
    : secondChange - firstChange < -tolerance
      ? "decreasing"
      : "flat";

  // Increasing: savings can end at one strict maximum.
  // Decreasing: savings can begin at one strict minimum.
  // Flat: every feasible fleet saves or none does.
  // Bracket toward Number.MAX_SAFE_INTEGER, then binary-search the first
  // integer on the opposite side. If no reliable bracket exists, return
  // the appropriate non-numeric state rather than a guessed threshold.
}
```

Use a local safe growth helper that returns `Number.MAX_SAFE_INTEGER` instead of overflowing. Binary search invariants must be explicit:

- maximum search: `lower` has savings; `upper` does not; return `lower`;
- minimum search: `lower` does not have savings; `upper` does; return `upper`.

Return the exact object shapes declared under Interfaces. Update `derivePaybackInterpretation` to set `boundary: derivePaybackFleetBoundary(s, result)` and leave all other returned fields unchanged.

- [ ] **Step 6: Implement pure copy and connect the existing renderer**

Add:

```js
function formatPaybackBoundaryMessage(boundary, vehiclesTransitioning, formatValue) {
  if (boundary.kind === "maximum") {
    return `With ${formatValue(vehiclesTransitioning)} vehicles transitioning, annual savings require a total fleet of ${formatValue(boundary.maxTotalFleet)} vehicles or fewer, holding other assumptions constant.`;
  }
  if (boundary.kind === "minimum") {
    return `With ${formatValue(vehiclesTransitioning)} vehicles transitioning, annual savings require a total fleet of ${formatValue(boundary.minTotalFleet)} vehicles or more, holding other assumptions constant.`;
  }
  const messages = {
    "no-transition": "A fleet boundary cannot be calculated until at least one vehicle is transitioning.",
    "no-fuel-cost": "A fleet boundary cannot be calculated until current annual fleet fuel cost is greater than zero.",
    "nonpositive-electricity-change": "No upper fleet boundary is shown because the electricity and certificate cost change is zero or lower.",
    "no-valid-boundary": "No feasible total-fleet size produces annual savings with the current vehicles transitioning and cost assumptions.",
    "no-finite-boundary": "No maximum total-fleet threshold applies under these assumptions; modelled annual savings continue as total fleet grows.",
  };
  return messages[boundary.kind] || "A reliable fleet threshold cannot be shown under the current assumptions.";
}
```

In `renderPaybackInterpretation`, replace the inline `boundaryMessages` and finite-only ternary with:

```js
q("#payback-boundary").textContent = formatPaybackBoundaryMessage(
  interpretation.boundary,
  interpretation.vehiclesTransitioning,
  formatNumber,
);
q("#payback-boundary").hidden = interpretation.hasPayback;
```

Export the two new helpers alongside the existing model exports.

- [ ] **Step 7: Run focused and full automated verification**

Run:

```powershell
node --test --test-name-pattern="payback interpretation classifies|payback fleet boundary preserves|payback boundary copy states" tests/fleet-electrification.test.mjs
node --test tests/fleet-electrification.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git diff --check
```

Expected: all focused and full tests pass; portfolio verifier passes; diff check prints no errors.

- [ ] **Step 8: Verify live desktop and mobile behavior**

At `1440x1000` and `390x844`, reload the local dashboard and exercise:

1. Distance-based total fleet 15: no payback and `14 vehicles or fewer`.
2. Default Fallback total fleet 20: no payback and `15 vehicles or fewer`.
3. Inverse Fallback fixture at total fleet 10: no payback and `14 vehicles or more`.
4. Change only inverse total fleet to 14: numeric payback; threshold line hides without stale copy.
5. Confirm the Board interpretation remains below both graphs, no horizontal overflow appears, and the console has no warnings or errors.

- [ ] **Step 9: Self-review and commit**

Confirm the diff changes only the threshold classifier, its pure copy, exports, and covering tests. Confirm no financial calculation or default changed.

```powershell
git diff --check
git status --short
git add -- dashboards/fleet-electrification-transition/index.html tests/fleet-electrification.test.mjs
git commit -m "fix: classify bidirectional payback thresholds"
```
