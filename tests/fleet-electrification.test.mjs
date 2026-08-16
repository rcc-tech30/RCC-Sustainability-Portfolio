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

test("overview KPI story neutralizes floating break-even residuals at display precision", async () => {
  const { model } = await loadApp();
  const scenario = { ...model.DEFAULT_SCENARIO, annualDistanceKm: 20_000 };
  const distanceResult = model.calculateScenario(scenario);
  const breakEvenGridFactor = distanceResult.scope1Avoided * 1000 / distanceResult.bevElectricityAdded;
  const result = model.calculateScenario({ ...scenario, gridEmissionFactor: breakEvenGridFactor });
  const rawNetEmissionsChange = result.baselineTotalEmissions - result.residualBeforeCertificates;
  const story = model.deriveOverviewKpiStory(result);

  assert.ok(rawNetEmissionsChange < 0, "real model retains the floating-point residual");
  assert.ok(Math.abs(rawNetEmissionsChange) < 0.005, "residual displays as 0.00 tCO2e");
  assert.equal(story.netEmissionsChange, rawNetEmissionsChange);
  assert.equal(story.netEmissionsMagnitude, 0);
  assert.equal(story.netTone, "neutral");
  assert.equal(story.netSubline, "No change before certificates");
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
  assert.equal((html.match(/data-view-target=/g) || []).length, 6);
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
  assert.match(html, /class="cost-comparison"/);
  assert.match(html, /class="cost-delta"/);
  assert.match(html, /function costComparisonChart\(/);
  assert.match(html, /data-cost-segment="\$\{key\}"/);
  assert.match(html, /aria-label="Annual operating cost comparison showing fuel and electricity today and after transition"/);
  assert.doesNotMatch(html, /class="cost-trend"/);
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

test("payback interpretation classifies maximum and minimum whole-fleet thresholds", async () => {
  const { model } = await loadApp();

  const defaultResult = model.calculateScenario(model.DEFAULT_SCENARIO);
  const available = model.derivePaybackInterpretation(model.DEFAULT_SCENARIO, defaultResult);
  assert.equal(available.hasPayback, true);
  assert.ok(close(available.annualSavings, 8902));
  assert.equal(available.annualCostIncrease, 0);
  assert.deepEqual(toHostRecord(available.boundary), { kind: "maximum", maxTotalFleet: 14, minTotalFleet: null });

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
  assert.ok(close(model.calculateScenario({ ...fallbackMaximum, totalIceVehicles: 15 }).annualOperatingChange, -320.08263894000265));
  assert.ok(close(model.calculateScenario({ ...fallbackMaximum, totalIceVehicles: 16 }).annualOperatingChange, 387.42252599375206));

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

  const unavailable = model.derivePaybackInterpretation(
    distanceNoPayback,
    model.calculateScenario(distanceNoPayback),
  );
  assert.equal(unavailable.hasPayback, false);
  assert.ok(close(unavailable.annualCostIncrease, 1098));
  assert.equal(unavailable.vehiclesTransitioning, 10);
});

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

  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const cases = [
    [{ ...model.DEFAULT_SCENARIO, vehiclesTransitioning: 0 }, { ...result, vehiclesTransitioning: 0 }, "no-transition"],
    [{ ...model.DEFAULT_SCENARIO, currentAnnualFuelCost: 0 }, result, "no-fuel-cost"],
    [model.DEFAULT_SCENARIO, { ...result, electricityCostChange: 0 }, "nonpositive-electricity-change"],
  ];
  for (const [scenario, scenarioResult, kind] of cases) {
    assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
      scenario,
      scenarioResult,
    )), { kind, maxTotalFleet: null, minTotalFleet: null });
  }
});

test("payback fleet boundary finds an exact safe-integer crossing without slope tolerance", async () => {
  const { model } = await loadApp();
  const scenario = {
    ...model.DEFAULT_SCENARIO,
    totalIceVehicles: 6_000_000_000_000_000,
    vehiclesTransitioning: 1_000_000_000_000_000,
    annualDistanceKm: 100,
    bevKwhPerKm: 0.01,
    chargingLossPct: 0,
    electricityRate: 0.01,
    currentAnnualFuelCost: 50_000_000_000_000,
    currentCertificateCoverage: 0,
    targetCertificateCoverage: 0,
    certificateCostPerKwh: 0,
  };

  assert.ok(model.calculateScenario({
    ...scenario,
    totalIceVehicles: 4_999_999_999_999_999,
  }).annualOperatingChange < 0);
  assert.equal(model.calculateScenario({
    ...scenario,
    totalIceVehicles: 5_000_000_000_000_000,
  }).annualOperatingChange, 0);
  assert.ok(model.calculateScenario({
    ...scenario,
    totalIceVehicles: 5_000_000_000_000_001,
  }).annualOperatingChange > 0);
  assert.deepEqual(toHostRecord(model.derivePaybackFleetBoundary(
    scenario,
    model.calculateScenario(scenario),
  )), {
    kind: "maximum",
    maxTotalFleet: 4_999_999_999_999_999,
    minTotalFleet: null,
  });
});

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

test("overview places board interpretation after graphs and errors before KPIs", async () => {
  const { html } = await loadApp();
  const chartMarkup = '<div class="chart-grid">';
  const notesMarkup = '<section class="board-interpretation" id="board-interpretation"';
  const errorRegion = html.match(/<div\b[^>]*\bid="warning-stack"[^>]*>/)?.[0];
  assert.ok(html.indexOf(notesMarkup) > html.indexOf(chartMarkup));
  assert.ok(errorRegion, "overview exposes an input-error region");
  assert.match(errorRegion, /\brole="alert"/);
  assert.match(errorRegion, /\baria-label="Input errors"/);
  assert.match(errorRegion, /\baria-live="assertive"/);
  assert.match(html, /id="board-interpretation"[^>]*aria-labelledby="board-interpretation-title"/);
  assert.match(html, /id="payback-explanation"/);
  assert.match(html, /id="payback-boundary"/);
  assert.match(html, /id="overview-warning-list"/);
  assert.match(html, /id="payback-limitation"/);
  assert.match(html, /\.board-note\[hidden\]\{display:none\}/);
  assert.match(html, /const errors = messages\.filter\(message => message\.severity === "error"\)/);
  assert.match(html, /const warnings = messages\.filter\(message => message\.severity === "warning"/);
});

const overviewMarkup = html =>
  html.slice(html.indexOf('id="view-overview"'), html.indexOf('id="view-inputs"'));

test("overview presents the approved eight-card KPI story in reading order", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  assert.ok(overview, "Overview view markup exists");

  const valueIds = [...overview.matchAll(/id="(kpi-[^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(valueIds, [
    "kpi-net-emissions-percent",
    "kpi-net-emissions",
    "kpi-net-emissions-sub",
    "kpi-operating",
    "kpi-fleet",
    "kpi-fleet-sub",
    "kpi-scope1",
    "kpi-scope2-increase",
    "kpi-scope2-increase-sub",
    "kpi-residual",
    "kpi-residual-sub",
    "kpi-investment",
    "kpi-investment-sub",
    "kpi-payback",
    "kpi-payback-sub",
  ]);

  assert.doesNotMatch(overview, /BEV electricity added|Additional certificate cost/);
  assert.match(html, /\["BEV electricity added",`\$\{formatNumber\(result\.bevElectricityAdded\)\} kWh`/);
  assert.match(html, /\["Additional certificate cost",formatMoney\(result\.additionalCertificateCost\)/);
});

test("overview opens with a live scenario summary band", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  const band = overview.match(/<div class="scenario-band"[\s\S]*?<\/div>\s*<div id="warning-stack"/);
  assert.ok(band, "scenario summary band sits above the input-error region");

  assert.match(overview, /<div class="scenario-band" id="scenario-band" aria-label="Scenario summary">/);
  const bandIds = [...band[0].matchAll(/id="(scenario-[a-z-]+)"/g)].map(match => match[1]);
  assert.deepEqual(bandIds, [
    "scenario-band",
    "scenario-company",
    "scenario-period",
    "scenario-method",
    "scenario-data-status",
  ]);
  assert.equal((band[0].match(/class="scenario-band-label"/g) || []).length, 4);
  assert.ok(overview.indexOf('class="scenario-band"') < overview.indexOf('class="metric-primary"'));
  assert.match(html, /q\("#scenario-period"\)\.textContent = `\$\{scenario\.baselineYear\} to \$\{scenario\.targetYear\}`/);
  assert.match(html, /q\("#scenario-data-status"\)\.textContent = scenario\.dataStatus/);
  assert.match(html, /\.scenario-band\{display:grid/);
});

test("scope 2 supporting card is labelled for the added grid emissions it renders", async () => {
  const { html, model } = await loadApp();
  const overview = overviewMarkup(html);
  assert.match(overview, /<span class="label">Scope 2 added<\/span>/);
  assert.doesNotMatch(overview, /<span class="label">Scope 2 increase<\/span>/);
  assert.match(html, /id="kpi-scope2-increase"/, "live binding id is retained");
  assert.match(html, /q\("#kpi-scope2-increase"\)\.textContent = formatT\(kpiStory\.scope2Increase\)/);

  // The rendered value is toTco2e(bevElectricityAdded * gridEmissionFactor), so it is
  // never negative while every fuel, distance and efficiency input is non-negative.
  const cases = [
    {},
    { vehiclesTransitioning: 0 },
    { bevMethod: "Fallback" },
    { bevMethod: "Fallback", otherFuelGj: 0, dieselLitres: 0, petrolLitres: 0 },
    { chargingLossPct: 0 },
  ];
  for (const override of cases) {
    const story = model.deriveOverviewKpiStory(
      model.calculateScenario({ ...model.DEFAULT_SCENARIO, ...override }),
    );
    assert.ok(story.scope2Increase >= 0, `non-negative inputs never subtract Scope 2: ${JSON.stringify(override)}`);
  }
});

test("overview primary group ranks net emissions above operating impact and fleet transition", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  const primary = overview.match(/<div class="metric-primary">([\s\S]*?)<div class="chart-grid">/)?.[1];
  assert.ok(primary, "primary metric group precedes the charts");

  const cardIds = [...primary.matchAll(/<article class="kpi[^"]*" id="([^"]+)">/g)].map(match => match[1]);
  assert.deepEqual(cardIds, ["net-emissions-card", "operating-card", "fleet-card"]);
  assert.match(primary, /<div class="metric-primary-support">/);
  assert.match(html, /\.metric-primary\{display:grid;grid-template-columns:minmax\(0,1\.6fr\) minmax\(0,1fr\)/);
  assert.match(html, /\.metric-primary-support\{display:grid/);
});

test("overview uses a compact SaaS hierarchy with live scenario controls", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  assert.match(overview, /id="kpi-net-emissions-percent"/);
  assert.match(overview, /class="overview-scenario panel"/);
  assert.match(overview, /id="overview-scenario-company"/);
  assert.match(overview, /id="overview-scenario-period"/);
  assert.match(overview, /id="overview-scenario-method"/);
  assert.match(overview, /id="overview-scenario-electricity"/);
  assert.match(overview, /data-view-target="inputs"/);
  assert.match(html, /q\("#kpi-net-emissions-percent"\)\.textContent/);
  assert.match(html, /q\("#overview-scenario-company"\)\.textContent = scenario\.companyName/);
  assert.match(html, /q\("#overview-scenario-electricity"\)\.textContent/);
});

test("overview desktop grid gives the headline and charts a deliberate one-screen rhythm", async () => {
  const { html } = await loadApp();
  assert.match(html, /\.metric-primary\{display:grid;grid-template-columns:minmax\(0,2\.1fr\) minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(html, /\.metric-primary-support\{display:contents/);
  assert.match(html, /\.chart-grid\{display:grid;grid-template-columns:minmax\(0,1\.45fr\) minmax\(0,1fr\) minmax\(240px,\.72fr\)/);
  assert.match(html, /\.overview-scenario\{grid-column:3/);
  assert.match(html, /@media\(max-width:1100px\)\{[\s\S]*?\.metric-primary-support\{display:grid/);
});

test("net emissions card carries dominant weight without depending on live class rewrites", async () => {
  const { html } = await loadApp();
  const dominant = html.match(/#net-emissions-card\{([^}]*)\}/)?.[1];
  const dominantValue = html.match(/#net-emissions-card \.value\{([^}]*)\}/)?.[1];
  const secondary = html.match(/#operating-card,#fleet-card\{([^}]*)\}/)?.[1];
  assert.ok(dominant && dominantValue && secondary, "hierarchy is expressed through stable id selectors");

  const minHeight = Number(dominant.match(/min-height:(\d+)px/)?.[1]);
  const secondaryMinHeight = Number(secondary.match(/min-height:(\d+)px/)?.[1]);
  assert.ok(minHeight > secondaryMinHeight * 1.5, "dominant card is materially taller than the secondary cards");
  assert.match(dominantValue, /font-size:clamp\(42px,/);
  assert.match(html, /q\("#net-emissions-card"\)\.className = `kpi\$\{kpiStory\.netTone === "neutral" \? "" : ` \$\{kpiStory\.netTone\}`\}`/);
});

test("supporting metrics sit below the primary row and charts", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  const supportingIndex = overview.indexOf('<section class="metric-supporting"');
  assert.ok(supportingIndex > overview.indexOf('<div class="chart-grid">'));
  assert.ok(supportingIndex < overview.indexOf('<section class="board-interpretation"'));

  const supporting = overview.slice(supportingIndex);
  const grid = supporting.match(/<div class="metric-supporting-grid">([\s\S]*?)<\/div>\s*<div class="metric-extra">/)?.[1];
  assert.ok(grid, "supporting grid precedes the subordinate extra-context group");
  assert.deepEqual(
    [...grid.matchAll(/id="(kpi-[a-z0-9-]+)"/g)].map(match => match[1]).filter(id => !id.endsWith("-sub")),
    ["kpi-scope1", "kpi-scope2-increase", "kpi-residual", "kpi-investment"],
  );
  assert.match(html, /\.metric-supporting-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test("payback is relabelled indicative and rendered as subordinate extra context", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  assert.match(overview, /<div class="metric-extra">\s*<article class="kpi" id="payback-card">/);
  assert.match(overview, /<span class="label">Indicative simple payback<\/span>/);
  assert.doesNotMatch(overview, /<span class="label">Simple payback<\/span>/);

  const extra = html.match(/\.metric-extra \.kpi\{([^}]*)\}/)?.[1];
  assert.ok(extra, "extra-context card has its own subdued treatment");
  assert.match(extra, /box-shadow:none/);
  assert.match(extra, /border-style:dashed/);

  assert.match(html, /id="payback-limitation">Simple payback excludes maintenance, financing, tax, depreciation, battery replacement and time value of money\./);
  assert.match(html, /\["Simple payback",result\.simplePaybackTransition===null\?"No payback"/);
});

test("emissions chart outweighs the cost chart", async () => {
  const { html } = await loadApp();
  const overview = overviewMarkup(html);
  assert.match(overview, /<article class="panel chart-priority"><h3 id="emissions-chart-title">/);
  assert.match(overview, /<article class="panel chart-secondary"><h3>Annual operating impact<\/h3>/);

  const columns = html.match(/\.chart-grid\{display:grid;grid-template-columns:minmax\(0,([\d.]+)fr\) minmax\(0,([\d.]+)fr\)/);
  assert.ok(columns, "chart grid weights the priority column");
  assert.ok(Number(columns[1]) > Number(columns[2]));

  const priority = Number(html.match(/\.chart-priority \.chart\{min-height:(\d+)px\}/)?.[1]);
  const secondary = Number(html.match(/\.chart-secondary \.chart\{min-height:(\d+)px\}/)?.[1]);
  assert.ok(priority > secondary, "priority chart reserves more vertical space");
});

test("sidebar uses layered forest surfaces with a restrained mint active state", async () => {
  const { html } = await loadApp();
  assert.match(html, /--forest-900:#[0-9a-f]{6};--forest-800:#[0-9a-f]{6};--forest-700:#[0-9a-f]{6}/);
  assert.match(html, /--mint:#[0-9a-f]{6}/);

  const sidebar = html.match(/\.sidebar\{([^}]*)\}/)?.[1];
  assert.ok(sidebar, "sidebar keeps a single base rule");
  assert.match(sidebar, /position:sticky/);
  assert.match(sidebar, /linear-gradient\(180deg,var\(--forest-900\)/);
  assert.match(sidebar, /box-shadow:inset -1px 0 0 rgba\(255,255,255,\.07\)/);
  assert.doesNotMatch(sidebar, /background:var\(--navy\)/);

  const active = html.match(/\.nav button\[aria-current="page"\]\{([^}]*)\}/)?.[1];
  assert.match(active, /background:var\(--mint-soft\)/);
  assert.match(active, /color:var\(--mint\)/);
  assert.match(active, /box-shadow:inset 0 0 0 1px/);
  assert.match(html, /@media\(max-width:900px\)\{[^@]*\.nav button\[aria-current="page"\]\{background:var\(--mint-soft\);color:var\(--mint\)/);
});

test("interaction rules stay explicit, quick, pointer-gated and reduced-motion safe", async () => {
  const { html } = await loadApp();
  assert.match(html, /--ease-out:cubic-bezier\([\d.,]+\)/);
  assert.doesNotMatch(html, /transition:\s*all\b/);

  const declarations = [...html.matchAll(/transition:([^;}]+)/g)].map(match => match[1]);
  assert.ok(declarations.length >= 4, "explicit transitions are declared");
  for (const declaration of declarations) {
    if (/\bnone\b/.test(declaration)) continue;
    assert.doesNotMatch(declaration, /(^|[\s,])all([\s,]|$)/);
    const durations = [...declaration.matchAll(/(\d*\.?\d+)(ms|s)(?![a-z])/g)]
      .map(([, value, unit]) => (unit === "s" ? Number(value) * 1000 : Number(value)));
    assert.ok(durations.length > 0, `transition declares a duration: ${declaration}`);
    for (const duration of durations) {
      assert.ok(duration < 300, `transition stays under 300ms: ${declaration}`);
    }
  }

  assert.match(html, /@media\(hover:hover\) and \(pointer:fine\)\{/);
  const gated = html.match(/@media\(hover:hover\) and \(pointer:fine\)\{([\s\S]*?)\}\r?\n/)?.[1] ?? "";
  assert.match(gated, /\.nav button:hover\{/);
  assert.match(gated, /\.button:hover\{/);
  assert.match(gated, /\.kpi:hover\{/);
  const reducedMotion = html.match(/@media\(prefers-reduced-motion:reduce\)\{([^@]*?)\}\r?\n/)?.[1] ?? "";
  assert.ok(reducedMotion, "reduced-motion block neutralizes motion");
  const ungatedHover = html.replace(gated, "").replace(reducedMotion, "");
  assert.doesNotMatch(ungatedHover, /:hover\{/, "hover styling only exists behind the pointer gate");

  assert.match(html, /\.button:active,\.nav button:active\{transform:scale\(\.97\)\}/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{[^@]*transform:none!important/);
});

test("static numeric payback card starts neutral before live rendering", async () => {
  const { html } = await loadApp();
  assert.match(html, /<article class="kpi" id="payback-card">/);
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
