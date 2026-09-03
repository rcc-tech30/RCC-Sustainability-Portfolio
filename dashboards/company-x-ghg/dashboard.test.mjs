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
  assert.match(source, /seriesIndex === 0/);
  assert.match(source, /seriesIndex === 1/);
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
  const scope2Rule = html.match(/\.scope2-comparison-panel \.monthly-chart \\{([^}]*)\\}/)?.[1] || "";
  assert.doesNotMatch(scope2Rule, /width:/);
  assert.match(source, /stroke-width="2\\.5"/);
});
