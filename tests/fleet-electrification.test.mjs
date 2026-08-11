import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const appPath = new URL("../dashboards/fleet-electrification-transition/index.html", import.meta.url);

async function loadApp() {
  const html = await readFile(appPath, "utf8");
  const match = html.match(/<script data-fleet-model>([\s\S]*?)<\/script>/);
  assert.ok(match, "application exposes a data-fleet-model script");
  const context = vm.createContext({ console, structuredClone });
  vm.runInContext(match[1], context);
  return { html, model: context.__fleetModel };
}

const close = (actual, expected, tolerance = 1e-6) =>
  Math.abs(actual - expected) <= tolerance;
const toHostRecord = value => JSON.parse(JSON.stringify(value));

test("emissions period labels use scenario years and safe display fallbacks", async () => {
  const { model } = await loadApp();
  assert.deepEqual(toHostRecord(model.getEmissionsPeriodLabels(" FY2024 ", "FY2032")), {
    baselineYear: "FY2024",
    targetYear: "FY2032",
    visualBaselineYear: "FY2024",
    visualTargetYear: "FY2032",
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
    visualBaselineYear: "Baseline year",
    visualTargetYear: "Target year",
    title: "Emissions pathway: Baseline year baseline to Target year target",
    ariaLabel: "Emissions pathway from Baseline year baseline to Target year target",
    stages: [
      { stage: "Baseline", year: "Baseline year" },
      { stage: "After fleet transition", year: "Target year" },
      { stage: "After certificates", year: "Target year" },
    ],
  });
});

test("chart year labels shorten only beyond 18 Unicode code points", async () => {
  const { model } = await loadApp();
  const eighteenEmoji = "😀".repeat(18);

  assert.equal(model.formatChartYearLabel("FY2022"), "FY2022");
  assert.equal(model.formatChartYearLabel(eighteenEmoji), eighteenEmoji);
  assert.equal(model.formatChartYearLabel(`${eighteenEmoji}😀`), `${"😀".repeat(17)}…`);
});

test("emissions period labels preserve full long and adversarial values outside the SVG", async () => {
  const { model } = await loadApp();
  const longBaseline = "FiscalYearWithoutAnyBreakOpportunity2022";
  const adversarialTarget = `<>&"`;
  const labels = toHostRecord(model.getEmissionsPeriodLabels(` ${longBaseline} `, ` ${adversarialTarget} `));

  assert.equal(labels.baselineYear, longBaseline);
  assert.equal(labels.targetYear, adversarialTarget);
  assert.equal(labels.title, `Emissions pathway: ${longBaseline} baseline to ${adversarialTarget} target`);
  assert.equal(labels.ariaLabel, `Emissions pathway from ${longBaseline} baseline to ${adversarialTarget} target`);
  assert.equal(labels.visualBaselineYear, "FiscalYearWithout…");
  assert.equal(labels.visualTargetYear, adversarialTarget);
  assert.deepEqual(labels.stages, [
    { stage: "Baseline", year: "FiscalYearWithout…" },
    { stage: "After fleet transition", year: adversarialTarget },
    { stage: "After certificates", year: adversarialTarget },
  ]);
});

test("overview emissions pathway renders dynamic year-aware labels", async () => {
  const { html } = await loadApp();
  assert.match(html, /<h3 id="emissions-chart-title">Emissions pathway<\/h3>/);
  assert.match(html, /const periodLabels = getEmissionsPeriodLabels\(scenario\.baselineYear, scenario\.targetYear\)/);
  assert.match(html, /q\("#emissions-chart-title"\)\.textContent = periodLabels\.title/);
  assert.match(html, /q\("#emissions-chart"\)\.setAttribute\("aria-label", periodLabels\.ariaLabel\)/);
  assert.match(html, /escapeHtml\(labels\[i\]\.stage\)/);
  assert.match(html, /escapeHtml\(labels\[i\]\.year\)/);
  assert.match(html, /#emissions-chart-title,#emissions-summary\{[^}]*overflow-wrap:anywhere/);
  assert.match(html, /lineChart\(pathway,periodLabels\.stages\)/);
  assert.match(html, /periodLabels\.baselineYear/);
  assert.match(html, /periodLabels\.targetYear/);
});

test("sample scenario reproduces workbook headline results", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);

  assert.equal(result.vehiclesTransitioning, 10);
  assert.ok(close(result.scope1Avoided, 46.489536));
  assert.ok(close(result.bevElectricityAdded, 39600));
  assert.ok(close(result.postTransitionGridScope2, 148.552));
  assert.ok(close(result.additionalCertificateCost, 13178));
  assert.ok(close(result.annualOperatingChange, -8902));
  assert.ok(close(result.transitionInvestment, 370000));
  assert.ok(close(result.simplePaybackTransition, 41.56369355201078));
  assert.ok(close(result.residualAfterCertificates, 0));
});

test("partial transition scales fleet effects", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario({ ...model.DEFAULT_SCENARIO, vehiclesTransitioning: 5 });
  assert.equal(result.transitionPct, 0.5);
  assert.ok(close(result.scope1Avoided, 23.244768));
  assert.ok(close(result.bevElectricityAdded, 19800));
});

test("zero certificate coverage preserves grid-based Scope 2", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario({ ...model.DEFAULT_SCENARIO, targetCertificateCoverage: 0 });
  assert.ok(close(result.scope2AfterEac, 148.552));
  assert.equal(result.targetCertificateCost, 0);
});

test("no operating savings reports unavailable payback", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario({ ...model.DEFAULT_SCENARIO, currentAnnualFuelCost: 0 });
  assert.equal(result.simplePaybackTransition, null);
});

test("validation blocks invalid fleet and missing electricity inputs", async () => {
  const { model } = await loadApp();
  const zeroFleet = model.validateScenario({ ...model.DEFAULT_SCENARIO, totalIceVehicles: 0 });
  const overFleet = model.validateScenario({ ...model.DEFAULT_SCENARIO, vehiclesTransitioning: 11 });
  const missingElectricity = model.validateScenario({ ...model.DEFAULT_SCENARIO, currentElectricityKwh: 0 });
  assert.ok(zeroFleet.some(message => message.field === "totalIceVehicles" && message.severity === "error"));
  assert.ok(overFleet.some(message => message.field === "vehiclesTransitioning" && message.severity === "error"));
  assert.ok(missingElectricity.some(message => message.field === "currentElectricityKwh" && message.severity === "error"));
});

test("application exposes accessible views, controls, and chart summaries", async () => {
  const { html } = await loadApp();
  assert.match(html, /class="skip-link"/);
  assert.equal((html.match(/data-view-target=/g) || []).length, 5);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label for="\$\{name\}">\$\{label\}<\/label>/);
  assert.match(html, /\["totalIceVehicles", "Total ICE vehicles"/);
  assert.equal((html.match(/class="chart-summary"/g) || []).length, 2);
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(html, /Scope 3 well-to-tank/);
  assert.match(html, /illustrative planning estimate/i);
});

test("application remains self-contained", async () => {
  const { html } = await loadApp();
  assert.match(html, /rel="icon" href="data:image\/svg\+xml,/);
  assert.doesNotMatch(html, /<script\s+[^>]*src=/i);
  assert.doesNotMatch(html, /<link\s+[^>]*rel=["']stylesheet/i);
  assert.doesNotMatch(html, /@import\s+url/i);
});

test("scenario persistence uses a versioned and defensive schema", async () => {
  const { model } = await loadApp();
  const text = model.serializeScenario(model.DEFAULT_SCENARIO);
  const payload = JSON.parse(text);
  assert.equal(payload.version, 1);
  assert.deepEqual(model.parseStoredScenario(text), model.DEFAULT_SCENARIO);
  assert.equal(model.parseStoredScenario("not-json"), null);
  assert.equal(model.parseStoredScenario(JSON.stringify({ version: 2, scenario: {} })), null);
});

test("input section preferences use a separate defensive schema", async () => {
  const { model } = await loadApp();
  assert.deepEqual(toHostRecord(model.DEFAULT_INPUT_SECTIONS), {
    general: true,
    fleet: false,
    bev: false,
    eac: false,
  });

  const chosen = { general: false, fleet: true, bev: true, eac: false };
  const text = model.serializeInputSections(chosen);
  assert.deepEqual(JSON.parse(text), { version: 1, sections: chosen });
  assert.deepEqual(toHostRecord(model.parseStoredInputSections(text)), chosen);
  assert.equal(model.parseStoredInputSections("not-json"), null);
  assert.equal(model.parseStoredInputSections(JSON.stringify({ version: 2, sections: chosen })), null);
  assert.equal(model.parseStoredInputSections(JSON.stringify({ version: 1, sections: { general: true } })), null);
  assert.equal(model.parseStoredInputSections(JSON.stringify({
    version: 1,
    sections: { general: true, fleet: false, bev: false, eac: "yes" },
  })), null);
});

test("input groups expose accessible independent section controls", async () => {
  const { html } = await loadApp();
  assert.match(html, /class="input-section-filters" role="group" aria-label="Input sections"/);
  assert.equal((html.match(/<button[^>]*data-section-toggle=/g) || []).length, 8);
  assert.equal((html.match(/data-input-section=/g) || []).length, 4);
  assert.match(html, /data-section-toggle="general"[^>]*aria-expanded="true"/);
  assert.match(html, /data-section-toggle="fleet"[^>]*aria-expanded="false"/);
  assert.match(html, /data-section-toggle="bev"[^>]*aria-expanded="false"/);
  assert.match(html, /data-section-toggle="eac"[^>]*aria-expanded="false"/);
  assert.match(html, /const sectionStorageKey = "rcc\.fleet-electrification\.input-sections\.v1"/);
  assert.match(html, /function setInputSection\(sectionId, expanded\)/);
  assert.match(html, /\.input-section-filters\{[^}]*flex-wrap:wrap/);
});

test("both section controls target heading-wrapped visibility panels", async () => {
  const { html } = await loadApp();
  const sections = ["general", "fleet", "bev", "eac"];

  assert.equal((html.match(/<h3 class="section-heading-wrap"><button class="section-heading"/g) || []).length, 4);
  assert.match(html, /\.form-section \.section-heading-wrap\{margin:0\}/);
  for (const section of sections) {
    const panelId = `input-section-${section}-content`;
    assert.match(html, new RegExp(`<button class="section-filter"[^>]*data-section-toggle="${section}"[^>]*aria-controls="${panelId}"`));
    assert.match(html, new RegExp(`<h3 class="section-heading-wrap"><button class="section-heading"[^>]*data-section-toggle="${section}"[^>]*aria-controls="${panelId}"`));
    assert.equal((html.match(new RegExp(`id="${panelId}"`, "g")) || []).length, 1);
  }
});

test("section announcements use stable concise labels", async () => {
  const { model } = await loadApp();

  assert.equal(model.formatInputSectionAnnouncement("fleet", true), "Fleet baseline section expanded.");
  assert.equal(model.formatInputSectionAnnouncement("general", false), "General section collapsed.");
});

test("charts use smooth curves and compact navigation keeps every view visible", async () => {
  const { html } = await loadApp();
  assert.match(html, /\.nav\{display:flex;flex-wrap:wrap;overflow-x:visible/);
  assert.match(html, /\.content:focus\{outline:none\}/);
  assert.match(html, /const path = `M\$\{points\[0\]\.x\},\$\{points\[0\]\.y\} C/);
  assert.match(html, /class="cost-trend"/);
});

test("fallback-only BEV inputs explain and expose their active state", async () => {
  const { html } = await loadApp();
  assert.match(html, /\["fuelToBevPct", "Fuel-to-BEV conversion", "%", 1, "fallback"\]/);
  assert.match(html, /Applicable only when BEV calculation method = Fallback\./);
  assert.match(html, /data-field-status/);
  assert.match(html, /if \(control\.name === "bevMethod"\) syncMethodFields\(\)/);
});

test("fallback field synchronizer executes method transitions without replacing values", async () => {
  const { model } = await loadApp();
  assert.deepEqual(toHostRecord(model.getFallbackFieldState("Distance-based")), {
    disabled: true,
    applicable: "false",
    status: "Not applicable",
  });
  assert.deepEqual(toHostRecord(model.getFallbackFieldState("Fallback")), {
    disabled: false,
    applicable: "true",
    status: "Required for Fallback",
  });

  let storedValue = "37";
  const control = { disabled: false };
  Object.defineProperty(control, "value", {
    get: () => storedValue,
    set: () => { throw new Error("synchronizer must preserve the scenario value"); },
  });
  const status = { textContent: "" };
  const field = {
    dataset: {},
    querySelector(selector) {
      if (selector === "input, select") return control;
      if (selector === "[data-field-status]") return status;
      return null;
    },
  };

  model.syncFallbackMethodFields([field], "Distance-based");
  assert.equal(control.disabled, true);
  assert.equal(field.dataset.applicable, "false");
  assert.equal(status.textContent, "Not applicable");
  assert.equal(control.value, "37");

  model.syncFallbackMethodFields([field], "Fallback");
  assert.equal(control.disabled, false);
  assert.equal(field.dataset.applicable, "true");
  assert.equal(status.textContent, "Required for Fallback");
  assert.equal(control.value, "37");
  assert.equal(storedValue, "37");
});
