import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadCore() {
  const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const script = html.match(/<script id="dashboard-core">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "dashboard core script should be present");
  const context = { globalThis: {} };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.globalThis.CompanyXDashboard;
}

test("quality metrics separate completeness, data basis, and supplier-specific Scope 3 share", () => {
  const core = loadCore();
  const records = [
    { scope: "Scope 1", emissions: 100, coverage: 80, dataBasis: "Physical activity data", supplierSpecific: false, method: "Fuel consumption-based" },
    { scope: "Scope 3", emissions: 60, coverage: 100, dataBasis: "Physical activity data", supplierSpecific: true, method: "Waste-type-specific" },
    { scope: "Scope 3", emissions: 40, coverage: 90, dataBasis: "Financial activity data", supplierSpecific: false, method: "Spend-based" }
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(core.getQualityMetrics(records))),
    {
      inventoryCoverage: 90,
      physicalShare: 80,
      spendShare: 20,
      supplierSpecificShare: 60,
      methodMix: {
        "Fuel consumption-based": 100,
        "Waste-type-specific": 60,
        "Spend-based": 40
      }
    }
  );
});

test("FY2026 quality metrics use the dashboard's detailed calculation methods", () => {
  const core = loadCore();
  const metrics = core.getQualityMetrics(core.DATA.filter((record) => record.fy === "FY2026"));

  assert.equal(metrics.inventoryCoverage.toFixed(1), "92.6");
  assert.equal(metrics.physicalShare.toFixed(1), "32.6");
  assert.equal(metrics.spendShare.toFixed(1), "49.1");
  assert.equal(metrics.supplierSpecificShare.toFixed(1), "10.9");
  assert.deepEqual(
    JSON.parse(JSON.stringify(metrics.methodMix)),
    {
      "Fuel consumption-based": 96,
      "Refrigerant mass-balance": 20,
      "Electricity consumption-based": 224,
      "Spend-based": 550,
      "Supplier-specific": 60,
      "Waste-type-specific": 25,
      "Distance-based": 145
    }
  );
});

test("supplier-specific share is not applicable when the filtered view has no Scope 3 records", () => {
  const core = loadCore();
  const metrics = core.getQualityMetrics([
    { scope: "Scope 2", emissions: 100, coverage: 100, dataBasis: "Physical activity data", supplierSpecific: false, method: "Electricity consumption-based" }
  ]);

  assert.equal(metrics.supplierSpecificShare, null);
});

test("net-zero progress measures achievement against the FY2030 reduction requirement", () => {
  const core = loadCore();
  const view = core.getNetZeroView("FY2026", 1240, 1120);

  assert.equal(view.reductionAchieved, 120);
  assert.equal(view.reductionPercent.toFixed(1), "9.7");
  assert.equal(view.target2030, 806);
  assert.equal(view.totalReductionRequired, 434);
  assert.equal(view.gapTo2030, 314);
  assert.equal(view.progressTo2030.toFixed(1), "27.6");
  assert.equal(view.points.at(-1).label, "FY2050");
  assert.equal(view.points.at(-1).value, 0);
});

test("entity, facility, and method selections are treated as subset filters", () => {
  const core = loadCore();

  assert.equal(core.hasSubsetFilter({ fy: "FY2026", entity: "All", facility: "All", method: "All" }), false);
  assert.equal(core.hasSubsetFilter({ fy: "FY2026", entity: "All", facility: "All", method: "Spend-based" }), true);
  assert.equal(core.hasSubsetFilter({ fy: "FY2026", entity: "Operations", facility: "All", method: "All" }), true);
});

test("filtered overview trend contains comparable annual actuals without corporate targets", () => {
  const core = loadCore();

  assert.deepEqual(
    JSON.parse(JSON.stringify(core.getActualTrendPoints(540, 550))),
    [
      { label: "FY2025", note: "Baseline", value: 540 },
      { label: "FY2026", note: "Latest actual", value: 550 }
    ]
  );
});


test("monthly comparison uses Australian financial-year month order and reconciles to annual totals", () => {
  const core = loadCore();
  assert.deepEqual(JSON.parse(JSON.stringify(core.MONTHS)), ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"]);
  const series = core.getMonthlyComparison(core.DATA, "Scope 1");
  assert.deepEqual(JSON.parse(JSON.stringify(series.map((item) => item.values.length))), [12, 12]);
  for (const item of series) {
    const monthlyTotal = item.values.reduce((total, point) => total + point.value, 0);
    assert.ok(Math.abs(monthlyTotal - item.total) < 1e-9);
  }
  assert.equal(series[0].total, 140);
  assert.equal(series[1].total, 116);
});

test("monthly Scope 2 comparison supports location-based values", () => {
  const core = loadCore();
  const market = core.getMonthlyComparison(core.DATA, "Scope 2", "emissions");
  const location = core.getMonthlyComparison(core.DATA, "Scope 2", "locationEmissions");
  assert.equal(market[0].total, 300);
  assert.equal(market[1].total, 224);
  assert.equal(location[0].total, 352);
  assert.equal(location[1].total, 329);
  assert.equal(location[1].values.length, 12);
});

test("monthly chart legend uses explicit line swatches and the renewable card names FY2026 in its heading", () => {
  const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");

  assert.match(html, /monthly-legend-item \.legend-line/);
  assert.match(html, /FY2025[^<]*baseline/);
  assert.match(html, /FY2026[^<]*comparison/);
  assert.match(html, /panel\("FY2026 renewable electricity progress", ""/);
  assert.doesNotMatch(html, /panel\("Renewable electricity progress", "FY2026 renewable share by facility"/);
});
test("monthly comparison renders smooth paths with endpoint values and no circle markers", () => {
  const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const source = html.match(/function monthlyComparisonChart[\s\S]*?function netZeroPathwayChart/)?.[0];
  assert.ok(source, "monthly chart renderer should be present");
  assert.match(source, /smoothPath/);
  assert.match(source, /chart-value-label/);
  assert.doesNotMatch(source, /<circle/);
});

test("monthly comparison labels every month above and below the shared chart lines", () => {
  const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const source = html.match(/function monthlyComparisonChart[\s\S]*?function netZeroPathwayChart/)?.[0];
  assert.ok(source, "monthly chart renderer should be present");
  assert.match(source, /const valueLabels = points\.map/);
  assert.match(source, /const isUpperSeries = seriesIndex === 0/);
  assert.match(source, /const offset = isUpperSeries \? -9/);
  assert.match(source, /const width = 1200/);
  assert.doesNotMatch(source, /const finalPoint = points\.at\(-1\)/);
});

test("Scope 1 and Scope 2 share an 88-percent full-width monthly plot", () => {
  const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const source = html.match(/function monthlyComparisonChart[\s\S]*?function netZeroPathwayChart/)?.[0];
  assert.ok(source, "monthly chart renderer should be present");
  const width = Number(source.match(/const width = (\d+);/)?.[1]);
  const plotWidth = Number(source.match(/const plotWidth = (\d+);/)?.[1]);
  assert.equal(width, 1200);
  assert.equal(plotWidth, 1056);
  assert.equal(plotWidth / width, 0.88);
  assert.match(html, /\.monthly-chart svg \{[\s\S]*?width: 100%;[\s\S]*?height: auto;/);
  assert.match(html, /renderScope1[\s\S]*?monthlyComparisonChart\(monthly/);
  assert.match(html, /renderScope2[\s\S]*?monthlyComparisonChart\(monthly/);
  const scope2Rule = html.match(/\.scope2-comparison-panel \.monthly-chart \{([^}]*)\}/)?.[1] || "";
  assert.doesNotMatch(scope2Rule, /width:/);
  assert.match(html, /\.scope2-comparison-panel \.method-toggle \{[^}]*margin-bottom: 0;/);
  assert.match(source, /stroke-width="2\.5"/);
});


test("financial-year choices exclude combined years and default invalid values to FY2026", () => {
  const core = loadCore();

  assert.deepEqual(JSON.parse(JSON.stringify(core.getFinancialYearOptions())), ["FY2026", "FY2025"]);
  assert.equal(core.getEffectiveFinancialYear("overview", "FY2025"), "FY2025");
  assert.equal(core.getEffectiveFinancialYear("overview", "All"), "FY2026");
  assert.equal(core.getEffectiveFinancialYear("overview", ""), "FY2026");
});

test("net-zero pathway always uses FY2026 current data regardless of reporting-year selection", () => {
  const core = loadCore();
  const view = core.getNetZeroView("FY2025", 1240, 1120);

  assert.equal(core.getEffectiveFinancialYear("netzero", "FY2025"), "FY2026");
  assert.equal(view.current, 1120);
  assert.equal(view.currentLabel, "FY2026 actual");
  assert.equal(view.highlightLabel, "FY2026");
  assert.deepEqual(
    JSON.parse(JSON.stringify(view.points.slice(0, 2))),
    [
      { label: "FY2025", note: "Baseline", value: 1240 },
      { label: "FY2026", note: "Latest actual", value: 1120 }
    ]
  );
});

test("overview pathway omits FY2026 actual when FY2025 is selected", () => {
  const core = loadCore();

  assert.deepEqual(
    JSON.parse(JSON.stringify(core.getOverviewPathway("FY2025", 1240, 1120))),
    {
      points: [
        { label: "FY2025", note: "Baseline", value: 1240 },
        { label: "FY2030", note: "Near-term target", value: 806 },
        { label: "FY2040", note: "Interim target", value: 310 },
        { label: "FY2050", note: "Net-zero target", value: 0 }
      ],
      highlightLabel: "FY2025"
    }
  );
});

test("overview pathway includes FY2026 actual before future targets", () => {
  const core = loadCore();
  const view = core.getOverviewPathway("FY2026", 1240, 1120);

  assert.deepEqual(JSON.parse(JSON.stringify(view.points.map((point) => point.label))), ["FY2025", "FY2026", "FY2030", "FY2040", "FY2050"]);
  assert.equal(view.points[1].value, 1120);
  assert.equal(view.points[1].note, "Latest actual");
  assert.equal(view.highlightLabel, "FY2026");
});

test("net-zero levers reconcile the FY2025 baseline to 10% residual and zero", () => {
  const core = loadCore();
  const view = core.getNetZeroLevers();

  assert.equal(view.baseline, 1240);
  assert.equal(view.grossReduction, 1116);
  assert.equal(view.residual, 124);
  assert.equal(view.neutralisation, 124);
  assert.equal(view.final, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(view.scopeResiduals)), { scope1: 5, scope2Market: 0, scope3: 119 });
  assert.deepEqual(
    JSON.parse(JSON.stringify(view.steps.map(({ key, displayValue }) => [key, displayValue]))),
    [
      ["baseline", "1,240"],
      ["fleet", "−82"],
      ["stationary", "−32"],
      ["refrigerants", "−21"],
      ["added-electricity", "+E"],
      ["renewable-electricity", "−(300 + E)"],
      ["supplier", "−X"],
      ["other-value-chain", "−(681 − X)"],
      ["residual", "124"],
      ["neutralisation", "−124"],
      ["net-zero", "0"]
    ]
  );
});

test("fleet transition is a financial-year point-in-time status", () => {
  const core = loadCore();

  assert.deepEqual(JSON.parse(JSON.stringify(core.getFleetTransition("FY2025"))), { electric: 0, fleet: 10, percentage: 0, asAt: "30 June FY2025" });
  assert.deepEqual(JSON.parse(JSON.stringify(core.getFleetTransition("FY2026"))), { electric: 2, fleet: 10, percentage: 20, asAt: "30 June FY2026" });
});

test("Scope 1 and Scope 2 enable year filtering while Net Zero ignores reporting filters", () => {
  const core = loadCore();

  assert.deepEqual(
    JSON.parse(JSON.stringify(core.getPageFilterPolicy("scope1"))),
    {
      heading: "Reporting and monthly comparison",
      guidance: "Financial year applies to KPIs and breakdowns • Monthly comparison always shows FY2025 and FY2026",
      fyDisabled: false,
      otherDisabled: false
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(core.getPageFilterPolicy("scope2"))),
    JSON.parse(JSON.stringify(core.getPageFilterPolicy("scope1")))
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(core.getPageFilterPolicy("netzero"))),
    {
      heading: "Corporate pathway view",
      guidance: "Reporting filters do not apply to the FY2025 baseline reduction pathway",
      fyDisabled: true,
      otherDisabled: true
    }
  );
});

test("annual Scope 1 view follows the selected year", () => {
  const core = loadCore();
  const fy2025 = core.getScopeYearView(core.DATA, "Scope 1", "FY2025");
  const fy2026 = core.getScopeYearView(core.DATA, "Scope 1", "FY2026");

  assert.equal(fy2025.total, 140);
  assert.deepEqual(JSON.parse(JSON.stringify(fy2025.bySource)), {
    "Mobile combustion": 82,
    "Stationary combustion": 32,
    "Fugitive emissions": 26
  });
  assert.equal(fy2026.total, 116);
  assert.equal(fy2026.bySource["Mobile combustion"], 72);
});

test("annual Scope 2 view follows both selected year and accounting method", () => {
  const core = loadCore();

  assert.equal(core.getScopeYearView(core.DATA, "Scope 2", "FY2025", "emissions").total, 300);
  assert.equal(core.getScopeYearView(core.DATA, "Scope 2", "FY2026", "emissions").total, 224);
  assert.equal(core.getScopeYearView(core.DATA, "Scope 2", "FY2025", "locationEmissions").total, 352);
  assert.equal(core.getScopeYearView(core.DATA, "Scope 2", "FY2026", "locationEmissions").total, 329);
});

test("approved pathway and lever renderers are bound to their intended pages", () => {
  const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const overview = html.match(/function renderOverview[\s\S]*?function renderScope1/)?.[0];
  const netZero = html.match(/function renderNetZero[\s\S]*?function renderApp/)?.[0];

  assert.ok(overview, "overview renderer should be present");
  assert.ok(netZero, "Net Zero renderer should be present");
  assert.match(overview, /Corporate emissions pathway/);
  assert.match(overview, /netZeroPathwayChart\(overviewPathway\)/);
  assert.doesNotMatch(overview, /lineChart\(pathwayPoints/);
  assert.match(netZero, /Net Zero Reduction Levers/);
  assert.match(netZero, /netZeroLeversChart\(core\.getNetZeroLevers\(\)\)/);
  assert.match(netZero, /E and X are modelling inputs to be confirmed/);
  assert.match(netZero, /Location-based Scope 2 remains separately reported/);
});
