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
