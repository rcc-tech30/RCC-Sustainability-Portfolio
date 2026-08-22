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

test("overview emissions pathway renders exactly two EAC-labelled series", async () => {
  const { html } = await loadApp();
  assert.match(html, /<h3 id="emissions-chart-title">Emissions pathway<\/h3>/);
  assert.match(html, /const periodLabels = getEmissionsPeriodLabels\(scenario\.baselineYear, scenario\.targetYear\)/);
  assert.match(html, /const pathway = buildEmissionsPathway\(result, periodLabels\)/);
  assert.match(html, /q\("#emissions-chart"\)\.setAttribute\("aria-label", periodLabels\.ariaLabel\)/);
  assert.match(html, /q\("#emissions-chart-period"\)\.textContent/);
  assert.match(html, /#emissions-chart-title,#emissions-summary\{[^}]*overflow-wrap:anywhere/);
  assert.match(html, /q\("#emissions-chart"\)\.innerHTML = pathwayChart\(pathway, isCompactChart\(\)\)/);
  assert.match(html, /q\("#emissions-legend"\)\.innerHTML = pathway\.series\.map/);
  assert.match(html, /periodLabels\.baselineYear/);
  assert.match(html, /periodLabels\.targetYear/);
  // The pathway carries no literal emissions numbers of its own.
  assert.doesNotMatch(html, /170\.5\b/);
});

test("emissions pathway derives one shared start and two certificate-aware endpoints", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const labels = model.getEmissionsPeriodLabels("FY2025", "FY2030");
  const pathway = model.buildEmissionsPathway(result, labels);

  assert.equal(pathway.series.length, 2, "exactly two trendlines");
  assert.deepEqual(toHostRecord(pathway.series.map(series => series.label)), ["Before EAC", "After EAC"]);
  assert.deepEqual(toHostRecord(pathway.series.map(series => series.key)), ["before", "after"]);

  // One FY sequence, FY2030 present exactly once.
  assert.deepEqual(toHostRecord(pathway.points.map(point => point.year)),
    ["FY2025", "FY2026", "FY2027", "FY2028", "FY2029", "FY2030"]);
  assert.equal(pathway.points.filter(point => point.year === "FY2030").length, 1);

  // Shared FY2025 start comes from the calculated baseline, endpoints from the calculated residuals.
  assert.equal(pathway.points[0].before, result.baselineTotalEmissions);
  assert.equal(pathway.points[0].after, result.baselineTotalEmissions);
  assert.equal(pathway.startValue, result.baselineTotalEmissions);
  assert.ok(close(pathway.points.at(-1).before, result.residualBeforeCertificates));
  assert.ok(close(pathway.points.at(-1).after, result.residualAfterCertificates));
  assert.ok(close(pathway.beforeEnd, result.residualBeforeCertificates));
  assert.ok(close(pathway.afterEnd, result.residualAfterCertificates));

  // Before EAC never sits below After EAC when certificates reduce Scope 2.
  pathway.points.forEach(point => assert.ok(point.before >= point.after - 1e-9));
});

test("emissions pathway tracks scenario inputs instead of fixed numbers", async () => {
  const { model } = await loadApp();
  const labels = model.getEmissionsPeriodLabels("FY2025", "FY2030");
  const base = model.buildEmissionsPathway(
    model.calculateScenario(model.DEFAULT_SCENARIO), labels);
  const halved = model.buildEmissionsPathway(
    model.calculateScenario({ ...model.DEFAULT_SCENARIO, vehiclesTransitioning: 5 }), labels);

  assert.notEqual(base.beforeEnd, halved.beforeEnd);
  assert.notDeepEqual(
    toHostRecord(base.series[0].values.map(value => value.toFixed(4))),
    toHostRecord(halved.series[0].values.map(value => value.toFixed(4))));

  const noCertificates = model.buildEmissionsPathway(
    model.calculateScenario({ ...model.DEFAULT_SCENARIO, targetCertificateCoverage: 0 }), labels);
  assert.ok(close(noCertificates.beforeEnd, noCertificates.afterEnd),
    "with no certificate coverage both pathways converge");
});

test("emissions pathway year sequence degrades safely for unparsable periods", async () => {
  const { model } = await loadApp();
  assert.deepEqual(toHostRecord(model.buildEmissionsYearSequence("FY2025", "FY2030")),
    ["FY2025", "FY2026", "FY2027", "FY2028", "FY2029", "FY2030"]);
  assert.deepEqual(toHostRecord(model.buildEmissionsYearSequence("2025", "2027")), ["2025", "2026", "2027"]);
  assert.equal(model.buildEmissionsYearSequence("FY2030", "FY2025"), null, "no backwards periods");
  assert.equal(model.buildEmissionsYearSequence("FY2025", "FY2025"), null, "no zero-length periods");
  assert.equal(model.buildEmissionsYearSequence("FY2025", "CY2030"), null, "prefixes must match");
  assert.equal(model.buildEmissionsYearSequence("FY2025", "FY2999"), null, "spans stay chartable");
  assert.equal(model.buildEmissionsYearSequence("Baseline year", "Target year"), null);

  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const fallback = model.buildEmissionsPathway(
    result, model.getEmissionsPeriodLabels("Baseline year", "Target year"));
  assert.deepEqual(toHostRecord(fallback.points.map(point => point.year)), ["Baseline year", "Target year"]);
  assert.ok(close(fallback.points.at(-1).after, result.residualAfterCertificates));
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
  assert.ok(close(story.netEmissionsPct, 21.937536 / result.baselineTotalEmissions * 100));
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
    netEmissionsPct: -20 / 150 * 100,
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
    netEmissionsPct: 0,
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
  // Five sidebar nav targets, plus the overview rail's edit shortcut.
  const navMarkup = html.match(/<nav class="nav">([\s\S]*?)<\/nav>/)?.[1] ?? "";
  assert.equal((navMarkup.match(/data-view-target=/g) || []).length, 5);
  assert.equal((html.match(/data-view-target=/g) || []).length, 6);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label for="\$\{name\}">\$\{label\}<\/label>/);
  assert.match(html, /\["totalIceVehicles", "Total ICE vehicles"/);
  assert.equal((html.match(/class="chart-summary"/g) || []).length, 1);
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

test("pathway chart geometry is explicit and compact navigation keeps every view visible", async () => {
  const { html } = await loadApp();
  assert.match(html, /\.nav\{display:flex;flex-wrap:wrap;overflow-x:visible/);
  assert.match(html, /\.content:focus\{outline:none\}/);
  assert.match(html, /const line = points => `M\$\{points\.map/);
  assert.match(html, /stroke="\$\{item\.stroke\}"/);
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

test("overview ranks the eight-card KPI story into primary and subordinate groups", async () => {
  const { html } = await loadApp();

  // Three dominant KPIs, net emissions change first and visually led.
  const grid = html.match(/<div class="kpi-grid">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(grid, "Overview KPI grid exists");
  assert.deepEqual([...grid.matchAll(/id="(kpi-[^"]+)"/g)].map(m => m[1]), [
    "kpi-net-emissions",
    "kpi-net-emissions-sub",
    "kpi-operating",
    "kpi-fleet",
    "kpi-fleet-sub",
  ]);
  assert.match(grid, /class="kpi kpi-lead good" id="net-emissions-card"/);

  // Five subordinate metrics, payback last and never presented as the headline.
  const strip = html.match(/<div class="metric-row">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(strip, "Overview subordinate metric row exists");
  assert.deepEqual([...strip.matchAll(/id="(kpi-[^"]+)"/g)].map(m => m[1]), [
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
  // Payback stays qualified wherever it is surfaced.
  assert.match(strip, /Indicative simple payback/);
  assert.ok(html.indexOf('<div class="kpi-grid">') < html.indexOf('<div class="metric-row">'),
    "primary KPIs precede the subordinate metric row");

  assert.doesNotMatch(grid, /BEV electricity added|Additional certificate cost/);
  assert.match(html, /\["BEV electricity added",`\$\{formatNumber\(result\.bevElectricityAdded\)\} kWh`/);
  assert.match(html, /\["Additional certificate cost",formatMoney\(result\.additionalCertificateCost\)/);
});

test("overview keeps a compact scenario summary and an editable scenario rail", async () => {
  const { html } = await loadApp();

  // Compact summary strip near the top, before the KPIs.
  const strip = html.match(/<div class="summary-strip">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(strip, "Overview exposes a scenario summary strip");
  for (const id of ["scenario-company", "overview-period", "scenario-method", "overview-status"]) {
    assert.match(strip, new RegExp(`id="${id}"`), `summary strip states ${id}`);
  }
  assert.ok(html.indexOf('<div class="summary-strip">') < html.indexOf('<div class="kpi-grid">'),
    "summary strip sits above the KPIs");

  // Scenario rail stays visible with a direct route into the inputs view.
  assert.match(html, /id="scenario-rail"/);
  assert.match(html, /id="edit-scenario-button"[^>]*data-view-target="inputs"/);
  assert.match(html, /id="rail-fleet"/);
  assert.match(html, /id="rail-period"/);
  assert.match(html, /id="rail-method"/);

  // Mirrors are populated by the same render pass as the header fields.
  assert.match(html, /q\("#overview-period"\)\.textContent/);
  assert.match(html, /q\("#overview-status"\)\.textContent/);
});

test("static numeric payback card starts neutral before live rendering", async () => {
  const { html } = await loadApp();
  assert.match(html, /<article class="metric-card" id="payback-card">/);
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

test("overview cards stay independent and icon-led without placeholder glyphs", async () => {
  const { html } = await loadApp();

  // Every overview card carries its own border, radius and shadow.
  assert.match(html, /\.kpi\{[^}]*border:1px solid var\(--line\)/);
  assert.match(html, /\.kpi\{[^}]*border-radius:var\(--radius-panel\)/);
  assert.match(html, /\.kpi\{[^}]*box-shadow:var\(--shadow-card\)/);
  assert.match(html, /\.metric-card\{[^}]*border:1px solid var\(--line\)/);
  assert.match(html, /\.metric-card\{[^}]*box-shadow:var\(--shadow-card\)/);
  assert.match(html, /\.panel\{[^}]*border:1px solid var\(--line\)/);
  assert.match(html, /\.panel\{[^}]*box-shadow:var\(--shadow-card\)/);
  assert.match(html, /\.scenario-rail\{[^}]*box-shadow:var\(--shadow-card\)/);

  // Icons are inline stroked SVG symbols, not text glyphs.
  const sprite = html.match(/<svg class="icon-sprite"[\s\S]*?<\/svg>/)?.[0] ?? "";
  assert.ok(sprite, "overview ships an inline icon sprite");
  for (const id of ["icon-trend-down", "icon-truck", "icon-factory", "icon-bolt",
                    "icon-cloud", "icon-coin", "icon-clock", "icon-pencil", "icon-info"]) {
    assert.match(sprite, new RegExp(`<symbol id="${id}"`), `sprite defines ${id}`);
  }
  assert.equal((html.match(/<use href="#icon-/g) || []).length,
    (html.match(/<use href="#icon-/g) || []).length);
  assert.doesNotMatch(html.match(/<div class="metric-row">[\s\S]*?<\/div>/)?.[0] ?? "",
    /[\u2192\u25B2\u25BC\u26A1\u2B50\uD83D]/, "no emoji or arrow glyphs stand in for icons");
});

test("overview keeps a single visible axis sequence and one scale", async () => {
  const { html } = await loadApp();
  assert.match(html, /function pathwayChart\(pathway, compact = false\)/);
  assert.match(html, /compactChartQuery\.addEventListener\("change", render\)/);
  // Axis labels come from the shared point list, so a year cannot be drawn twice.
  assert.match(html, /pathway\.points\.map\(\(point, index\) =>/);
  assert.match(html, /escapeHtml\(point\.visualYear\)/);
  // Endpoint callouts live in the right gutter, never as extra axis ticks.
  assert.match(html, /class="pathway-endpoint"/);
  assert.match(html, /const PATHWAY_STROKES = /);
});

test("overview desktop sidebar spans the full viewport height", async () => {
  const { html } = await loadApp();
  // Shell reserves a full viewport row, and the rail itself fills it.
  assert.match(html, /\.app-shell\{min-height:100dvh;/);
  assert.match(html, /\.sidebar\{position:sticky;top:0;height:100dvh;/);
  // Mobile/tablet collapse is untouched: the sidebar returns to auto height.
  assert.match(html, /\.sidebar\{position:relative;height:auto;/);
});

test("analysis row stretches the pathway and scenario cards to equal height", async () => {
  const { html } = await loadApp();
  const rule = html.match(/#view-overview \.chart-grid\{[^}]*\}/)?.[0];
  assert.ok(rule, "overview chart grid rule exists");
  assert.match(rule, /align-items:stretch/);
  assert.doesNotMatch(rule, /align-items:start/);
  // Both stay independent surfaces: each keeps its own border, radius and shadow.
  assert.match(html, /\.scenario-rail\{display:flex;flex-direction:column;border:1px solid var\(--line\);border-radius:var\(--radius-panel\);background:var\(--white\);box-shadow:var\(--shadow-card\)\}/);
  // Edit action is pinned to the bottom of the rail rather than trailing the list.
  assert.match(html, /\.rail-edit\{margin-top:auto/);
});

test("scenario rail states the modelled EAC rate and keeps it live", async () => {
  const { html } = await loadApp();
  assert.match(html, /<dt>EAC rate<\/dt><dd id="rail-eac">/);
  // Derived from the existing scenario input, never hard-coded.
  assert.match(html, /q\("#rail-eac"\)\.textContent = `\$\{formatMoney\(scenario\.certificateCostPerKwh, 3\)\}\/kWh`/);
  // Formatted like the other per-unit rail rows.
  assert.match(html, /q\("#rail-grid"\)\.textContent = `\$\{formatNumber\(scenario\.gridEmissionFactor,2\)\} kgCO2e\/kWh`/);
});

test("approved emissions chart semantics stay put", async () => {
  const { html } = await loadApp();
  // Exactly two series, labelled as approved.
  assert.equal(html.split("Before EAC").length - 1, 1, "one Before EAC label");
  assert.equal(html.split("After EAC").length - 1, 1, "one After EAC label");
  assert.match(html, /id="emissions-legend"/);
});

test("topbar carries only the sample-data status, no report actions", async () => {
  const { html } = await loadApp();
  const topbar = html.match(/<header class="topbar">[\s\S]*?<\/header>/)?.[0];
  assert.ok(topbar, "topbar exists");
  // The free dashboard exposes no Save, Export or Print control.
  for (const fragment of ['id="save-button"', 'id="export-button"', 'id="print-button"',
                          ">Save<", "Export report", "Print report"]) {
    assert.ok(!topbar.includes(fragment), `topbar must not contain ${fragment}`);
  }
  // Their click handlers go with them.
  for (const handler of ['q("#save-button")', 'q("#export-button")', 'q("#print-button")']) {
    assert.ok(!html.includes(handler), `dangling handler ${handler}`);
  }
  // Status stays, as a status and not as a button.
  assert.match(topbar, /<span class="status" id="data-status">Sample Data<\/span>/);
  assert.ok(!/<button/.test(topbar), "topbar exposes no buttons at all");
  // Scenario reset and the rail's edit action are untouched.
  assert.match(html, /id="reset-button"/);
  assert.match(html, /id="edit-scenario-button"[^>]*data-view-target="inputs"/);
});

test("decision overview states the approved supporting sentence", async () => {
  const { html } = await loadApp();
  assert.match(html, /<p class="eyebrow">Decision overview<\/p>/);
  assert.match(html, /<p class="overview-lede">Emissions, investments, and operating impact for the selected scenario\.<\/p>/);
  // Retired wording must not linger.
  assert.ok(!html.includes("Emissions, investment and annual operating impact of replacing"),
    "previous lede must be gone");
});

test("empty alert region does not open a gap above the summary card", async () => {
  const { html } = await loadApp();
  // The alert region keeps its spacing only when it actually holds messages.
  assert.match(html, /\.warning-stack:empty\{margin:0\}/);
  // It stays in the DOM and stays announced: never display:none, or the live
  // region can stop announcing validation errors.
  assert.ok(!/\.warning-stack:empty\{[^}]*display:none/.test(html), "live region must not be hidden");
  assert.match(html, /id="warning-stack"[^>]*aria-live="assertive"/);
  // Deliberate desktop gap between the supporting sentence and the first card.
  assert.match(html, /\.overview-head\{display:block;margin:0 0 18px\}/);
});
