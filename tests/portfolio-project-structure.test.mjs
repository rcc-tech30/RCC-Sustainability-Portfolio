import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const workbookPath = new URL(
  '../dashboards/rcc-holdings-emissions-decarbonization/RCC_GHG_Calculator_AU_UK_2026.xlsx',
  import.meta.url,
);
const projectReadmePath = new URL(
  '../dashboards/rcc-holdings-emissions-decarbonization/README.md',
  import.meta.url,
);
const homepagePath = new URL('../index.html', import.meta.url);
const rootReadmePath = new URL('../README.md', import.meta.url);

function projectCards(homepage) {
  return [...homepage.matchAll(/<article class="project">([\s\S]*?)<\/article>/g)].map((match) => {
    const body = match[1];
    return {
      body,
      number: body.match(/<span class="project-number">([^<]+)<\/span>/)?.[1],
      title: body.match(/<h2>([^<]+)<\/h2>/)?.[1],
    };
  });
}

test('published RCC Holdings workbook matches the approved audited artifact', async () => {
  const workbook = await readFile(workbookPath);
  const details = await stat(workbookPath);

  assert.equal(details.size, 62643);
  assert.equal(
    createHash('sha256').update(workbook).digest('hex'),
    'def3b493d4c0a149ae52f22d36218358a252a6776c1e601918b358ab4c863cc0',
  );
});

test('RCC Holdings project notes describe the two approved access paths', async () => {
  const readme = await readFile(projectReadmePath, 'utf8');

  assert.match(readme, /^# RCC Holdings Emissions & Decarbonization/m);
  assert.match(readme, /Download the Excel calculator/);
  assert.match(readme, /Request the Power BI file/);
  assert.match(readme, /Power BI file is not stored in this public repository/);
});

test('homepage presents exactly the three approved projects in order', async () => {
  const homepage = await readFile(homepagePath, 'utf8');
  const projects = projectCards(homepage);

  assert.deepEqual(
    projects.map(({ number, title }) => [number, title]),
    [
      ['PROJECT 01', 'RCC Holdings Emissions &amp; Decarbonization'],
      ['PROJECT 02', 'Fleet Electrification'],
      ['PROJECT 03', 'RCC GHG Canada Operations Sample'],
    ],
  );

  assert.equal((projects[0].body.match(/class="button\b/g) || []).length, 2);
  assert.match(projects[0].body, /href="dashboards\/rcc-holdings-emissions-decarbonization\/RCC_GHG_Calculator_AU_UK_2026\.xlsx" download/);
  assert.match(projects[0].body, /data-open-pbix-request/);
  assert.ok(projects[0].body.indexOf('Download Excel calculator') < projects[0].body.indexOf('Request Power BI file'));

  assert.match(projects[1].body, /href="dashboards\/fleet-electrification-transition\/"/);
  assert.match(projects[2].body, /href="dashboards\/canadian-ghg-inventory\/Canadian_GHG_Inventory_2026_Scope1_Scope2\.xlsx" download/);
  assert.doesNotMatch(homepage, /Company X GHG Dashboard|Company X Native Power BI Dashboard/);
});

test('Project 01 request dialog preserves its endpoint and validation field', async () => {
  const homepage = await readFile(homepagePath, 'utf8');

  assert.match(homepage, /<p class="request-kicker">Project 01<\/p>/);
  assert.match(homepage, /<h2 class="request-title" id="pbix-request-title">Request the RCC Holdings Power BI file<\/h2>/);
  assert.match(homepage, /action="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSdSHNiOAYjsEya3rSv6M4NiqowcGOIuG-0f8-KWHWUOEjAE6w\/formResponse"/);
  assert.match(homepage, /name="entry\.308624725"/);
});

test('root project notes match the approved public structure', async () => {
  const readme = await readFile(rootReadmePath, 'utf8');
  const headings = [...readme.matchAll(/^### (.+)$/gm)].map((match) => match[1]);

  assert.deepEqual(headings.slice(0, 3), [
    'RCC Holdings Emissions & Decarbonization',
    'Fleet Electrification',
    'RCC GHG Canada Operations Sample',
  ]);
  assert.doesNotMatch(readme, /Company X GHG Dashboard|Company X Native Power BI Dashboard/);
  assert.doesNotMatch(readme, /https?:\/\/[^\s)]+\.pbix\b/i);
  assert.doesNotMatch(readme, /\u2014/);
});

test('retired Company X route is a small archive pointer', async () => {
  const archive = await readFile(new URL('../dashboards/company-x-ghg/index.html', import.meta.url), 'utf8');

  assert.match(archive, /<h1>Project archived<\/h1>/);
  assert.match(archive, /This project has been archived\. View the current sustainability portfolio projects by Reiniel Celgie Chan\./);
  assert.match(archive, /href="\.\.\/\.\.\/#portfolio"/);
  assert.doesNotMatch(archive, /id="dashboard-core"|CompanyXDashboard|data-page=|downloadDashboard/);
  await assert.rejects(
    readFile(new URL('../dashboards/company-x-ghg/dashboard.test.mjs', import.meta.url)),
    { code: 'ENOENT' },
  );
});

test('project notes match the new structure', async () => {
  const archiveNotes = await readFile(new URL('../dashboards/company-x-ghg/README.md', import.meta.url), 'utf8');
  const powerBiNotes = await readFile(new URL('../dashboards/company-x-power-bi/README.md', import.meta.url), 'utf8');
  const canadaNotes = await readFile(new URL('../dashboards/canadian-ghg-inventory/README.md', import.meta.url), 'utf8');

  assert.match(archiveNotes, /archived/i);
  assert.match(powerBiNotes, /Project 01/);
  assert.match(powerBiNotes, /RCC Holdings Emissions & Decarbonization/);
  assert.doesNotMatch(powerBiNotes, /https?:\/\/[^\s)]+\.pbix\b/i);
  assert.match(canadaNotes, /^# RCC GHG Canada Operations Sample/m);
});

test('revised public portfolio copy contains no em dash', async () => {
  const paths = [
    '../index.html',
    '../README.md',
    '../dashboards/rcc-holdings-emissions-decarbonization/README.md',
    '../dashboards/company-x-ghg/index.html',
    '../dashboards/company-x-ghg/README.md',
    '../dashboards/company-x-power-bi/README.md',
    '../dashboards/canadian-ghg-inventory/README.md',
  ];
  for (const path of paths) {
    assert.doesNotMatch(await readFile(new URL(path, import.meta.url), 'utf8'), /\u2014/);
  }
});
