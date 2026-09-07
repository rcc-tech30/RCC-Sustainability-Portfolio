# Portfolio Project Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved three-project portfolio structure, distribute the audited RCC Holdings Excel calculator, keep the Power BI report request-only, and replace the retired Company X dashboard with a small archive pointer.

**Architecture:** Keep the portfolio as a static GitHub Pages site. The root `index.html` remains the only project-list and Power BI request interface. The RCC Holdings workbook is a public binary asset with a pinned SHA256. The PBIX remains outside Git. The old Company X URL remains valid but serves a static archive page instead of the application.

**Tech Stack:** Static HTML and CSS, vanilla JavaScript, Node.js built-in test runner, PowerShell file and hash commands, Python static HTTP server, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-07-portfolio-project-restructure-design.md`

**Global Constraints:**

- Work only in `C:\Users\chanr\Documents\Codex\2026-08-08\ass\work\RCC-Sustainability-Portfolio`.
- Do not switch branches, reset, clean, restore unrelated paths, rewrite history, push, deploy, publish, or modify GitHub Pages configuration.
- Preserve all unrelated modified and untracked work, especially `.superpowers/`.
- Do not add any `.pbix` file or public direct PBIX URL.
- Do not change the existing Google Form action or work-email field name.
- Do not redesign the site shell, About section, navigation, typography, Fleet Electrification tool, or Canadian workbook.
- Do not use em dashes in public-facing copy. Use periods, commas, parentheses, or colons.
- Stop if the workbook source cannot be read or does not match the approved 61,666-byte size and SHA256.

---

### Task 1: Add the verified Project 01 workbook distribution surface

**Files:**

- Create: `tests/portfolio-project-structure.test.mjs`
- Create: `dashboards/rcc-holdings-emissions-decarbonization/README.md`
- Create: `dashboards/rcc-holdings-emissions-decarbonization/RCC_GHG_Calculator_AU_UK_2026.xlsx`
- Source only: `D:\RCC_GHG_Calculator_AU_UK_2026 - (Share).xlsx`

- [ ] **Step 1: Confirm the starting state and source is readable**

Run:

```powershell
git status --short --branch
git log -3 --oneline
Get-Item 'D:\RCC_GHG_Calculator_AU_UK_2026 - (Share).xlsx' | Select-Object FullName,Length,LastWriteTime
Get-FileHash -Algorithm SHA256 'D:\RCC_GHG_Calculator_AU_UK_2026 - (Share).xlsx'
```

Expected source evidence:

```text
Length: 61666
SHA256: B0F98EA070F8D28178B6D428BC8109C66FC827529AF88A5FE320FF4B3B9B32B7
```

If `Get-FileHash` reports that another process is using the file, stop and ask the owner to close Excel. Do not copy the file until the hash succeeds.

- [ ] **Step 2: Write the failing workbook and PBIX boundary test**

Create `tests/portfolio-project-structure.test.mjs` with:

```js
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), "utf8");
const sha256 = (absolutePath) => createHash("sha256").update(readFileSync(absolutePath)).digest("hex").toUpperCase();

test("Project 01 publishes the audited workbook and never tracks a PBIX file", () => {
  const relativeWorkbook = "dashboards/rcc-holdings-emissions-decarbonization/RCC_GHG_Calculator_AU_UK_2026.xlsx";
  const workbook = path.join(repoRoot, relativeWorkbook);
  assert.equal(existsSync(workbook), true, "public workbook should exist");
  assert.equal(statSync(workbook).size, 61666);
  assert.equal(sha256(workbook), "B0F98EA070F8D28178B6D428BC8109C66FC827529AF88A5FE320FF4B3B9B32B7");

  const trackedPbix = execFileSync(
    "git",
    ["ls-files", "--", ":(glob)**/*.pbix"],
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
  assert.equal(trackedPbix, "");

  const notes = read("dashboards/rcc-holdings-emissions-decarbonization/README.md");
  assert.match(notes, /RCC Holdings Emissions & Decarbonization/);
  assert.match(notes, /available by request/i);
  assert.doesNotMatch(notes, /https?:\/\/[^\s)]+\.pbix\b/i);
});
```

- [ ] **Step 3: Run the test to verify RED**

Run:

```powershell
node --test tests/portfolio-project-structure.test.mjs
```

Expected: FAIL because the new workbook and Project 01 README do not exist.

- [ ] **Step 4: Create the Project 01 folder, README, and verified workbook copy**

Create the directory, then copy the source workbook without changing it:

```powershell
New-Item -ItemType Directory -Force 'dashboards\rcc-holdings-emissions-decarbonization'
Copy-Item -LiteralPath 'D:\RCC_GHG_Calculator_AU_UK_2026 - (Share).xlsx' -Destination 'dashboards\rcc-holdings-emissions-decarbonization\RCC_GHG_Calculator_AU_UK_2026.xlsx'
```

Create `dashboards/rcc-holdings-emissions-decarbonization/README.md` with this public copy:

```markdown
# RCC Holdings Emissions & Decarbonization

**[Download the RCC GHG calculator](RCC_GHG_Calculator_AU_UK_2026.xlsx)**

This project combines a formula-driven AU and UK greenhouse gas calculator with a native Power BI analysis for operational emissions and decarbonization scenarios. The workbook and report use illustrative sample data.

## Power BI report

The native Power BI report is available by request through Project 01 on the [portfolio website](https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/#portfolio). The PBIX file is not stored in this public repository.

## What this project demonstrates

- Scope 1 and location-based Scope 2 calculation workflows
- AU and UK emission-factor application
- Formula traceability and scenario modelling
- Emissions-reduction lever analysis
- Power BI data modelling and sustainability reporting

## Disclosure

The organization, facilities, activity quantities, and figures are illustrative. This sample is not client work, external assurance, certification, an official emissions inventory, or regulatory advice.
```

- [ ] **Step 5: Verify the copied bytes and run GREEN**

Run:

```powershell
Get-Item 'dashboards\rcc-holdings-emissions-decarbonization\RCC_GHG_Calculator_AU_UK_2026.xlsx' | Select-Object Length
Get-FileHash -Algorithm SHA256 'dashboards\rcc-holdings-emissions-decarbonization\RCC_GHG_Calculator_AU_UK_2026.xlsx'
node --test tests/portfolio-project-structure.test.mjs
```

Expected: 61,666 bytes, exact approved SHA256, and PASS.

- [ ] **Step 6: Commit the verified distribution surface**

```powershell
git add tests/portfolio-project-structure.test.mjs dashboards/rcc-holdings-emissions-decarbonization/README.md dashboards/rcc-holdings-emissions-decarbonization/RCC_GHG_Calculator_AU_UK_2026.xlsx
git diff --cached --check
git commit -m "feat: add RCC Holdings project assets"
```

---

### Task 2: Replace four homepage projects with the approved three-project structure

**Files:**

- Modify: `tests/portfolio-project-structure.test.mjs`
- Modify: `index.html:878-1004`
- Modify: `index.html:1095-1117`
- Modify: `README.md:7-83`

- [ ] **Step 1: Add failing homepage structure, modal, and copy tests**

Append to `tests/portfolio-project-structure.test.mjs`:

```js
function projectCards(html) {
  return [...html.matchAll(/<article class="project">([\s\S]*?)<\/article>/g)].map(([, body]) => ({
    number: body.match(/<span class="project-number">([^<]+)<\/span>/)?.[1],
    title: (body.match(/<h2>([^<]+)<\/h2>/)?.[1] || "").replaceAll("&amp;", "&"),
    body
  }));
}

test("homepage exposes exactly the three approved projects in order", () => {
  const homepage = read("index.html");
  const projects = projectCards(homepage);
  assert.deepEqual(
    projects.map(({ number, title }) => [number, title]),
    [
      ["PROJECT 01", "RCC Holdings Emissions & Decarbonization"],
      ["PROJECT 02", "Fleet Electrification"],
      ["PROJECT 03", "RCC GHG Canada Operations Sample"]
    ]
  );

  assert.equal((projects[0].body.match(/class="button\b/g) || []).length, 2);
  assert.match(projects[0].body, /href="dashboards\/rcc-holdings-emissions-decarbonization\/RCC_GHG_Calculator_AU_UK_2026\.xlsx" download/);
  assert.match(projects[0].body, /data-open-pbix-request/);
  assert.match(projects[1].body, /href="dashboards\/fleet-electrification-transition\/"/);
  assert.match(projects[2].body, /href="dashboards\/canadian-ghg-inventory\/Canadian_GHG_Inventory_2026_Scope1_Scope2\.xlsx" download/);
  assert.doesNotMatch(homepage, /<h2>Company X GHG Dashboard<\/h2>/);
  assert.doesNotMatch(homepage, /<h2>Company X Native Power BI Dashboard<\/h2>/);
});

test("Project 01 request dialog preserves its endpoint and validation field", () => {
  const homepage = read("index.html");
  assert.match(homepage, /<p class="request-kicker">Project 01<\/p>/);
  assert.match(homepage, /<h2 class="request-title" id="pbix-request-title">Request the RCC Holdings Power BI file<\/h2>/);
  assert.match(homepage, /action="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSdSHNiOAYjsEya3rSv6M4NiqowcGOIuG-0f8-KWHWUOEjAE6w\/formResponse"/);
  assert.match(homepage, /name="entry\.308624725"/);
});

test("homepage and root notes contain no obsolete projects, direct PBIX URL, or em dash", () => {
  const homepage = read("index.html");
  const notes = read("README.md");
  for (const content of [homepage, notes]) assert.doesNotMatch(content, /\u2014/);
  assert.doesNotMatch(notes, /Company X GHG Dashboard/);
  assert.doesNotMatch(notes, /Company X Native Power BI Dashboard/);
  assert.doesNotMatch(notes, /https?:\/\/[^\s)]+\.pbix\b/i);
  for (const title of [
    "RCC Holdings Emissions & Decarbonization",
    "Fleet Electrification",
    "RCC GHG Canada Operations Sample"
  ]) assert.match(notes, new RegExp(title.replace(/[&]/g, "\\&")));
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
node --test tests/portfolio-project-structure.test.mjs
```

Expected: the workbook test remains green; the new homepage tests fail because four cards and the old modal copy remain.

- [ ] **Step 3: Replace the project-card block with exactly three cards**

Keep the existing `.project`, `.project-visual`, `.dashboard-preview`, `.actions`, button, and responsive CSS. Replace only the four `<article class="project">` elements.

Project 01 must use this content and action order:

```html
<span class="project-number">PROJECT 01</span>
<h2>RCC Holdings Emissions &amp; Decarbonization</h2>
<p>A formula-driven AU and UK greenhouse gas calculator paired with a native Power BI analysis for operational emissions and decarbonization scenarios. The workbook and report use illustrative sample data.</p>
<div class="actions">
  <a class="button button-primary" href="dashboards/rcc-holdings-emissions-decarbonization/RCC_GHG_Calculator_AU_UK_2026.xlsx" download><span>Download Excel calculator</span><span aria-hidden="true">↓</span></a>
  <button class="button button-secondary button-trigger" type="button" data-open-pbix-request><span>Request Power BI file</span><span aria-hidden="true">→</span></button>
</div>
<p class="viewing-note">Excel calculator available now. Power BI file available by request.</p>
```

Use this Project 01 preview content:

```html
<div class="preview-bar"><span>RCC Holdings</span><span class="preview-nav">EMISSIONS ANALYSIS</span></div>
<div class="metric-strip">
  <div class="metric"><span>Baseline emissions</span><strong>378.77</strong></div>
  <div class="metric"><span>FY2030 projection</span><strong>91.90</strong></div>
  <div class="metric"><span>Reduction target</span><strong>70%</strong></div>
</div>
```

For Project 02, retain the existing Fleet preview, description, `Open assessment` link, project-notes link, and viewing note. Change only:

```html
<span class="project-number">PROJECT 02</span>
<h2>Fleet Electrification</h2>
```

For Project 03, retain the existing Canadian preview, workbook link, project-notes link, and disclosure. Change only:

```html
<span class="project-number">PROJECT 03</span>
<h2>RCC GHG Canada Operations Sample</h2>
```

Remove both Company X project cards entirely.

- [ ] **Step 4: Retarget the request dialog without changing its behavior**

Change only the user-facing project identity:

```html
<p class="request-kicker">Project 01</p>
<h2 class="request-title" id="pbix-request-title">Request the RCC Holdings Power BI file</h2>
```

Preserve the form action, `entry.308624725`, domain block list, submission workflow, close behavior, focus restoration, status region, and iframe target.

- [ ] **Step 5: Rewrite the root README around the same three projects**

Use these exact section headings in order:

```markdown
### RCC Holdings Emissions & Decarbonization
### Fleet Electrification
### RCC GHG Canada Operations Sample
```

The first section must link to the public calculator and the live portfolio request button, explain that the Power BI report is request-only, and contain no direct `.pbix` URL. Remove the two Company X project sections. Change the LinkedIn label to `LinkedIn: Reiniel Celgie Chan`.

- [ ] **Step 6: Run the focused test to verify GREEN**

Run:

```powershell
node --test tests/portfolio-project-structure.test.mjs
rg -n "Company X GHG Dashboard|Company X Native Power BI Dashboard|\.pbix|\x{2014}" index.html README.md
```

Expected: tests PASS. The search may show generic `PBIX` request language, but must show no direct `.pbix` URL, no obsolete project-card headings, and no em dash.

- [ ] **Step 7: Commit the homepage restructure**

```powershell
git add index.html README.md tests/portfolio-project-structure.test.mjs
git diff --cached --check
git commit -m "feat: restructure featured portfolio projects"
```

---

### Task 3: Replace Company X surfaces with archive pointers

**Files:**

- Modify: `tests/portfolio-project-structure.test.mjs`
- Replace: `dashboards/company-x-ghg/index.html`
- Replace: `dashboards/company-x-ghg/README.md`
- Replace: `dashboards/company-x-power-bi/README.md`
- Modify: `dashboards/canadian-ghg-inventory/README.md`
- Delete: `dashboards/company-x-ghg/dashboard.test.mjs`

- [ ] **Step 1: Add failing archive and project-note tests**

Append to `tests/portfolio-project-structure.test.mjs`:

```js
test("retired Company X routes are small archive pointers", () => {
  const archive = read("dashboards/company-x-ghg/index.html");
  assert.match(archive, /<h1>Project archived<\/h1>/);
  assert.match(archive, /This project has been archived\. View the current sustainability portfolio projects by Reiniel Celgie Chan\./);
  assert.match(archive, /href="\.\.\/\.\.\/#portfolio"/);
  assert.doesNotMatch(archive, /id="dashboard-core"|CompanyXDashboard|data-page=|downloadDashboard/);
  assert.equal(existsSync(path.join(repoRoot, "dashboards/company-x-ghg/dashboard.test.mjs")), false);
});

test("project notes match the new structure and public copy has no em dash", () => {
  const archiveNotes = read("dashboards/company-x-ghg/README.md");
  const powerBiNotes = read("dashboards/company-x-power-bi/README.md");
  const canadaNotes = read("dashboards/canadian-ghg-inventory/README.md");
  assert.match(archiveNotes, /archived/i);
  assert.match(powerBiNotes, /Project 01/);
  assert.match(powerBiNotes, /RCC Holdings Emissions & Decarbonization/);
  assert.doesNotMatch(powerBiNotes, /https?:\/\/[^\s)]+\.pbix\b/i);
  assert.match(canadaNotes, /^# RCC GHG Canada Operations Sample/m);
  for (const content of [archiveNotes, powerBiNotes, canadaNotes]) assert.doesNotMatch(content, /\u2014/);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
node --test tests/portfolio-project-structure.test.mjs
```

Expected: new archive tests fail because the full dashboard and obsolete test still exist.

- [ ] **Step 3: Replace the Company X dashboard with a compact archive page**

Replace `dashboards/company-x-ghg/index.html` with a self-contained semantic page using this content:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project archived | RCC Sustainability Portfolio</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; color: #102a26; background: #f2f6f3; }
    main { width: min(640px, 100%); padding: clamp(32px, 7vw, 64px); border: 1px solid #d7e3dc; border-radius: 24px; background: #fff; box-shadow: 0 20px 60px rgba(7, 42, 36, 0.08); }
    p { color: #556b65; line-height: 1.7; }
    a { display: inline-flex; margin-top: 16px; padding: 14px 18px; border-radius: 10px; color: #fff; background: #0f513f; font-weight: 750; text-decoration: none; }
    a:hover { background: #0a3b2f; }
    a:focus-visible { outline: 3px solid #2ca77d; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <h1>Project archived</h1>
    <p>This project has been archived. View the current sustainability portfolio projects by Reiniel Celgie Chan.</p>
    <a href="../../#portfolio">View current portfolio projects</a>
  </main>
</body>
</html>
```

Do not retain old dashboard data, controls, charts, scripts, download behavior, or embedded application code.

- [ ] **Step 4: Replace both obsolete Company X READMEs and rename the Canadian sample notes**

Use this minimum content for `dashboards/company-x-ghg/README.md`:

```markdown
# Archived project

The Company X GHG Dashboard has been archived and is no longer part of the featured portfolio.

[View the current sustainability portfolio projects](https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/#portfolio)
```

Use this minimum content for `dashboards/company-x-power-bi/README.md`:

```markdown
# Archived Power BI project note

The former Company X Power BI project has been consolidated into Project 01, **RCC Holdings Emissions & Decarbonization**.

The current Power BI file is available by request through the [portfolio website](https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/#portfolio). No PBIX file is stored in this public repository.
```

Change the Canadian README heading to:

```markdown
# RCC GHG Canada Operations Sample
```

Keep its workbook link, capability description, disclosure, and Excel compatibility note unchanged.

- [ ] **Step 5: Remove the obsolete dashboard test**

Delete only:

```text
dashboards/company-x-ghg/dashboard.test.mjs
```

Its application contracts no longer apply after the approved archive replacement. The new route behavior is covered by `tests/portfolio-project-structure.test.mjs`.

- [ ] **Step 6: Run the focused and complete test suites to verify GREEN**

Run:

```powershell
node --test tests/portfolio-project-structure.test.mjs
node --test
```

Expected: all remaining tests PASS and Node discovers no obsolete Company X application test.

- [ ] **Step 7: Commit the archive migration**

```powershell
git add dashboards/company-x-ghg/index.html dashboards/company-x-ghg/README.md dashboards/company-x-power-bi/README.md dashboards/canadian-ghg-inventory/README.md tests/portfolio-project-structure.test.mjs
git add -u dashboards/company-x-ghg/dashboard.test.mjs
git diff --cached --check
git commit -m "feat: archive retired Company X project"
```

---

### Task 4: Verify the complete public experience without publishing

**Files:**

- Verify only. Modify only if a failed acceptance criterion requires a scoped fix.

- [ ] **Step 1: Run source, test, security, and artifact gates**

Run:

```powershell
node --test
git diff --check
git ls-files -- ':(glob)**/*.pbix'
Get-FileHash -Algorithm SHA256 'dashboards\rcc-holdings-emissions-decarbonization\RCC_GHG_Calculator_AU_UK_2026.xlsx'
rg -n "https?://[^ )]+\.pbix|Company X GHG Dashboard|Company X Native Power BI Dashboard|\x{2014}" index.html README.md dashboards/company-x-ghg/index.html dashboards/company-x-ghg/README.md dashboards/company-x-power-bi/README.md dashboards/rcc-holdings-emissions-decarbonization/README.md dashboards/canadian-ghg-inventory/README.md
git status --short --branch
```

Expected:

- All tests pass.
- `git diff --check` exits 0.
- `git ls-files -- ':(glob)**/*.pbix'` is empty.
- Workbook SHA256 is `B0F98EA070F8D28178B6D428BC8109C66FC827529AF88A5FE320FF4B3B9B32B7`.
- No direct PBIX URL, obsolete project-card title, or em dash remains in the public files.
- `.superpowers/` remains untouched and untracked.

- [ ] **Step 2: Serve the exact working tree locally**

Run from the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Verify the served workbook returns HTTP 200 from:

```text
http://127.0.0.1:4173/dashboards/rcc-holdings-emissions-decarbonization/RCC_GHG_Calculator_AU_UK_2026.xlsx
```

Hash the served bytes and confirm they match the on-disk approved hash.

- [ ] **Step 3: Verify the homepage at three widths**

Inspect at 1280px, 768px, and 375px viewport widths at 100% browser zoom:

- Exactly three project cards render in the approved order.
- Project 01 has exactly two actions. Workbook download is first and Power BI request is second.
- Project 02 and Project 03 retain their working links.
- There is no horizontal overflow or clipped text.
- Existing card breakpoints, typography, site navigation, About section, and focus styling remain visually intact.
- Reduced-motion mode suppresses existing animated navigation and preview motion.

- [ ] **Step 4: Verify the Power BI request dialog without submitting external data**

- Open from the Project 01 request button.
- Confirm the dialog kicker and title match the approved copy.
- Confirm initial focus moves to the work-email input.
- Confirm an invalid email and a public Gmail address are rejected locally.
- Close with the close button and confirm focus returns to the trigger.
- Confirm the dialog fits 375px without horizontal overflow.
- Do not send a real Google Form submission during local verification.

- [ ] **Step 5: Verify the archived route**

Open:

```text
http://127.0.0.1:4173/dashboards/company-x-ghg/
```

At 1280px, 768px, and 375px verify:

- Only the archive card is present.
- The exact approved heading, sentence, and link are readable.
- The link returns to the homepage `#portfolio` section.
- Keyboard focus is visible.
- There is no horizontal overflow, old dashboard UI, console error, or network dependency.

- [ ] **Step 6: Record final evidence and stop before push**

Report:

- Branch and final commit IDs.
- Exact changed, added, and deleted files.
- Exact test command and pass count.
- `git diff --check` result.
- Workbook size and SHA256.
- Confirmation that no PBIX is tracked and no direct PBIX URL remains.
- Desktop, tablet, mobile, dialog, accessibility, reduced-motion, overflow, and archive-route results.
- Any uncertainty or deviation.

Do not push, deploy, publish, merge, or delete the external preserved archive. Wait for a separate owner instruction.
