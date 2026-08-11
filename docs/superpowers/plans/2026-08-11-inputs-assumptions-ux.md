# Inputs and Assumptions UX Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize the Inputs and assumptions view into independently collapsible, remembered sections and clearly disable fallback-only BEV inputs unless the Fallback method is active.

**Architecture:** Keep the application dependency-free and self-contained in its existing HTML file. Add pure, exported section-state parsing and serialization helpers to the model script for deterministic tests, then connect semantic filter and heading buttons to a small presentation-state controller in the UI script. Conditional input state remains presentation logic driven by the existing `scenario.bevMethod`; the calculation engine is unchanged.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, browser `localStorage`, Node.js built-in test runner, existing PowerShell portfolio verifier, Playwright browser verification.

## Global Constraints

- Do not change formulas, scenario values, exports, report content, or other application views.
- Keep the assessment self-contained with no third-party scripts, stylesheets, fonts, or packages.
- Use four section identifiers exactly: `general`, `fleet`, `bev`, and `eac`.
- On first use, only `general` is expanded.
- Store section state separately from scenario data in a versioned local-storage entry.
- Users may independently open or collapse any combination, including all four collapsed.
- Filter buttons and heading buttons must expose synchronized `aria-expanded` state and `aria-controls` relationships.
- Disabled fallback-only fields remain visible, retain their values, and are ignored by the Distance-based calculation.
- Use the existing emerald accent and preserve visible focus states.
- Small-screen filters must wrap without horizontal scrolling.
- Reduced-motion preferences must disable section transitions.

## File Structure

- Modify `dashboards/fleet-electrification-transition/index.html`: add section controls, persistence helpers, accordion controller, conditional input presentation, and responsive styling.
- Modify `tests/fleet-electrification.test.mjs`: add pure state-schema, semantic markup, and conditional-input regression coverage.
- Modify `dashboards/fleet-electrification-transition/README.md`: document the organized input workflow and conditional Fallback field.

---

### Task 1: Versioned Input-Section State

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:97-229`

**Interfaces:**
- Produces: `DEFAULT_INPUT_SECTIONS: Readonly<Record<'general'|'fleet'|'bev'|'eac', boolean>>`
- Produces: `serializeInputSections(sections): string`
- Produces: `parseStoredInputSections(text): Record<'general'|'fleet'|'bev'|'eac', boolean> | null`
- Extends: `globalThis.__fleetModel` with all three exports.

- [ ] **Step 1: Write failing schema tests**

Append this test to `tests/fleet-electrification.test.mjs`:

```js
test("input section preferences use a separate defensive schema", async () => {
  const { model } = await loadApp();
  assert.deepEqual(model.DEFAULT_INPUT_SECTIONS, {
    general: true,
    fleet: false,
    bev: false,
    eac: false,
  });

  const chosen = { general: false, fleet: true, bev: true, eac: false };
  const text = model.serializeInputSections(chosen);
  assert.deepEqual(JSON.parse(text), { version: 1, sections: chosen });
  assert.deepEqual(model.parseStoredInputSections(text), chosen);
  assert.equal(model.parseStoredInputSections("not-json"), null);
  assert.equal(model.parseStoredInputSections(JSON.stringify({ version: 2, sections: chosen })), null);
  assert.equal(model.parseStoredInputSections(JSON.stringify({ version: 1, sections: { general: true } })), null);
  assert.equal(model.parseStoredInputSections(JSON.stringify({
    version: 1,
    sections: { general: true, fleet: false, bev: false, eac: "yes" },
  })), null);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --test --test-name-pattern="input section preferences" tests/fleet-electrification.test.mjs`

Expected: FAIL because `DEFAULT_INPUT_SECTIONS` and its parser/serializer are not exported.

- [ ] **Step 3: Implement the minimal section-state schema**

Inside `<script data-fleet-model>`, after `DEFAULT_SCENARIO`, add:

```js
const INPUT_SECTION_IDS = Object.freeze(["general", "fleet", "bev", "eac"]);
const DEFAULT_INPUT_SECTIONS = Object.freeze({
  general: true,
  fleet: false,
  bev: false,
  eac: false,
});

function serializeInputSections(sections) {
  const normalized = Object.fromEntries(
    INPUT_SECTION_IDS.map(id => [id, Boolean(sections?.[id])]),
  );
  return JSON.stringify({ version: 1, sections: normalized });
}

function parseStoredInputSections(text) {
  try {
    const payload = JSON.parse(text);
    if (payload?.version !== 1 || !payload.sections) return null;
    if (!INPUT_SECTION_IDS.every(id => typeof payload.sections[id] === "boolean")) return null;
    if (Object.keys(payload.sections).length !== INPUT_SECTION_IDS.length) return null;
    return Object.fromEntries(INPUT_SECTION_IDS.map(id => [id, payload.sections[id]]));
  } catch {
    return null;
  }
}
```

Extend the model export:

```js
globalThis.__fleetModel = {
  DEFAULT_SCENARIO,
  DEFAULT_INPUT_SECTIONS,
  calculateScenario,
  validateScenario,
  serializeScenario,
  parseStoredScenario,
  serializeInputSections,
  parseStoredInputSections,
};
```

- [ ] **Step 4: Run the focused and full tests**

Run: `node --test --test-name-pattern="input section preferences" tests/fleet-electrification.test.mjs`

Expected: 1 matching test passes.

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit the state schema**

```bash
git add tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "feat: add input section preference schema"
```

---

### Task 2: Accessible Collapsible Input Groups

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:10-18,60-75,230-302,390-405`

**Interfaces:**
- Consumes: `DEFAULT_INPUT_SECTIONS`, `serializeInputSections`, and `parseStoredInputSections` from Task 1.
- Produces: `setInputSection(sectionId: string, expanded: boolean): void`
- Produces: local-storage key `rcc.fleet-electrification.input-sections.v1`
- Produces: synchronized `[data-section-toggle]` buttons controlling `[data-input-section]` regions.

- [ ] **Step 1: Write failing semantic-structure tests**

Append this test:

```js
test("input groups expose accessible independent section controls", async () => {
  const { html } = await loadApp();
  assert.match(html, /class="input-section-filters" aria-label="Input sections"/);
  assert.equal((html.match(/data-section-toggle=/g) || []).length, 8);
  assert.equal((html.match(/data-input-section=/g) || []).length, 4);
  assert.match(html, /data-section-toggle="general"[^>]*aria-expanded="true"/);
  assert.match(html, /data-section-toggle="fleet"[^>]*aria-expanded="false"/);
  assert.match(html, /data-section-toggle="bev"[^>]*aria-expanded="false"/);
  assert.match(html, /data-section-toggle="eac"[^>]*aria-expanded="false"/);
  assert.match(html, /const sectionStorageKey = "rcc\.fleet-electrification\.input-sections\.v1"/);
  assert.match(html, /function setInputSection\(sectionId, expanded\)/);
  assert.match(html, /\.input-section-filters\{[^}]*flex-wrap:wrap/);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --test --test-name-pattern="accessible independent section controls" tests/fleet-electrification.test.mjs`

Expected: FAIL because the filter row, semantic controls, regions, and controller do not exist.

- [ ] **Step 3: Add the filter row and semantic section markup**

Immediately after the Inputs view heading, add:

```html
<div class="input-section-filters" aria-label="Input sections">
  <button class="section-filter" type="button" data-section-toggle="general" aria-expanded="true" aria-controls="input-section-general"><span>General</span><small>6 fields</small></button>
  <button class="section-filter" type="button" data-section-toggle="fleet" aria-expanded="false" aria-controls="input-section-fleet"><span>Fleet baseline</span><small>8 fields</small></button>
  <button class="section-filter" type="button" data-section-toggle="bev" aria-expanded="false" aria-controls="input-section-bev"><span>BEV</span><small>6 fields</small></button>
  <button class="section-filter" type="button" data-section-toggle="eac" aria-expanded="false" aria-controls="input-section-eac"><span>EAC</span><small>6 fields</small></button>
</div>
```

Convert each existing `.form-section` input group to this structure, using its matching identifier and default hidden state:

```html
<section class="form-section input-section" data-input-section="general" id="input-section-general">
  <button class="section-heading" type="button" data-section-toggle="general" aria-expanded="true" aria-controls="input-section-general-content"><span><strong>General</strong><small>Core scenario identity and calculation method</small></span><span data-section-action>Hide</span></button>
  <div class="section-content" id="input-section-general-content"><div class="form-grid">
    <div class="field"><label for="companyName">Company name</label><input id="companyName" name="companyName" type="text"><small>Displayed in the scenario header.</small></div>
    <div class="field"><label for="baselineYear">Baseline year</label><input id="baselineYear" name="baselineYear" type="text"><small>Starting reporting period.</small></div>
    <div class="field"><label for="targetYear">Target year</label><input id="targetYear" name="targetYear" type="text"><small>Assessment horizon.</small></div>
    <div class="field"><label for="currencyCode">Currency code</label><input id="currencyCode" name="currencyCode" type="text" maxlength="3"><small>Three-letter display code.</small></div>
    <div class="field"><label for="dataStatus">Data status</label><select id="dataStatus" name="dataStatus"><option>Sample Data</option><option>User Data</option></select><small>Keep Sample Data until values are replaced.</small></div>
    <div class="field"><label for="bevMethod">BEV calculation method</label><select id="bevMethod" name="bevMethod"><option>Distance-based</option><option>Fallback</option></select><small>Distance-based is preferred.</small></div>
  </div></div>
</section>
```

For Fleet, BEV, and EAC, set `aria-expanded="false"`, use `data-section-action` text `Show`, and add `hidden` to `.section-content`. Keep the reset button outside all four controlled regions.

- [ ] **Step 4: Add compact Taste-compliant styling**

Add rules alongside the existing form styles:

```css
.input-section-filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.section-filter{display:flex;align-items:center;gap:7px;min-height:38px;padding:0 12px;border:1px solid #b9c5d2;border-radius:999px;background:var(--white);color:var(--navy);font-weight:800;cursor:pointer}
.section-filter small{color:var(--muted);font-size:10px;font-weight:700}
.section-filter[aria-expanded="true"]{border-color:var(--emerald);background:var(--emerald);color:#fff}
.section-filter[aria-expanded="true"] small{color:#d9f3e9}
.section-filter:active,.section-heading:active{transform:translateY(1px)}
.section-heading{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 0 14px;border:0;background:transparent;color:var(--navy);text-align:left;cursor:pointer}
.section-heading strong,.section-heading small{display:block}.section-heading strong{font-size:15px}.section-heading small{margin-top:4px;color:var(--muted);font-size:11px;font-weight:500}
.section-heading [data-section-action]{color:var(--emerald);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
.section-content{opacity:1;transform:translateY(0);transition:opacity .18s ease,transform .18s ease}
.section-content[hidden]{display:none}
.section-filter:focus-visible,.section-heading:focus-visible{outline:3px solid rgba(8,127,91,.3);outline-offset:2px}
```

- [ ] **Step 5: Implement restoration, toggling, and storage**

At the top of the UI closure, include the new model exports, restore a cloned default, and use a separate key:

```js
const {
  DEFAULT_SCENARIO,
  DEFAULT_INPUT_SECTIONS,
  calculateScenario,
  validateScenario,
  serializeScenario,
  parseStoredScenario,
  serializeInputSections,
  parseStoredInputSections,
} = globalThis.__fleetModel;
const sectionStorageKey = "rcc.fleet-electrification.input-sections.v1";
let inputSections = { ...DEFAULT_INPUT_SECTIONS };
try {
  const restoredSections = parseStoredInputSections(localStorage.getItem(sectionStorageKey));
  if (restoredSections) inputSections = restoredSections;
} catch { /* The first-use defaults remain available. */ }
```

After `q`, `qa`, and `announce` exist, add:

```js
function setInputSection(sectionId, expanded) {
  if (!(sectionId in inputSections)) return;
  inputSections[sectionId] = expanded;
  qa(`[data-section-toggle="${sectionId}"]`).forEach(button => {
    button.setAttribute("aria-expanded", String(expanded));
    const action = button.querySelector("[data-section-action]");
    if (action) action.textContent = expanded ? "Hide" : "Show";
  });
  const content = q(`#input-section-${sectionId}-content`);
  content.hidden = !expanded;
  try { localStorage.setItem(sectionStorageKey, serializeInputSections(inputSections)); } catch { /* UI remains usable. */ }
}

function initializeInputSections() {
  Object.entries(inputSections).forEach(([sectionId, expanded]) => setInputSection(sectionId, expanded));
  qa("[data-section-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const sectionId = button.dataset.sectionToggle;
      setInputSection(sectionId, !inputSections[sectionId]);
      announce(`${button.textContent.trim()} section ${inputSections[sectionId] ? "expanded" : "collapsed"}.`);
    });
  });
}
```

Call `initializeInputSections()` once after `buildFields()` and before the first render.

- [ ] **Step 6: Run focused and full verification**

Run: `node --test --test-name-pattern="accessible independent section controls" tests/fleet-electrification.test.mjs`

Expected: 1 matching test passes.

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: all tests pass.

- [ ] **Step 7: Commit the collapsible groups**

```bash
git add tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "feat: organize assessment input groups"
```

---

### Task 3: Conditional Fallback Inputs

**Files:**
- Modify: `tests/fleet-electrification.test.mjs`
- Modify: `dashboards/fleet-electrification-transition/index.html:10-18,245-301,330-405`

**Interfaces:**
- Consumes: existing `scenario.bevMethod` and generated field markup.
- Produces: `syncMethodFields(): void`
- Produces: `[data-method="fallback"]` field metadata and `[data-field-status]` status content.

- [ ] **Step 1: Write a failing conditional-field test**

Append:

```js
test("fallback-only BEV inputs explain and expose their active state", async () => {
  const { html } = await loadApp();
  assert.match(html, /\["fuelToBevPct", "Fuel-to-BEV conversion", "%", 1, "fallback"\]/);
  assert.match(html, /Applicable only when BEV calculation method = Fallback\./);
  assert.match(html, /data-field-status/);
  assert.match(html, /function syncMethodFields\(\)/);
  assert.match(html, /control\.disabled = !usesFallback/);
  assert.match(html, /usesFallback \? "Required for Fallback" : "Not applicable"/);
  assert.match(html, /if \(control\.name === "bevMethod"\) syncMethodFields\(\)/);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --test --test-name-pattern="fallback-only BEV inputs" tests/fleet-electrification.test.mjs`

Expected: FAIL because fallback metadata, helper copy, statuses, and the synchronizer do not exist.

- [ ] **Step 3: Add fallback metadata to generated fields**

Change the Fuel-to-BEV definition to:

```js
["fuelToBevPct", "Fuel-to-BEV conversion", "%", 1, "fallback"],
```

Change `createField` to accept `method` and emit contextual markup:

```js
function createField([name, label, unit, step, method]) {
  const shown = percentageFields.has(name) ? DEFAULT_SCENARIO[name] * 100 : DEFAULT_SCENARIO[name];
  const max = percentageFields.has(name) ? ' max="100"' : "";
  const methodAttr = method ? ` data-method="${method}"` : "";
  const helper = method === "fallback"
    ? "Applicable only when BEV calculation method = Fallback."
    : unit;
  const status = method === "fallback" ? '<span class="field-status" data-field-status>Not applicable</span>' : "";
  return `<div class="field" data-field="${name}"${methodAttr}><div class="field-label-row"><label for="${name}">${label}</label>${status}</div><input id="${name}" name="${name}" type="number" min="0"${max} step="${step}" value="${shown}"><small>${helper}</small></div>`;
}
```

- [ ] **Step 4: Style inactive and active method states**

Add:

```css
.field-label-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.field-status{color:var(--muted);font-size:9px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
.field[data-method][data-applicable="false"]{opacity:.66}
.field[data-method][data-applicable="false"] input{border-style:dashed;background:#edf1f3;color:var(--muted);cursor:not-allowed}
.field[data-method][data-applicable="true"] .field-status{color:var(--emerald)}
```

- [ ] **Step 5: Implement and connect conditional synchronization**

Add after `syncForm()`:

```js
function syncMethodFields() {
  const usesFallback = scenario.bevMethod === "Fallback";
  qa('[data-method="fallback"]').forEach(field => {
    const control = field.querySelector("input, select");
    control.disabled = !usesFallback;
    field.dataset.applicable = String(usesFallback);
    field.querySelector("[data-field-status]").textContent = usesFallback ? "Required for Fallback" : "Not applicable";
  });
}
```

Call `syncMethodFields()` at the end of `buildFields()` and after every `syncForm()`. In the form input/change handler, after assigning the scenario value, add:

```js
if (control.name === "bevMethod") syncMethodFields();
```

Do not clear or overwrite `scenario.fuelToBevPct` when disabling the field.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test --test-name-pattern="fallback-only BEV inputs" tests/fleet-electrification.test.mjs`

Expected: 1 matching test passes.

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: all tests pass with zero failures.

- [ ] **Step 7: Commit the conditional field behavior**

```bash
git add tests/fleet-electrification.test.mjs dashboards/fleet-electrification-transition/index.html
git commit -m "fix: clarify fallback-only BEV inputs"
```

---

### Task 4: Documentation and End-to-End UX Verification

**Files:**
- Modify: `dashboards/fleet-electrification-transition/README.md`
- Verify: `dashboards/fleet-electrification-transition/index.html`
- Verify: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: completed section controller and conditional-field behavior from Tasks 2 and 3.
- Produces: documented user workflow and browser-verification evidence.

- [ ] **Step 1: Document the refined workflow**

Add this section to the assessment README after its usage instructions:

```markdown
## Organizing inputs

The Inputs and assumptions view opens with General expanded on first use. General, Fleet baseline, BEV, and EAC can then be opened or collapsed independently, and the browser remembers the last section combination for later visits.

Fuel-to-BEV conversion is enabled only when the BEV calculation method is Fallback. Distance-based scenarios retain the fallback value but do not use it in calculations.
```

- [ ] **Step 2: Run all automated verification**

Run: `node --test tests/fleet-electrification.test.mjs`

Expected: all tests pass with zero failures.

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1`

Expected: `Portfolio verification passed.`

Run: `git diff --check`

Expected: no whitespace errors in files changed by this branch.

- [ ] **Step 3: Verify desktop behavior in a browser**

Serve the repository locally and open the fleet assessment at a desktop viewport of 1440 by 1000. Clear both fleet-electrification local-storage keys before the first load. Verify:

```text
General is expanded; Fleet baseline, BEV, and EAC are collapsed.
Each filter and heading button toggles only its matching section.
Filter and heading aria-expanded values stay synchronized.
Multiple groups can remain open and all groups can be collapsed.
Fuel-to-BEV is muted and disabled for Distance-based.
Fuel-to-BEV becomes editable and reads Required for Fallback after selecting Fallback.
Changing back preserves its value and returns it to Not applicable.
Reload restores the last section combination.
There are no browser console errors.
```

- [ ] **Step 4: Verify mobile and keyboard behavior**

At a viewport of 390 by 844, verify:

```text
The four filters wrap without horizontal overflow.
All filter labels and counts remain readable.
Tab focus is visible on every filter, heading, and active field.
Collapsed fields are absent from the tab order.
Enter and Space toggle the native section buttons.
The page has no horizontal overflow and no console errors.
```

Enable reduced motion and verify section state changes occur without transitions.

- [ ] **Step 5: Commit the documentation after verification**

```bash
git add dashboards/fleet-electrification-transition/README.md
git commit -m "docs: explain organized assessment inputs"
```

- [ ] **Step 6: Review final branch scope**

Run:

```bash
git status -sb
git diff --stat main...HEAD
git log --oneline main..HEAD
```

Expected: only the approved specification, this implementation plan, assessment HTML, assessment tests, and assessment README are changed; the working tree is clean except for the local `.superpowers/` visual-companion directory, which must not be committed.
