import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const projectPath = new URL(
  '../dashboards/fleet-electrification-transition/index.html',
  import.meta.url,
);
const readmePath = new URL(
  '../dashboards/fleet-electrification-transition/README.md',
  import.meta.url,
);

async function loadProject() {
  const html = await readFile(projectPath, 'utf8');
  const modelSource = html.match(/<script data-fleet-model>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(modelSource, 'fleet model script should be present');
  const context = { globalThis: {} };
  vm.runInNewContext(modelSource, context);
  return { html, model: context.globalThis.__fleetModel };
}

test('sample scenario compares FY2026 with FY2030 using the 2026 Australian residual mix factor', async () => {
  const { model } = await loadProject();

  assert.equal(model.DEFAULT_SCENARIO.baselineYear, 'FY2026');
  assert.equal(model.DEFAULT_SCENARIO.targetYear, 'FY2030');
  assert.equal(model.DEFAULT_SCENARIO.marketBasedResidualMixFactor, 0.79);
  assert.equal(model.DEFAULT_SCENARIO.certificateType, 'RE Certificate');
  assert.equal(model.DEFAULT_SCENARIO.gridEmissionFactor, undefined);
});

test('current and post-transition market-based Scope 2 apply their respective RE certificate coverage', async () => {
  const { model } = await loadProject();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);

  assert.equal(result.bevElectricityAdded, 39600);
  assert.equal(result.totalPostTransitionElectricity, 239600);
  assert.equal(result.currentMarketBasedScope2, 158);
  assert.equal(result.postTransitionMarketBasedScope2, 0);
  assert.ok(Math.abs(result.currentCombinedEmissions - 204.489536) < 1e-9);
  assert.equal(result.postTransitionCombinedEmissions, 0);

  const partlyCovered = model.calculateScenario({
    ...model.DEFAULT_SCENARIO,
    currentCertificateCoverage: 0.25,
    targetCertificateCoverage: 0.5,
  });
  assert.equal(partlyCovered.currentMarketBasedScope2, 118.5);
  assert.ok(Math.abs(partlyCovered.postTransitionMarketBasedScope2 - 94.642) < 1e-9);
});

test('comparison contains only current and post-transition market-based cases', async () => {
  const { model } = await loadProject();
  const result = model.calculateScenario(model.DEFAULT_SCENARIO);
  const periods = model.getEmissionsPeriodLabels('FY2026', 'FY2030');
  const comparison = model.buildEmissionsComparison(result, periods);

  assert.deepEqual(
    JSON.parse(JSON.stringify(comparison.bars.map(({ label, value }) => [label, value]))),
    [
      ['FY2026 current', result.currentCombinedEmissions],
      ['FY2030 post-transition', result.postTransitionCombinedEmissions],
    ],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(comparison.bars.map(({ segments }) => Object.keys(segments)))),
    [['scope1', 'scope2'], ['scope1', 'scope2']],
  );
});

test('project copy consistently describes a market-based RE certificate planning scenario', async () => {
  const { html } = await loadProject();
  const readme = await readFile(readmePath, 'utf8');
  const combined = `${html}\n${readme}`;

  assert.match(html, /Current facility electricity/);
  assert.match(html, /Market-based residual mix factor/);
  assert.match(html, /RE certificate premium/);
  assert.match(html, /RE means renewable energy/i);
  assert.match(html, /voluntarily surrendered LGCs or accredited GreenPower/i);
  assert.match(html, /Estimated annual operating cost reduction after transitioning selected ICE vehicles to BEVs/i);
  assert.match(html, /Estimated upfront cost of the fleet transition/i);
  assert.match(html, /market-based planning scenario only/i);
  assert.match(html, /held constant across the current and target cases/i);
  assert.match(html, /purchased by the company and included within its Scope 2 reporting boundary/i);
  assert.match(html, /eligible, exclusively claimed, purchased and retired/i);
  assert.match(readme, /DCCEEW National Greenhouse Accounts Factors 2026, Tables 2 and 9/);
  assert.doesNotMatch(combined, /grid-based|Grid factor|Grid emission factor|before EAC|after EAC/i);
  assert.doesNotMatch(combined, /Solar REC/i);
  assert.doesNotMatch(combined, /\u2014/);
});

test('annual operating KPI names savings and cost increases clearly', async () => {
  const { model } = await loadProject();

  assert.equal(model.getOperatingCostLabel(-8902), 'Annual operating savings');
  assert.equal(model.getOperatingCostLabel(1250), 'Annual operating cost increase');
  assert.equal(model.getOperatingCostLabel(0), 'Annual operating cost change');
});

test('legacy saved scenarios migrate the former grid factor into the residual mix factor', async () => {
  const { model } = await loadProject();
  const stored = JSON.stringify({
    version: 1,
    scenario: { gridEmissionFactor: 0.42, baselineYear: 'FY2025' },
  });
  const parsed = model.parseStoredScenario(stored);

  assert.equal(parsed.marketBasedResidualMixFactor, 0.42);
  assert.equal(parsed.gridEmissionFactor, undefined);
});

test('current and target RE certificate coverage errors attach to their own fields', async () => {
  const { model } = await loadProject();
  const currentMessages = model.validateScenario({
    ...model.DEFAULT_SCENARIO,
    currentCertificateCoverage: 1.01,
  });
  const targetMessages = model.validateScenario({
    ...model.DEFAULT_SCENARIO,
    targetCertificateCoverage: 1.01,
  });

  assert.ok(currentMessages.some(({ field }) => field === 'currentCertificateCoverage'));
  assert.ok(targetMessages.some(({ field }) => field === 'targetCertificateCoverage'));
});

test('all-zero emissions remain a valid two-case comparison', async () => {
  const { model } = await loadProject();
  const result = model.calculateScenario({
    ...model.DEFAULT_SCENARIO,
    dieselLitres: 0,
    petrolLitres: 0,
    currentCertificateCoverage: 1,
    targetCertificateCoverage: 1,
  });
  const comparison = model.buildEmissionsComparison(
    result,
    model.getEmissionsPeriodLabels('FY2026', 'FY2030'),
  );

  assert.equal(comparison.max, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(comparison.bars.map(({ value }) => value))),
    [0, 0],
  );
});

test('chart values are rendered with dark text outside the coloured bar segments', async () => {
  const { html } = await loadProject();

  assert.match(html, /fill="#152033">\$\{formatNumber\(bar\.value, 2\)\}/);
  assert.doesNotMatch(html, /inside \? "#ffffff"/);
});

test('all inline scripts remain valid JavaScript', async () => {
  const html = await readFile(projectPath, 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.length >= 2);
  scripts.forEach((source) => assert.doesNotThrow(() => new vm.Script(source)));
});
