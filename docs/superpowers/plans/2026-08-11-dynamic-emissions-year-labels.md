# Dynamic Emissions Year Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Baseline year and Target year immediately drive the emissions pathway title, visual labels, summary, and accessible description without changing calculations.

**Architecture:** Add one pure presentation helper to the existing model script so year normalization and fallback behavior are executable in Node tests. The existing UI render cycle consumes that helper, supplies structured stage/year labels to the SVG renderer, and updates text and accessibility attributes through safe DOM APIs. The assessment remains a single dependency-free HTML file.

**Tech Stack:** Semantic HTML, inline SVG, vanilla JavaScript, Node.js built-in test runner, existing PowerShell portfolio verifier, browser verification.

## Global Constraints

- Do not change `DEFAULT_SCENARIO`, `calculateScenario()`, `validateScenario()`, emissions values, persistence, exports, or other dashboard views.
- Keep the assessment self-contained with no external scripts, stylesheets, fonts, packages, or network calls.
- The title format is exactly `Emissions pathway: [Baseline year] baseline to [Target year] target`.
- Chart stages are exactly `Baseline`, `After fleet transition`, and `After certificates`.
- Baseline uses the Baseline year; both later stages use the Target year.
- Empty or whitespace-only values display as `Baseline year` and `Target year` without overwriting user input.
- Stage and year render as separate SVG text lines.
- User-provided year labels must be HTML-escaped before insertion into SVG markup.
- The existing smooth path, plotted values, markers, color palette, and calculation results remain unchanged.
- The chart title, visual labels, chart `aria-label`, and summary update through the existing render cycle.
- Desktop and mobile output must remain readable without horizontal page overflow or console errors.

## File Structure

- Modify `dashboards/fleet-electrification-transition/index.html`: add the pure period-label helper, dynamic title and accessibility hooks, structured two-line SVG labels, and render-cycle wiring.
- Modify `tests/fleet-electrification.test.mjs`: test year normalization/fallbacks and required UI wiring while retaining calculation regressions.

---

### Task 1: Tested Emissions-Period Presentation Model

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:117-290`

**Interfaces:**
- Produces: `getEmissionsPeriodLabels(baselineYear, targetYear): { baselineYear: string, targetYear: string, title: string, ariaLabel: string, stages: Array<{ stage: string, year: string }> }`
- Extends: `globalThis.__fleetModel` with `getEmissionsPeriodLabels`.

- [ ] **Step 1: Write the failing helper test**

Append this test to `tests/fleet-electrification.test.mjs`:

```js
test("emissions period labels use scenario years and safe display fallbacks", async () => {
  const { model } = await loadApp();
  assert.deepEqual(toHostRecord(model.getEmissionsPeriodLabels(" FY2024 ", "FY2032")), {
    baselineYear: "FY2024",
    targetYear: "FY2032",
    title: "Emissions pathway: FY2024 baseline to FY2032 target",
    ariaLabel: "Emissions pathway from FY2024 baseline to FY2032 target",
    stages: [
      { stage: "Baseline", year: "FY2024" },
      { stage: "After fleet transition", year: "FY2032" },
      { stage: "After certificates", year: "FY2032" },
    ],
  });
  assert.deepEqual(toHostRecord(model.getEmissionsPeriodLabels("   ", "")), {
    baselineYear: "Baseline year",
    targetYear: "Target year",
    title: "Emissions pathway: Baseline year baseline to Target year target",
    ariaLabel: "Emissions pathway from Baseline year baseline to Target year target",
    stages: [
      { stage: "Baseline", year: "Baseline year" },
      { stage: "After fleet transition", year: "Target year" },
      { stage: "After certificates", year: "Target year" },
    ],
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --test-name-pattern="emissions period labels" tests/fleet-electrification.test.mjs
```

Expected: FAIL because `model.getEmissionsPeriodLabels` is not a function.

- [ ] **Step 3: Implement the pure helper**

Inside `<script data-fleet-model>`, after the existing small presentation helpers, add:

```js
function getEmissionsPeriodLabels(baselineYear, targetYear) {
  const baseline = String(baselineYear ?? "").trim() || "Baseline year";
  const target = String(targetYear ?? "").trim() || "Target year";
  return {
    baselineYear: baseline,
    targetYear: target,
    title: `Emissions pathway: ${baseline} baseline to ${target} target`,
    ariaLabel: `Emissions pathway from ${baseline} baseline to ${target} target`,
    stages: [
      { stage: "Baseline", year: baseline },
      { stage: "After fleet transition", year: target },
      { stage: "After certificates", year: target },
    ],
  };
}
```

Add `getEmissionsPeriodLabels` to `globalThis.__fleetModel` without changing existing exports.

- [ ] **Step 4: Run focused and full tests**

Run:

```powershell
node --test --test-name-pattern="emissions period labels" tests/fleet-electrification.test.mjs
node --test tests/fleet-electrification.test.mjs
```

Expected: the focused test passes; the full suite reports 16 tests passing and zero failures.

- [ ] **Step 5: Commit the presentation model**

```powershell
git add -- tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "feat: derive emissions period labels"
```

---

### Task 2: Dynamic Title, Two-Line SVG Labels, and Accessibility

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:54-58,432-488`

**Interfaces:**
- Consumes: `getEmissionsPeriodLabels(baselineYear, targetYear)` from Task 1.
- Changes: `lineChart(values, labels)` where each label is `{ stage: string, year: string }`.
- Produces: `#emissions-chart-title` dynamic text, dynamic `#emissions-chart[aria-label]`, and period-aware `#emissions-summary`.

- [ ] **Step 1: Write failing UI-wiring tests**

Append:

```js
test("overview emissions pathway renders dynamic year-aware labels", async () => {
  const { html } = await loadApp();
  assert.match(html, /<h3 id="emissions-chart-title">Emissions pathway<\/h3>/);
  assert.match(html, /const periodLabels = getEmissionsPeriodLabels\(scenario\.baselineYear, scenario\.targetYear\)/);
  assert.match(html, /q\("#emissions-chart-title"\)\.textContent = periodLabels\.title/);
  assert.match(html, /q\("#emissions-chart"\)\.setAttribute\("aria-label", periodLabels\.ariaLabel\)/);
  assert.match(html, /escapeHtml\(labels\[i\]\.stage\)/);
  assert.match(html, /escapeHtml\(labels\[i\]\.year\)/);
  assert.match(html, /lineChart\(pathway,periodLabels\.stages\)/);
  assert.match(html, /periodLabels\.baselineYear/);
  assert.match(html, /periodLabels\.targetYear/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --test-name-pattern="dynamic year-aware labels" tests/fleet-electrification.test.mjs
```

Expected: FAIL because the title ID and render-cycle wiring do not exist.

- [ ] **Step 3: Add the dynamic title hook**

Change the emissions panel heading from:

```html
<h3>Emissions pathway</h3>
```

to:

```html
<h3 id="emissions-chart-title">Emissions pathway</h3>
```

Keep the existing chart container and summary IDs.

- [ ] **Step 4: Consume the helper in the UI closure**

Add `getEmissionsPeriodLabels` to the destructuring assignment from `globalThis.__fleetModel` at the start of the UI script.

- [ ] **Step 5: Render safe two-line chart labels**

Update `lineChart(values, labels)` to preserve the existing curve and value rendering while using structured labels. Use enough horizontal and bottom padding to keep long labels inside the SVG:

```js
function lineChart(values, labels) {
  const width = 620, height = 262, left = 70, right = 70, top = 22, bottom = 62;
  const max = Math.max(...values, 1) * 1.12;
  const innerW = width - left - right, innerH = height - top - bottom;
  const points = values.map((value, index) => ({ x: left + (innerW * index / (values.length - 1)), y: top + innerH - (value / max * innerH), value }));
  const midpoint01 = (points[0].x + points[1].x) / 2;
  const midpoint12 = (points[1].x + points[2].x) / 2;
  const path = `M${points[0].x},${points[0].y} C${midpoint01},${points[0].y} ${midpoint01},${points[1].y} ${points[1].x},${points[1].y} C${midpoint12},${points[1].y} ${midpoint12},${points[2].y} ${points[2].x},${points[2].y}`;
  return `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><line x1="${left}" y1="${top + innerH}" x2="${width-right}" y2="${top + innerH}" stroke="#cdd7e1"/><path d="${path}" fill="none" stroke="#087f5b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="6" fill="#fff" stroke="#087f5b" stroke-width="3"/><text x="${p.x}" y="${Math.max(14,p.y-14)}" text-anchor="middle" font-size="12" font-weight="700" fill="#102a48">${formatNumber(p.value,1)}</text><text x="${p.x}" y="${height-30}" text-anchor="middle" font-size="11" font-weight="700" fill="#33445a">${escapeHtml(labels[i].stage)}</text><text x="${p.x}" y="${height-14}" text-anchor="middle" font-size="10" fill="#607087">${escapeHtml(labels[i].year)}</text>`).join("")}</svg>`;
}
```

- [ ] **Step 6: Wire title, visual labels, summary, and accessible name into render**

Immediately before creating `pathway`, add:

```js
const periodLabels = getEmissionsPeriodLabels(scenario.baselineYear, scenario.targetYear);
q("#emissions-chart-title").textContent = periodLabels.title;
q("#emissions-chart").setAttribute("aria-label", periodLabels.ariaLabel);
```

Replace the existing emissions render calls with:

```js
q("#emissions-chart").innerHTML = lineChart(pathway,periodLabels.stages);
q("#emissions-summary").textContent = `${periodLabels.baselineYear} baseline ${formatT(pathway[0])}; ${periodLabels.targetYear} after fleet electrification ${formatT(pathway[1])}; ${periodLabels.targetYear} after certificate adjustment ${formatT(pathway[2])}.`;
```

- [ ] **Step 7: Run automated verification**

Run:

```powershell
node --test --test-name-pattern="dynamic year-aware labels" tests/fleet-electrification.test.mjs
node --test tests/fleet-electrification.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git diff --check
```

Expected: the focused test passes; the full suite reports 17 tests passing and zero failures; the portfolio verifier prints `Portfolio verification passed.`; the diff check reports no errors.

- [ ] **Step 8: Verify the live dashboard in a browser**

At 1440 by 1000 and 390 by 844, edit Baseline year to `FY2022` and Target year to `FY2035`, then verify:

```text
Title: Emissions pathway: FY2022 baseline to FY2035 target
Point 1: Baseline / FY2022
Point 2: After fleet transition / FY2035
Point 3: After certificates / FY2035
Chart aria-label: Emissions pathway from FY2022 baseline to FY2035 target
Summary includes FY2022 once and FY2035 twice
Edits update without reload
Labels remain readable and inside the SVG
No horizontal page overflow
No browser console or page errors
```

Then enter whitespace-only values and verify the title, labels, summary, and `aria-label` use `Baseline year` and `Target year` without altering emissions values.

- [ ] **Step 9: Commit the dynamic chart UI**

```powershell
git add -- tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "feat: show scenario years on emissions pathway"
```

- [ ] **Step 10: Review final branch scope**

Run:

```powershell
git status -sb
git diff --stat main...HEAD
git log --oneline main..HEAD
```

Expected: the branch changes only the approved design specification, this implementation plan, the assessment HTML, and assessment tests; the working tree is clean except for the ignored local `.superpowers/` companion directory.

---

## Final Review Fix Evidence — 2026-08-11

The final-review boundary finding is addressed by preserving complete trimmed values in `baselineYear`, `targetYear`, the dynamic title, chart `aria-label`, and summary, while deriving separate SVG-only labels with `formatChartYearLabel()`. The formatter retains labels through 18 Unicode code points and, above that boundary, returns the first 17 code points plus `…`. The heading and summary use defensive wrapping; SVG overflow is contained; ordinary labels such as `FY2022` remain exact; SVG text continues through `escapeHtml()`.

### RED / GREEN

```powershell
node --test --test-name-pattern="chart year labels|emissions period labels preserve|emissions period labels use" tests/fleet-electrification.test.mjs
```

RED result before production changes: exit `1`; 3 tests, 0 passed, 3 failed. Failures identified the missing visual-label properties and missing `formatChartYearLabel()` export.

```powershell
node --test --test-name-pattern="chart year labels|emissions period labels preserve|emissions period labels use|dynamic year-aware labels" tests/fleet-electrification.test.mjs
```

GREEN result after the minimal implementation: exit `0`; 4 tests, 4 passed, 0 failed.

### Browser matrix

The local self-contained dashboard was served from `http://127.0.0.1:8765/dashboards/fleet-electrification-transition/` and exercised through the in-app Chromium browser. Each case updated the actual inputs and then inspected the rendered title, chart `aria-label`, SVG year text, summary, stored input values, element bounds, document width, and console.

| Viewport | Values | Result |
| --- | --- | --- |
| 1440×1000 | `FY2022` / `FY2035` | Full title, ARIA, and summary correct; SVG years exact; SVG contained; page overflow `0px`. |
| 1440×1000 | whitespace / whitespace | Inputs retained whitespace; all presentation sinks used `Baseline year` / `Target year`; SVG contained; page overflow `0px`. |
| 1440×1000 | `FiscalYearWithoutAnyBreakOpportunity2022` / `<>&"` | Full stored/title/ARIA/summary values retained; SVG years were `FiscalYearWithout…`, `<>&"`, `<>&"`; special-character markup escaped; 9 expected SVG text nodes; title wrapped to 2 lines; SVG contained; page overflow `0px`. |
| 390×844 | `FY2022` / `FY2035` | Full title, ARIA, and summary correct; SVG years exact; SVG contained; page overflow `0px`. |
| 390×844 | whitespace / whitespace | Inputs retained whitespace; all presentation sinks used fallbacks; SVG contained; page overflow `0px`. |
| 390×844 | `FiscalYearWithoutAnyBreakOpportunity2022` / `<>&"` | Full stored/title/ARIA/summary values retained; SVG years compact/safe; special-character markup escaped; 9 expected SVG text nodes; title wrapped to 3 lines; SVG contained; page overflow `0px`. |

Console result after all six cases: `[]` for warning/error entries.

### Fresh full verification

```powershell
node --test tests/fleet-electrification.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git diff --check
```

Results: `19` tests passed, `0` failed (exit `0`); `Portfolio verification passed.` (exit `0`); `git diff --check` exit `0` with no whitespace errors. Git emitted only the repository's line-ending conversion notices for the three edited source files.
