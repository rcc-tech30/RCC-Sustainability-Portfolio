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

test("overview renders the three-bar emissions outcome comparison", async () => {
  const { html } = await loadApp();
  assert.match(html, /<h3 id="emissions-chart-title">Emissions outcome comparison<\/h3>/);
  assert.match(html, /FY2025 baseline compared with FY2030 transition emissions before and after EAC adjustment\./);
  assert.match(html, /const periodLabels = getEmissionsPeriodLabels\(scenario\.baselineYear, scenario\.targetYear\)/);
  assert.match(html, /const comparison = buildEmissionsComparison\(result, periodLabels\)/);
  assert.match(html, /q\("#emissions-chart"\)\.setAttribute\("aria-label", comparison\.ariaLabel\)/);
  assert.match(html, /q\("#emissions-chart"\)\.innerHTML = comparisonChart\(comparison, isCompactChart\(\)\)/);
  assert.match(html, /#emissions-chart-title,#emissions-summary\{[^}]*overflow-wrap:anywhere/);
  // The chart carries no literal emissions numbers of its own.
  assert.doesNotMatch(html, /170\.5\b/);
});

test("emissions comparison exposes exactly three bars in the approved order", async () => {
  const { model } = await loadApp();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const comparison = model.buildEmissionsComparison(result, model.getEmissionsPeriodLabels("FY2025", "FY2030"));

  assert.equal(comparison.bars.length, 3, "exactly three bars");
  assert.deepEqual(toHostRecord(comparison.bars.map(bar => bar.label)), [
    "FY2025 baseline",
    "FY2030 transition before EAC",
    "FY2030 transition after EAC",
  ]);
  assert.deepEqual(toHostRecord(comparison.bars.map(bar => bar.key)), ["baseline", "before", "after"]);

  // Every value is a live calculation, never a constant.
  assert.equal(comparison.bars[0].value, result.baselineTotalEmissions);
  assert.ok(close(comparison.bars[1].value, result.residualBeforeCertificates));
  assert.ok(close(comparison.bars[2].value, result.residualAfterCertificates));
  // Certificates never raise emissions.
  assert.ok(comparison.bars[1].value >= comparison.bars[2].value - 1e-9);
  // Scale comes from the largest bar so the baseline anchors the axis.
  assert.ok(comparison.max >= comparison.bars[0].value);
});

test("emissions comparison tracks scenario inputs instead of fixed numbers", async () => {
  const { model } = await loadApp();
  const labels = model.getEmissionsPeriodLabels("FY2025", "FY2030");
  const base = model.buildEmissionsComparison(model.calculateScenario(model.DEFAULT_SCENARIO), labels);
  const halved = model.buildEmissionsComparison(
    model.calculateScenario({ ...model.DEFAULT_SCENARIO, vehiclesTransitioning: 5 }), labels);
  assert.notEqual(base.bars[1].value, halved.bars[1].value, "fleet size moves the before-EAC bar");

  // EAC coverage moves the after-EAC bar specifically.
  const noCertificates = model.buildEmissionsComparison(
    model.calculateScenario({ ...model.DEFAULT_SCENARIO, targetCertificateCoverage: 0 }), labels);
  assert.ok(close(noCertificates.bars[1].value, noCertificates.bars[2].value),
    "with no certificate coverage the two transition bars converge");
  assert.notEqual(base.bars[2].value, noCertificates.bars[2].value);

  // Period labels drive the bar labels; nothing is hard-coded to FY2025/FY2030.
  const shifted = model.buildEmissionsComparison(
    model.calculateScenario(model.DEFAULT_SCENARIO),
    model.getEmissionsPeriodLabels("FY2031", "FY2040"));
  assert.deepEqual(toHostRecord(shifted.bars.map(bar => bar.label)), [
    "FY2031 baseline",
    "FY2040 transition before EAC",
    "FY2040 transition after EAC",
  ]);
});

test("intermediate-year trendline presentation is gone from the overview chart", async () => {
  const { html, model } = await loadApp();
  for (const gone of ["buildEmissionsPathway", "pathwayChart", "buildEmissionsYearSequence",
                      "PATHWAY_STROKES", "visualYear", "pathway-endpoint"]) {
    assert.ok(!html.includes(gone), `trendline remnant present: ${gone}`);
  }
  assert.equal(model.buildEmissionsPathway, undefined, "pathway builder is no longer exported");
  assert.equal(model.buildEmissionsYearSequence, undefined, "year sequence builder is no longer exported");
  // No modelled intermediate years anywhere: FY2026..FY2029 were never measured.
  for (const year of ["FY2026", "FY2027", "FY2028", "FY2029"]) {
    assert.ok(!html.includes(year), `intermediate year still rendered: ${year}`);
  }
  // Comparison has no year axis, so no per-year tick labels remain.
  assert.ok(!html.includes("straight-line transition"), "interpolation disclaimer no longer applies");
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

test("comparison chart geometry is explicit and compact navigation keeps every view visible", async () => {
  const { html } = await loadApp();
  assert.match(html, /\.nav\{display:flex;flex-wrap:wrap;overflow-x:visible/);
  assert.match(html, /\.content:focus\{outline:none\}/);
  // Bars are laid out on an explicit row pitch, tightened at desktop, and a shared track width.
  assert.match(html, /const rowH = compact \? 62 : \(isDenseChart\(\) \? 50 : 66\)/);
  assert.match(html, /const barH = compact \? 18 : \(isDenseChart\(\) \? 20 : 22\)/);
  assert.match(html, /const trackW = width - left - right/);
  assert.match(html, /fill="\$\{fill\}"/);
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
    "kpi-scope2-increase-sub-full",
    "kpi-residual",
    "kpi-residual-sub",
    "kpi-residual-sub-full",
    "kpi-investment",
    "kpi-investment-sub",
    "kpi-investment-sub-full",
    "kpi-payback",
    "kpi-payback-sub",
    "kpi-payback-sub-full",
  ]);
  // Payback stays qualified wherever it is surfaced.
  assert.match(strip, /Simple payback/);
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
  assert.match(html, /Based on \$\{formatMoney\(interpretation\.annualSavings\)\} of annual operating savings/);
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
    /[\u25B2\u25BC\u26A1\u2B50\uD83D]/, "no emoji glyphs stand in for icons");
  // The one arrow in the file is the Scope 2 range notation, never an icon.
  assert.equal((html.match(/\u2192/g) || []).length, 2, "arrows only in the Scope 2 range: markup default + its template");
  assert.match(html, /\$\{formatNumber\(result\.baselineGridScope2, 2\)\} \u2192 /);
});

test("overview keeps a single visible axis sequence and one scale", async () => {
  const { html } = await loadApp();
  assert.match(html, /function comparisonChart\(comparison, compact = false\)/);
  assert.match(html, /compactChartQuery\.addEventListener\("change", render\)/);
  // One scale for all three bars, derived from the largest value.
  assert.match(html, /const \{ max \} = niceAxisScale\(comparison\.max\)/);
  assert.match(html, /const widthAt = value => Math\.max\(Math\.min\(value \/ max, 1\) \* trackW/);
  // Each bar is directly labelled, so identity never rests on colour alone.
  assert.match(html, /escapeHtml\(bar\.label\)/);
  assert.match(html, /const COMPARISON_FILLS = Object\.freeze\(\{ baseline: "#94a3b8", before: "#2563c4", after: "#087f5b" \}\)/);
  // No second scale and no year axis.
  assert.ok(!html.includes("axisLabels"), "no year axis remains");
});

test("comparison card keeps the .panel-pathway compatibility class", async () => {
  const { html } = await loadApp();
  assert.match(html, /<article class="panel panel-chart panel-pathway">/);
  assert.ok(!html.includes("panel-comparison"), "renamed class must not linger");
  // The approved card contract rides along with it.
  assert.match(html, /<h3 id="emissions-chart-title">Emissions outcome comparison<\/h3>/);
  assert.match(html, /FY2025 baseline compared with FY2030 transition emissions before and after EAC adjustment\./);
  // Three bars, still built from the scenario, and no legend is populated.
  assert.match(html, /const comparison = buildEmissionsComparison\(result, periodLabels\)/);
  assert.ok(!html.includes('q("#emissions-legend").innerHTML'), "legend stays unpopulated");
  assert.match(html, /\.chart-legend:empty\{display:none/);
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
  // Approved bar labels, each appearing once in the builder.
  assert.equal(html.split("transition before EAC").length - 1, 1, "one before-EAC bar label");
  assert.equal(html.split("transition after EAC").length - 1, 1, "one after-EAC bar label");
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

test("approved copy refinements are in place", async () => {
  const { html } = await loadApp();
  // Board interpretation is now Insights; the id and aria wiring survive.
  assert.match(html, /<h2 id="board-interpretation-title">Scenario notes<\/h2>/);
  assert.ok(!html.includes("Board interpretation"), "old heading must be gone");
  assert.match(html, /id="board-interpretation"[^>]*aria-labelledby="board-interpretation-title"/);

  // The bottom footer sentence is removed entirely.
  assert.ok(!html.includes("Illustrative portfolio data. Scenario information stays in your browser and is not transmitted. Created by Reiniel Celgie Chan."),
    "footer note must be gone");

  // Sidebar footer carries the approved three lines.
  assert.match(html, /<p class="sidebar-note">Illustrative fleet electrification planning tool<br>RCC Sustainability Portfolio<br>Project done by Reiniel Celgie Chan\.<\/p>/);
  assert.ok(!html.includes(">Illustrative planning tool<br>"), "old sidebar copy must be gone");
});

test("desktop density scale is measured, never a zoom or transform hack", async () => {
  const { html } = await loadApp();
  const rule = html.match(/@media\(min-width:1101px\)\{[^}]*\}/)?.[0] ?? html.match(/@media\(min-width:1101px\)\{[\s\S]*?\n/)?.[0] ?? "";
  assert.ok(html.includes("@media(min-width:1101px)"), "desktop-only density block exists");
  // Never these: they break responsiveness and accessibility zoom.
  assert.ok(!/[^-]\bzoom:/.test(html), "no CSS zoom");
  assert.ok(!html.includes("-webkit-text-size-adjust:none"), "no text-size-adjust lock");
  assert.ok(!/transform:\s*scale\(/.test(html), "no layout-scaling transform");
});

test("approved chart contract survives the refinement pass", async () => {
  const { html } = await loadApp();
  assert.match(html, /<article class="panel panel-chart panel-pathway">/);
  assert.match(html, /<h3 id="emissions-chart-title">Emissions outcome comparison<\/h3>/);
  assert.match(html, /\$\{baselineYear\} baseline/);
  assert.match(html, /\$\{targetYear\} transition before EAC/);
  assert.match(html, /\$\{targetYear\} transition after EAC/);
  assert.ok(!html.includes('q("#emissions-legend").innerHTML'), "legend stays unpopulated");
  // Cards share one stretched desktop row: equal outer heights are approved.
  const grid = html.match(/#view-overview \.chart-grid\{[^}]*\}/)?.[0];
  assert.match(grid, /align-items:stretch/);
  assert.match(html, /id="edit-scenario-button"/);
  assert.match(html, /<span class="status" id="data-status">Sample Data<\/span>/);
});

test("desktop navigation rail paints through the full document height", async () => {
  const { html } = await loadApp();
  // The navy column is a stretched grid item, so it grows with the document
  // instead of being capped at one viewport.
  const shell = html.match(/\.app-shell\{[^}]*\}/)?.[0] ?? "";
  assert.match(shell, /grid-template-columns:248px minmax\(0,1fr\)/, "desktop rail width unchanged");
  assert.match(shell, /min-height:100dvh/, "shell still reserves a full viewport row");
  const sidebar = html.match(/\.sidebar\{[^}]*\}/)?.[0] ?? "";
  assert.ok(!/[;{]height:/.test(sidebar), "no fixed height: the rail stretches with the grid row");
  assert.match(sidebar, /min-height:100dvh/, "still covers short pages");
  assert.ok(!/position:sticky/.test(sidebar), "stickiness moves to the inner column");
  assert.match(sidebar, /background:var\(--navy\)/, "rail keeps its navy ground");

  // Sticky usability is preserved by an inner column that pins to the top.
  assert.match(html, /<aside class="sidebar" aria-label="Assessment navigation">\s*<div class="sidebar-inner">/);
  const inner = html.match(/\.sidebar-inner\{[^}]*\}/)?.[0] ?? "";
  assert.match(inner, /position:sticky/);
  assert.match(inner, /top:0/);
  assert.match(inner, /flex-direction:column/, "sidebar-note still pushes to the bottom");

  // Below 900px the rail is an ordinary block again.
  const mobile = html.match(/@media\(max-width:900px\)\{[\s\S]*?\n/)?.[0] ?? "";
  assert.match(mobile, /\.sidebar-inner\{[^}]*position:static/, "mobile rail is not sticky");
});

test("desktop comparison and scenario cards share one stretched row", async () => {
  const { html } = await loadApp();
  const grid = html.match(/#view-overview \.chart-grid\{[^}]*\}/)?.[0] ?? "";
  assert.match(grid, /align-items:stretch/, "equal outer heights are the approved desktop behaviour");
  assert.ok(!/align-items:start/.test(grid), "content-fit is superseded");
  assert.match(grid, /grid-template-columns:minmax\(0,1\.9fr\) minmax\(260px,1fr\)/, "column ratio unchanged");
  // Stacked below 900px: no cross-row equal heights on tablet or phone.
  const mobile = html.match(/@media\(max-width:900px\)\{[\s\S]*?\n/)?.[0] ?? "";
  assert.match(mobile, /#view-overview \.chart-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(html, /<article class="panel panel-chart panel-pathway">/);
  assert.match(html, /id="scenario-rail"/);
  // Both stay independent surfaces, and the edit action stays at the foot of the rail.
  assert.match(html, /\.scenario-rail\{display:flex;flex-direction:column;border:1px solid var\(--line\);border-radius:var\(--radius-panel\);background:var\(--white\);box-shadow:var\(--shadow-card\)\}/);
  assert.match(html, /\.rail-edit\{margin-top:auto/);
});

test("desktop overview density is a declared rhythm, never clipping or scaling", async () => {
  const { html } = await loadApp();
  const dense = html.match(/@media\(min-width:1101px\)\{[\s\S]*?\n/)?.[0] ?? "";
  assert.ok(dense, "desktop density block exists");

  // One declared rhythm drives the overview stack instead of scattered magic numbers.
  assert.match(dense, /#view-overview\{[^}]*--ov-gap:10px/, "section rhythm token");
  assert.match(dense, /#view-overview\{[^}]*--ov-pad:14px/, "card padding token");
  assert.match(dense, /margin-top:var\(--ov-gap\)/, "stack gaps consume the token");

  // The fit is earned by spacing, never by hiding or shrinking the page.
  assert.ok(!/[^-]\bzoom:/.test(html), "no CSS zoom");
  assert.ok(!/transform:\s*scale\(/.test(html), "no layout-scaling transform");
  assert.ok(!/#view-overview\{[^}]*overflow:hidden/.test(html), "overview is never clipped");
  assert.ok(!/\.content\{[^}]*overflow:hidden/.test(html), "content column is never clipped");

  // Readable minimums survive the compaction.
  const tooSmall = [...dense.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1])).filter(n => n < 11);
  assert.deepEqual(tooSmall, [], "no desktop text below 11px");
});

test("supporting metric cards carry simplified titles and concise dynamic summaries", async () => {
  const { html } = await loadApp();
  for (const label of ["Scope 1 avoided", "Scope 2 added", "Residual emissions", "Net investment", "Simple payback"]) {
    assert.match(html, new RegExp(`<span class="label">${label}</span>`), `${label} title`);
  }
  assert.ok(!html.includes('<span class="label">Residual after certificates</span>'), "verbose residual title is gone");
  assert.ok(!html.includes('<span class="label">Indicative simple payback</span>'), "verbose payback title is gone");

  // Summaries stay derived from the model, never hardcoded in application logic.
  assert.match(html, /#sub-scope1"\)\.textContent = `\$\{scenario\.targetYear\}`/);
  assert.match(html, /#kpi-scope2-increase-sub"\)\.textContent = `\$\{formatNumber\(result\.baselineGridScope2, 2\)\} → \$\{formatT\(result\.postTransitionGridScope2\)\}`/);
  assert.match(html, /#kpi-residual-sub"\)\.textContent = `Pre-EAC: \$\{formatT\(result\.residualBeforeCertificates\)\}`/);
  assert.match(html, /#kpi-investment-sub"\)\.textContent = `vs new ICE: \$\{formatMoneyShort\(result\.incrementalInvestment\)\}`/);
  assert.match(html, /formatMoney\(interpretation\.annualSavings\)\}\/yr savings`/);
  assert.match(html, /const formatMoneyShort = /, "compact money formatter exists");

  // Abbreviated text keeps its full meaning for assistive tech; nothing is clipped away.
  for (const id of ["sub-scope1", "kpi-scope2-increase-sub", "kpi-residual-sub", "kpi-investment-sub", "kpi-payback-sub"]) {
    assert.match(html, new RegExp(`id="${id}-full" class="sr-only"`), `${id} full text`);
  }
  assert.ok(!/-webkit-line-clamp/.test(html), "no line clamping on the summaries");
});

test("lower notes section is neutrally titled Scenario notes", async () => {
  const { html } = await loadApp();
  assert.match(html, /<h2 id="board-interpretation-title">Scenario notes<\/h2>/);
  assert.equal((html.match(/Scenario notes/g) || []).length, 1, "appears exactly once");
  assert.ok(!html.includes("Board interpretation"), "no board-approved framing");
  assert.ok(!html.includes(">Insights<"), "previous heading replaced");
  assert.match(html, /Payback outlook/);
  assert.match(html, /Important limitation/);
});

test("simple KPI cards keep the left-icon, left-aligned treatment", async () => {
  const { html } = await loadApp();
  assert.ok(!/#view-overview \.kpi-lead,#view-overview #fleet-card\{[^}]*text-align:center/.test(html),
    "no centred simple-card pattern");
  assert.ok(!/#fleet-card \.kpi-body\{[^}]*align-items:center/.test(html), "body stays left");
  // Row flow with the icon first is the approved treatment.
  assert.match(html, /#view-overview \.kpi\{min-height:0;padding:18px 20px;display:flex;flex-direction:row/);
  assert.match(html, /<article class="kpi kpi-lead good" id="net-emissions-card"><span class="kpi-icon">/);
  assert.match(html, /<article class="kpi" id="fleet-card"><span class="kpi-icon">/);
});

test("annual operating impact drops the redundant delta but keeps its live comparison", async () => {
  const { html } = await loadApp();
  assert.ok(!html.includes("compare-delta"), "delta block removed");
  assert.ok(!html.includes("operating-delta"), "delta element and its writer are gone");
  assert.ok(!html.includes("delta-value"), "delta styles removed with it");
  assert.ok(!html.includes("per year</span>"), "no orphaned delta unit");
  // The headline figure and both bars stay model-driven.
  assert.match(html, /q\("#kpi-operating"\)\.textContent = formatMoney\(result\.annualOperatingChange\)/);
  assert.match(html, /q\("#operating-bar-baseline"\)\.style\.width = `\$\{baselineEnergyCost \/ energyCostScale \* 100\}%`/);
  assert.match(html, /q\("#operating-bar-transition"\)\.style\.width = `\$\{transitionEnergyCost \/ energyCostScale \* 100\}%`/);
  assert.match(html, /id="operating-baseline"/);
  assert.match(html, /id="operating-transition"/);
  // Its own grid collapses to one column now that nothing sits beside the bars.
  assert.match(html, /#view-overview \.kpi-operating\{display:grid;grid-template-columns:minmax\(0,1fr\);/);
});

test("desktop KPI grid gives net emissions measured prominence without decoration", async () => {
  const { html } = await loadApp();
  const grid = html.match(/#view-overview \.kpi-grid\{[^}]*\}/)?.[0] ?? "";
  assert.match(grid, /grid-template-columns:minmax\(0,1\.2fr\) minmax\(0,1fr\) minmax\(0,1fr\)/,
    "lead card wider, the other two equal");
  assert.match(grid, /align-items:stretch/, "one equal-height row");
  const lead = html.match(/#view-overview \.kpi-lead\{[^}]*\}/)?.[0] ?? "";
  assert.match(lead, /border-color:var\(--emerald-line\)/, "restrained emerald border");
  assert.match(lead, /background:linear-gradient\(/, "subtle aurora surface");
  assert.ok(!/animation:/.test(lead), "no animated gradient");
  assert.ok(!/box-shadow:0 0/.test(lead), "no neon glow");
  assert.ok(!/filter:/.test(lead), "no decorative filter");
});
