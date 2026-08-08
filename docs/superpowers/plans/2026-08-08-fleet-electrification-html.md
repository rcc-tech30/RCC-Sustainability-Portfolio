# Fleet Electrification HTML Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a professional, self-contained fleet-electrification assessment whose calculations match the supplied Excel workbook and whose live route is discoverable from the portfolio landing page.

**Architecture:** Keep the production application in one dependency-free HTML file, matching the repository convention. Isolate the scenario constants, pure calculation function, validation function, state persistence, rendering, and event wiring inside named JavaScript modules within that file so calculation tests can extract and execute the same production code. Use a PowerShell verifier for repository policy and a Node test script for numerical parity and HTML structure.

**Tech Stack:** HTML5, native CSS, vanilla JavaScript, inline SVG, Node.js test runner, PowerShell, GitHub Pages

## Global Constraints

- Work on branch `feat/fleet-electrification-html`.
- Production app path is `dashboards/fleet-electrification-transition/index.html`.
- The production app must be a single HTML file with no CDN, package, build step, account, or server dependency.
- Preserve the workbook's sample scenario, formulas, warnings, method notes, factors, sources, and disclosure boundaries.
- Do not modify `dashboards/company-x-ghg/index.html` or its stable URL.
- Replace the root redirect with a portfolio gallery while preserving both project URLs.
- Use a light theme, deep navy structure, cool neutral surfaces, one emerald accent, 12 px panels, 8 px inputs, and pills only for status labels.
- Use orange only for warnings or cost increases and red only for blocking errors.
- Support keyboard navigation, visible focus, semantic labels, reduced motion, accessible chart summaries, and responsive layouts.
- Never present unavailable payback as zero or infinity.
- Do not claim formal compliance, assurance, certification, client deployment, or investment advice.
- Keep Scope 3 well-to-tank factors excluded and report certificate-adjusted Scope 2 separately from grid-based Scope 2.

---

## File map

- `dashboards/fleet-electrification-transition/index.html`: self-contained application, calculation engine, validation, state, views, charts, styles, and disclosures.
- `dashboards/fleet-electrification-transition/README.md`: live link, capabilities, methodology boundary, usage, and disclosure.
- `tests/fleet-electrification.test.mjs`: extracts production JavaScript, checks sample parity, edge cases, persistence schema, HTML semantics, and forbidden dependencies.
- `index.html`: dependency-free two-project portfolio gallery.
- `README.md`: recruiter-facing entry for the new project.
- `scripts/verify-portfolio.ps1`: repository structure, disclosure, link, and secret checks for both projects.

---

### Task 1: Calculation contract and failing parity tests

**Files:**
- Create: `tests/fleet-electrification.test.mjs`
- Create: `dashboards/fleet-electrification-transition/index.html`

**Interfaces:**
- Consumes: workbook sample outputs documented in the approved specification.
- Produces: `DEFAULT_SCENARIO`, `calculateScenario(input)`, and `validateScenario(input)` exported to `globalThis.__fleetModel` for tests.

- [ ] **Step 1: Add a minimal HTML shell with an empty production model contract**

Create a valid document containing this exact test-facing boundary inside the application script:

```js
const DEFAULT_SCENARIO = Object.freeze({});
function calculateScenario(input) { throw new Error("not implemented"); }
function validateScenario(input) { return []; }
globalThis.__fleetModel = { DEFAULT_SCENARIO, calculateScenario, validateScenario };
```

- [ ] **Step 2: Write the model extractor and sample parity assertions**

In `tests/fleet-electrification.test.mjs`, read the HTML, extract the script marked `data-fleet-model`, execute it in a `vm` context, and assert:

```js
assert.equal(result.vehiclesTransitioning, 10);
assert.ok(close(result.scope1Avoided, 46.489536));
assert.ok(close(result.bevElectricityAdded, 39600));
assert.ok(close(result.postTransitionGridScope2, 148.552));
assert.ok(close(result.additionalCertificateCost, 13178));
assert.ok(close(result.annualOperatingChange, -8902));
assert.ok(close(result.transitionInvestment, 370000));
assert.ok(close(result.simplePaybackTransition, 41.56369355201078));
assert.ok(close(result.residualAfterCertificates, 0));
```

Use `close(actual, expected, tolerance = 1e-6)` and emit a nonzero process exit through `node:test` on failure.

- [ ] **Step 3: Run the test and confirm the red state**

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: FAIL because `DEFAULT_SCENARIO` is empty and `calculateScenario` throws `not implemented`.

- [ ] **Step 4: Commit the explicit red test**

```powershell
git add tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "test: define fleet assessment parity contract"
```

---

### Task 2: Implement workbook-parity calculations and validation

**Files:**
- Modify: `dashboards/fleet-electrification-transition/index.html`
- Modify: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: normalized numeric and categorical fields from `DEFAULT_SCENARIO`.
- Produces: `calculateScenario(input): CalculatedScenario` and `validateScenario(input): ValidationMessage[]`, where each message is `{ field, severity, text }`.

- [ ] **Step 1: Populate the complete sample scenario**

Add every workbook input needed for general, fleet, energy, BEV, capital, operating, factor, and certificate calculations. Use numeric fractions for percentages and retain `dataStatus: "Sample Data"`, `bevMethod: "Distance-based"`, and `currencyCode: "AUD"`.

- [ ] **Step 2: Implement pure calculation helpers**

Implement and use:

```js
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeDivide = (numerator, denominator) => denominator > 0 ? numerator / denominator : null;
const toTco2e = kilograms => kilograms / 1000;
```

Return named outputs for fleet transition, fuel energy, Scope 1, both BEV methods, purchased electricity, both Scope 2 presentations, certificate costs, procurement costs, both investment bases, operating change, both payback bases, and residual emissions.

- [ ] **Step 3: Implement validation rules with field ownership**

Return blocking errors for invalid fleet count, over-transition, unsupported method, method-specific missing inputs, missing electricity assumptions, invalid certificate coverage, and negative costs. Return warnings for unavailable payback and sample factors paired with `User Data`.

- [ ] **Step 4: Add edge-case tests**

Test these exact cases:

```js
assert.equal(calculateScenario({...sample, targetCertificateCoverage: 0}).scope2AfterEac, 148.552);
assert.equal(calculateScenario({...sample, vehiclesTransitioning: 5}).transitionPct, 0.5);
assert.equal(calculateScenario({...sample, currentAnnualFuelCost: 0}).simplePaybackTransition, null);
assert.ok(validateScenario({...sample, totalIceVehicles: 0}).some(x => x.severity === "error"));
assert.ok(validateScenario({...sample, vehiclesTransitioning: 11}).some(x => x.field === "vehiclesTransitioning"));
```

- [ ] **Step 5: Run tests and require green**

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: PASS for sample parity and all edge cases.

- [ ] **Step 6: Commit the calculation engine**

```powershell
git add dashboards/fleet-electrification-transition/index.html tests/fleet-electrification.test.mjs
git commit -m "feat: implement fleet assessment calculations"
```

---

### Task 3: Build the professional responsive application

**Files:**
- Modify: `dashboards/fleet-electrification-transition/index.html`
- Modify: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: `DEFAULT_SCENARIO`, `calculateScenario`, and `validateScenario` from Task 2.
- Produces: hash-addressable views `overview`, `inputs`, `emissions`, `costs`, and `methodology`; form-to-state updates; KPI and chart renderers.

- [ ] **Step 1: Add failing structural and accessibility assertions**

Assert the HTML contains one `main`, a skip link, five view controls, `aria-live`, labelled inputs, two accessible chart summaries, the sample-data disclosure, and `@media (prefers-reduced-motion: reduce)`. Assert there is no `<script src=`, `<link rel="stylesheet"`, `http://`, or `https://` outside visible source and LinkedIn text.

- [ ] **Step 2: Build the application shell and navigation**

Create a fixed desktop rail and mobile header using semantic buttons or links. Keep desktop navigation on one line per item, expose the active view with `aria-current`, and render one view at a time without removing meaningful browser history.

- [ ] **Step 3: Build reusable metric, field, warning, and disclosure patterns**

Use navy headings, cool neutral panels, emerald favorable results, orange warning results, and red blocking states. Apply tabular numerals to all results. Associate inline field errors using `aria-describedby`.

- [ ] **Step 4: Build all five views**

Render the exact view content from the design specification. Inputs must cover every calculation field. Methodology must show the DCCEEW 2025 Table 9 reference, example petrol and diesel factors, GJ-to-kWh conversion, simplified certificate treatment, Scope 3 exclusion, and replacement guidance.

- [ ] **Step 5: Build dependency-free charts**

Generate the emissions pathway and operating-cost comparison as inline SVG. Include visible values, axes or baselines where helpful, units, legends, and adjacent HTML summaries. Recalculate chart scales from the current scenario and handle zero values without invalid SVG dimensions.

- [ ] **Step 6: Add responsive and reduced-motion behavior**

At widths below 900 px, move navigation to the top and collapse two-column regions. At widths below 640 px, use one-column KPI and input flows and preserve 44 px control targets. Disable nonessential transitions under reduced motion.

- [ ] **Step 7: Run tests and inspect static output**

Run: `node --test tests/fleet-electrification.test.mjs`

Run: `rg -n "Sample data|illustrative|DCCEEW|Scope 3|investment advice|prefers-reduced-motion" dashboards/fleet-electrification-transition/index.html`

Expected: tests pass and every required disclosure or accessibility marker is found.

- [ ] **Step 8: Commit the application interface**

```powershell
git add dashboards/fleet-electrification-transition/index.html tests/fleet-electrification.test.mjs
git commit -m "feat: build fleet electrification web assessment"
```

---

### Task 4: Add scenario persistence, export, reset, and print

**Files:**
- Modify: `dashboards/fleet-electrification-transition/index.html`
- Modify: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: current normalized scenario and calculated result.
- Produces: `serializeScenario`, `parseStoredScenario`, save/reset handlers, JSON export, and print action.

- [ ] **Step 1: Write failing persistence-schema tests**

Assert the serialized payload is `{ version: 1, scenario }`, valid data round-trips, malformed JSON returns `null`, and unsupported versions return `null`.

- [ ] **Step 2: Implement safe local persistence**

Use key `rcc.fleet-electrification.scenario.v1`. Wrap storage reads and writes in `try/catch`. Validate restored values through the same normalization and validation path as form input. Announce success or fallback through the live region.

- [ ] **Step 3: Implement reset, JSON export, and print**

Reset must require a lightweight confirmation and restore a cloned `DEFAULT_SCENARIO`. Export a Blob containing version, timestamp, scenario, calculated outputs, and warnings. Revoke the object URL after download. Print calls `window.print()` and uses print CSS that hides controls while retaining assumptions, results, methodology, and disclosures.

- [ ] **Step 4: Run tests**

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: all model, structure, and persistence tests pass.

- [ ] **Step 5: Commit scenario controls**

```powershell
git add dashboards/fleet-electrification-transition/index.html tests/fleet-electrification.test.mjs
git commit -m "feat: add fleet scenario controls"
```

---

### Task 5: Integrate the project into the portfolio

**Files:**
- Create: `dashboards/fleet-electrification-transition/README.md`
- Modify: `README.md`
- Modify: `index.html`
- Modify: `scripts/verify-portfolio.ps1`
- Modify: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: completed live application route.
- Produces: discoverable project links and repeatable repository verification.

- [ ] **Step 1: Extend repository verification first**

Require the new app and project README. Require `fictional`, `illustrative`, `Scope 3`, and `investment advice` language. Require the root README and root gallery to link to `dashboards/fleet-electrification-transition/`. Keep all existing Company X checks.

- [ ] **Step 2: Run verifier and confirm the intended red state**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1`

Expected: FAIL because the project README and portfolio links are not complete.

- [ ] **Step 3: Write the project README**

Include the live URL, local viewing instructions, capability summary, input/result coverage, formula and factor boundaries, sample-data disclosure, no-data-transmission statement, and methodology limitations.

- [ ] **Step 4: Update the repository README**

Change `Featured project` to `Featured projects`, retain the Company X entry, and add a Fleet Electrification Transition Assessment entry that describes scenario modelling, emissions, cost, certificate, and payback capabilities without claiming real deployment.

- [ ] **Step 5: Replace the root redirect with a two-project gallery**

Build a compact accessible landing page with direct launch and notes links for both projects. Preserve `dashboards/company-x-ghg/` and add `dashboards/fleet-electrification-transition/`. Do not add external assets or duplicate calls to action with the same intent.

- [ ] **Step 6: Run all static verification**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1`

Run: `node --test tests/fleet-electrification.test.mjs`

Run: `git diff --check`

Expected: verifier passes, tests pass, and no whitespace errors are reported.

- [ ] **Step 7: Commit portfolio integration**

```powershell
git add README.md index.html scripts/verify-portfolio.ps1 dashboards/fleet-electrification-transition/README.md tests/fleet-electrification.test.mjs
git commit -m "feat: feature fleet assessment in portfolio"
```

---

### Task 6: Browser, visual, and final publication verification

**Files:**
- Modify if defects are found: `dashboards/fleet-electrification-transition/index.html`
- Modify if defects are found: `index.html`
- Modify if defects are found: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: complete local portfolio.
- Produces: evidence that the application is calculation-correct, accessible at a practical baseline, responsive, and publication-ready.

- [ ] **Step 1: Start a local static server**

Run from repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Expected: both `/` and `/dashboards/fleet-electrification-transition/` return HTTP 200.

- [ ] **Step 2: Verify the full browser flow**

Check root-gallery navigation, all five views, live recalculation, method switching, inline errors, reset, save/restore, JSON export, print layout, keyboard-only navigation, focus visibility, browser back/forward behavior, and absence of console errors.

- [ ] **Step 3: Verify responsive layouts**

Capture and inspect at 1440 x 1000, 1024 x 768, 768 x 1024, and 390 x 844. Fix clipped content, overlapping labels, horizontal page scrolling, inaccessible controls, and unreadable charts.

- [ ] **Step 4: Run the Taste pre-flight subset applicable to an analytical tool**

Confirm the declared design read and dials, one light theme, one emerald accent, consistent radii, button and form contrast, no em dash in visible copy, no decorative scroll cues, no generic AI-purple treatment, motivated motion only, reduced-motion fallback, explicit mobile collapse, and no external UI-system mixing.

- [ ] **Step 5: Run the final verification suite**

```powershell
node --test tests/fleet-electrification.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git diff --check
git status --short
```

Expected: all tests and verification pass; status is clean after any final fixes are committed.

- [ ] **Step 6: Commit verified visual fixes if needed**

```powershell
git add dashboards/fleet-electrification-transition/index.html index.html tests/fleet-electrification.test.mjs
git commit -m "fix: polish fleet assessment presentation"
```

- [ ] **Step 7: Report branch readiness**

Report the branch name, commits, exact test commands and results, local paths, and any GitHub Pages step that remains. Do not push, merge, or open a pull request unless separately authorized.

