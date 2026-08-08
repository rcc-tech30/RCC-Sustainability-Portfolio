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
