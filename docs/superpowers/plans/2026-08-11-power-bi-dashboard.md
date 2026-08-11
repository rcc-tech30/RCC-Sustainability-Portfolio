# Native Power BI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the supplied native Power BI dashboard as a separate, downloadable employer-facing portfolio project.

**Architecture:** Store the PBIX and its viewing documentation in a dedicated dashboard directory. Add distinct discovery and download links to the static portfolio homepage and repository README while preserving the existing Company X HTML dashboard.

**Tech Stack:** Power BI PBIX artifact, static HTML and CSS, Markdown, PowerShell verification, GitHub Pages

## Global Constraints

- Treat the native Power BI dashboard as a separate project from `dashboards/company-x-ghg/`.
- State that the Power BI dashboard uses a different illustrative dataset.
- Require Microsoft Power BI Desktop for viewing the PBIX.
- Keep the existing HTML dashboard and its descriptions unchanged.
- Do not use em dashes in new descriptions.
- Preserve the supplied PBIX byte for byte.
- State that Company X and all dashboard data are fictional and illustrative.

---

### Task 1: Add the native Power BI project artifact and notes

**Files:**
- Create: `dashboards/company-x-power-bi/company-x-sustainability-dashboard.pbix`
- Create: `dashboards/company-x-power-bi/README.md`

**Interfaces:**
- Consumes: `D:\Company X Dashboard template by RCC - completed.pbix` with SHA-256 `DDA774B9585C1E4C0A405A891F7E3059EE62AC7A936AE9257EAF492BE7A1AF30`
- Produces: A stable repository path for homepage and README download links

- [ ] **Step 1: Create the project folder and copy the artifact**

Run:

```powershell
New-Item -ItemType Directory -Force dashboards\company-x-power-bi
Copy-Item -LiteralPath 'D:\Company X Dashboard template by RCC - completed.pbix' -Destination 'dashboards\company-x-power-bi\company-x-sustainability-dashboard.pbix'
```

- [ ] **Step 2: Verify that the copied artifact is identical**

Run:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'dashboards\company-x-power-bi\company-x-sustainability-dashboard.pbix'
```

Expected: hash equals `DDA774B9585C1E4C0A405A891F7E3059EE62AC7A936AE9257EAF492BE7A1AF30`.

- [ ] **Step 3: Write the project README**

Create a concise README containing:

```markdown
# Company X Native Power BI Dashboard

This project is a native Microsoft Power BI dashboard created as a portfolio example. It is separate from the browser-based Company X GHG Dashboard in this repository and uses a different illustrative dataset.

## Download and open

**[Download the Power BI dashboard](company-x-sustainability-dashboard.pbix)**

Open the downloaded `.pbix` file in Microsoft Power BI Desktop. GitHub cannot preview the dashboard interactively, and Power BI Desktop is required to explore its pages, visuals, filters, and underlying model.

## What this project demonstrates

- Native Power BI report development
- Interactive dashboard design and filtering
- Data modeling and transformation
- Sustainability data communication
- Executive-ready visual presentation

## Disclosure

Company X and all figures shown in this dashboard are fictional. The data is illustrative and was created solely to demonstrate portfolio skills. This project is not client work, external assurance, certification, an official sustainability report, or a claim of formal standards conformance.
```

- [ ] **Step 4: Commit the project artifact and notes**

Run:

```powershell
git add dashboards/company-x-power-bi/company-x-sustainability-dashboard.pbix dashboards/company-x-power-bi/README.md
git commit -m "feat: add native Power BI dashboard"
```

### Task 2: Add employer-facing portfolio discovery

**Files:**
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `dashboards/company-x-power-bi/company-x-sustainability-dashboard.pbix` and `dashboards/company-x-power-bi/README.md`
- Produces: Homepage and repository links that identify the PBIX as a separate native Power BI project

- [ ] **Step 1: Add a separate project card to the homepage**

Add a third project card following the existing `.project` markup. Its copy must identify the project as `Company X Native Power BI Dashboard`, say that it uses a different illustrative dataset from the HTML project, and expose these actions:

```html
<a class="button button-primary" href="dashboards/company-x-power-bi/company-x-sustainability-dashboard.pbix" download><span>Download PBIX</span><span aria-hidden="true">↓</span></a>
<a class="button button-secondary" href="https://github.com/rcc-tech30/RCC-Sustainability-Portfolio/tree/main/dashboards/company-x-power-bi"><span>Read project notes</span><span aria-hidden="true">↗</span></a>
```

Add this viewing note:

```html
<p class="viewing-note">Native Power BI file · Requires Power BI Desktop</p>
```

- [ ] **Step 2: Add a separate featured project to the root README**

Add a `Company X Native Power BI Dashboard` section after the existing HTML dashboard. Include a direct PBIX download link, a project-notes link, the different-dataset distinction, five demonstrated capabilities, and the Power BI Desktop requirement.

- [ ] **Step 3: Check the new copy and links**

Run:

```powershell
rg -n "Company X Native Power BI|company-x-power-bi|Download PBIX|Power BI Desktop" index.html README.md dashboards/company-x-power-bi/README.md
$forbiddenChar = [char]0x2014
Select-String -SimpleMatch $forbiddenChar dashboards/company-x-power-bi/README.md,docs/superpowers/specs/2026-08-11-power-bi-dashboard-design.md,docs/superpowers/plans/2026-08-11-power-bi-dashboard.md
```

Expected: all intended links and labels are present; the second command has no output.

- [ ] **Step 4: Commit the portfolio presentation**

Run:

```powershell
git add index.html README.md
git commit -m "feat: feature Power BI dashboard in portfolio"
```

### Task 3: Verify and publish the complete change

**Files:**
- Test: `scripts/verify-portfolio.ps1`
- Test: `tests/fleet-electrification.test.mjs`

**Interfaces:**
- Consumes: The complete branch diff
- Produces: Verification evidence and a draft GitHub pull request

- [ ] **Step 1: Run repository verification**

Run:

```powershell
& .\scripts\verify-portfolio.ps1
node --test tests\fleet-electrification.test.mjs
git diff main...HEAD --check
```

Expected: the portfolio script and Node tests pass, and the diff check reports no whitespace errors.

- [ ] **Step 2: Confirm scope and repository state**

Run:

```powershell
git status -sb
git diff --stat main...HEAD
git log --oneline main..HEAD
```

Expected: only the unrelated pre-existing `.superpowers/` directory remains untracked; intended files and commits appear in the branch diff.

- [ ] **Step 3: Push the branch**

Run:

```powershell
git push -u origin agent/add-power-bi-dashboard
```

- [ ] **Step 4: Open a draft pull request**

Open a draft PR from `agent/add-power-bi-dashboard` to `main` titled `Add native Power BI dashboard to portfolio`. Describe what changed, why employers need a clearly separate native Power BI artifact, and the verification results.
