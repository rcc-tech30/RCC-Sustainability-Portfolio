# RCC Sustainability Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a professional, expandable GitHub portfolio with a recruiter-facing README and a live, self-contained Company X GHG dashboard.

**Architecture:** Keep the portfolio dependency-free: a root redirect provides a stable GitHub Pages URL, while the canonical dashboard lives at `dashboards/company-x-ghg/index.html`. A repository verification script checks structure, disclosures, links, ignored sensitive files, and the absence of a license before anything is pushed.

**Tech Stack:** Static HTML/CSS/JavaScript, Markdown, PowerShell, Git, GitHub CLI, GitHub Pages

## Global Constraints

- GitHub repository name: `RCC-Sustainability-Portfolio`.
- GitHub description: `A growing portfolio of sustainability projects, data tools, dashboards, automations, and practical experiments by Reiniel Celgie Chan.`
- Repository visibility is public.
- Company X, all entities, and all figures are fictional and illustrative.
- Do not claim client work, external assurance, certification, official inventory status, or formal GHG Protocol conformance.
- Include a technology-neutral `.gitignore`; do not add a license.
- Preserve the supplied dashboard's existing behavior and visual design.
- Do not add a build system, package dependency, framework, or empty project directory.
- Review all files for secrets and identifying client data before publication.

---

## File map

- `README.md`: recruiter-facing repository introduction, featured-project index, capabilities, scope, and disclosure.
- `.gitignore`: shared safeguards against committing local settings, secrets, dependencies, build output, logs, and temporary files.
- `index.html`: stable GitHub Pages redirect to the initial featured project.
- `dashboards/company-x-ghg/index.html`: canonical, self-contained copy of the supplied interactive dashboard.
- `scripts/verify-portfolio.ps1`: repeatable local verification for repository structure, required disclosure text, redirect destination, prohibited files, and likely secrets.
- `docs/superpowers/specs/2026-08-03-rcc-sustainability-portfolio-design.md`: approved design record.
- `docs/superpowers/plans/2026-08-03-rcc-sustainability-portfolio.md`: implementation checklist.

---

### Task 1: Add the portfolio shell and automated repository checks

**Files:**
- Create: `scripts/verify-portfolio.ps1`
- Create: `.gitignore`
- Create: `README.md`
- Create: `index.html`

**Interfaces:**
- Consumes: repository root and the required project path `dashboards/company-x-ghg/index.html`.
- Produces: `scripts/verify-portfolio.ps1`, a zero-dependency verifier that exits `0` only when every portfolio publication check passes.

- [ ] **Step 1: Write the verification script before creating portfolio files**

Create `scripts/verify-portfolio.ps1` with checks that collect failures and exit nonzero:

```powershell
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Require-File([string]$RelativePath) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $RelativePath) -PathType Leaf)) {
        $failures.Add("Missing required file: $RelativePath")
    }
}

function Require-Text([string]$RelativePath, [string]$Pattern, [string]$Message) {
    $path = Join-Path $repoRoot $RelativePath
    if ((Test-Path -LiteralPath $path -PathType Leaf) -and
        -not (Select-String -LiteralPath $path -Pattern $Pattern -Quiet)) {
        $failures.Add($Message)
    }
}

Require-File 'README.md'
Require-File '.gitignore'
Require-File 'index.html'
Require-File 'dashboards/company-x-ghg/index.html'
Require-Text 'README.md' 'fictional' 'README must disclose fictional content.'
Require-Text 'README.md' 'illustrative' 'README must disclose illustrative data.'
Require-Text 'README.md' 'dashboards/company-x-ghg/' 'README must link to the featured dashboard.'
Require-Text 'index.html' 'dashboards/company-x-ghg/' 'Root page must route to the featured dashboard.'
Require-Text 'dashboards/company-x-ghg/index.html' 'Illustrative portfolio data' 'Dashboard must show its illustrative-data badge.'
Require-Text '.gitignore' '^\.env\*$' '.gitignore must exclude environment files.'

$licenseFiles = Get-ChildItem -LiteralPath $repoRoot -File | Where-Object Name -Match '^LICENSE(?:\..+)?$'
if ($licenseFiles) { $failures.Add('A license file is present, contrary to the approved design.') }

$trackedCandidates = Get-ChildItem -LiteralPath $repoRoot -Recurse -File |
    Where-Object FullName -NotMatch '[\\/]\.git[\\/]'
$secretPattern = '(?i)(api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["''][^"'']{8,}["'']'
foreach ($file in $trackedCandidates) {
    if (Select-String -LiteralPath $file.FullName -Pattern $secretPattern -Quiet -ErrorAction SilentlyContinue) {
        $failures.Add("Possible embedded secret: $($file.FullName.Substring($repoRoot.Length + 1))")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host 'Portfolio verification passed.'
```

- [ ] **Step 2: Run the verifier and confirm the intended red state**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1`

Expected: exit code `1`, with missing-file messages for `README.md`, `.gitignore`, `index.html`, and `dashboards/company-x-ghg/index.html`.

- [ ] **Step 3: Add the technology-neutral ignore rules**

Create `.gitignore` with these exact categories and rules:

```gitignore
# Environment variables and secrets
.env*
!.env.example
*.pem
*.key
credentials*.json
secrets*.json

# Dependencies and generated output
node_modules/
dist/
build/
coverage/

# Logs and temporary files
*.log
*.tmp
*.temp
*.bak
*.swp

# Editors and operating systems
.vscode/
.idea/
.DS_Store
Thumbs.db
desktop.ini
```

- [ ] **Step 4: Add the professional README**

Create `README.md` with:

- title `# RCC Sustainability Portfolio`;
- a two-paragraph introduction identifying Reiniel Celgie Chan and describing the repository as an evolving collection of sustainability, data, automation, and learning projects;
- a `## Featured project` section linking to `dashboards/company-x-ghg/` and describing the interactive GHG dashboard;
- a short capabilities list covering Scope 1–3 reporting views, emissions pathways, data-quality communication, interactive filtering, and accessible responsive presentation;
- a `## Portfolio areas` section for sustainability dashboards, carbon accounting and analysis, workflow automation, and data tools and experiments;
- a `## Important disclosure` section stating that Company X, its entities, and all figures are fictional and illustrative, and that the dashboard is not client work, assurance, certification, an official inventory, or a claim of formal standards conformance; and
- a LinkedIn link to `https://www.linkedin.com/in/reiniel-celgie-chan-0a122428b/`.

Keep the README concise enough to scan during resume review and do not add unearned proficiency claims.

- [ ] **Step 5: Add the stable Pages redirect**

Create `index.html` as a valid, accessible redirect with both a meta refresh and fallback link:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=dashboards/company-x-ghg/">
  <title>RCC Sustainability Portfolio</title>
  <link rel="canonical" href="dashboards/company-x-ghg/">
</head>
<body>
  <p>Opening the <a href="dashboards/company-x-ghg/">Company X GHG dashboard</a>…</p>
</body>
</html>
```

- [ ] **Step 6: Run the verifier and confirm only the dashboard is missing**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1`

Expected: exit code `1`; the only structural failure is `Missing required file: dashboards/company-x-ghg/index.html`.

- [ ] **Step 7: Commit the shell and verification checks**

```powershell
git add .gitignore README.md index.html scripts/verify-portfolio.ps1
git commit -m "feat: add portfolio shell and safeguards"
```

### Task 2: Add and verify the Company X dashboard

**Files:**
- Create: `dashboards/company-x-ghg/index.html`
- Test: `scripts/verify-portfolio.ps1`

**Interfaces:**
- Consumes: `D:\Dashboard - Company X by RCC.html` as the source artifact.
- Produces: the canonical live project at `dashboards/company-x-ghg/index.html`, reached by both the root redirect and README link.

- [ ] **Step 1: Copy the source artifact without transforming it**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'dashboards/company-x-ghg'
Copy-Item -LiteralPath 'D:\Dashboard - Company X by RCC.html' -Destination 'dashboards/company-x-ghg/index.html'
```

- [ ] **Step 2: Prove the canonical copy matches the source byte-for-byte**

Run:

```powershell
$sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\Dashboard - Company X by RCC.html').Hash
$repoHash = (Get-FileHash -Algorithm SHA256 -LiteralPath 'dashboards/company-x-ghg/index.html').Hash
if ($sourceHash -ne $repoHash) { throw 'Dashboard copy differs from source.' }
```

Expected: exit code `0` and no output.

- [ ] **Step 3: Run repository verification**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1`

Expected: exit code `0` and `Portfolio verification passed.`

- [ ] **Step 4: Run focused static dashboard checks**

Run:

```powershell
rg -n "Illustrative portfolio data|Company X|Scope 1|Scope 2|Scope 3|Data Quality|Net Zero|linkedin.com/in/reiniel-celgie-chan" dashboards/company-x-ghg/index.html
rg -n -i "api[_-]?key|access[_-]?token|client[_-]?secret|password|confidential" dashboards/company-x-ghg/index.html
```

Expected: the first command finds the named portfolio and dashboard elements; the second finds no credentials or confidential markers.

- [ ] **Step 5: Perform local interactive verification**

Open `dashboards/company-x-ghg/index.html` in a browser and verify:

1. the Overview, Scope 1, Scope 2, Scope 3, Data Quality, and Net Zero navigation views render;
2. fiscal-year and other filters update the displayed results;
3. reset restores the initial view;
4. download produces `company-x-ghg-dashboard.html`;
5. presentation and fullscreen controls respond where browser permissions allow;
6. the illustrative-data badge and creator credit are visible; and
7. the layout remains usable at desktop and narrow mobile widths.

- [ ] **Step 6: Commit the verified dashboard**

```powershell
git add dashboards/company-x-ghg/index.html
git commit -m "feat: add illustrative Company X GHG dashboard"
```

### Task 3: Normalize the branch and publish the public GitHub repository

**Files:**
- Modify: Git branch metadata and GitHub repository settings only
- Test: local Git state, GitHub API repository metadata, and the public repository URL

**Interfaces:**
- Consumes: the verified local commits from Tasks 1 and 2 and authenticated GitHub account `rcc-tech30`.
- Produces: public repository `rcc-tech30/RCC-Sustainability-Portfolio` on default branch `main`.

- [ ] **Step 1: Re-run all pre-publication checks**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-portfolio.ps1
git status --short
git ls-files
```

Expected: verifier passes, working tree is clean, intended files are tracked, no `LICENSE*` file appears, and no ignored secret/local file is tracked.

- [ ] **Step 2: Rename the local default branch**

Run: `git branch -M main`

Expected: `git branch --show-current` prints `main`.

- [ ] **Step 3: Confirm the target repository does not already exist**

Run: `gh repo view rcc-tech30/RCC-Sustainability-Portfolio --json nameWithOwner,url,visibility`

Expected: GitHub reports that the repository cannot be found. If it exists, stop and inspect it rather than overwriting or force-pushing.

- [ ] **Step 4: Create the public repository with the approved description and push**

Run:

```powershell
gh repo create RCC-Sustainability-Portfolio --public --description "A growing portfolio of sustainability projects, data tools, dashboards, automations, and practical experiments by Reiniel Celgie Chan." --source . --remote origin --push
```

Expected: GitHub creates `https://github.com/rcc-tech30/RCC-Sustainability-Portfolio`, adds `origin`, and pushes `main` without adding a generated README, `.gitignore`, or license.

- [ ] **Step 5: Verify remote repository metadata and files**

Run:

```powershell
gh repo view rcc-tech30/RCC-Sustainability-Portfolio --json nameWithOwner,description,visibility,defaultBranchRef,url
git remote -v
git status --short
```

Expected: repository is public, description exactly matches the approved text, default branch is `main`, origin targets the new repository, and the working tree is clean.

### Task 4: Enable and verify GitHub Pages

**Files:**
- Modify: GitHub Pages repository setting only
- Test: Pages API state and deployed HTTP response

**Interfaces:**
- Consumes: public `main` branch containing root `index.html`.
- Produces: a public Pages URL redirecting to `/dashboards/company-x-ghg/` and rendering the dashboard.

- [ ] **Step 1: Enable Pages from the root of `main`**

Run:

```powershell
gh api --method POST repos/rcc-tech30/RCC-Sustainability-Portfolio/pages -f 'source[branch]=main' -f 'source[path]=/'
```

Expected: API response contains the Pages URL and build status. If Pages is already enabled, query its current configuration instead of changing unrelated settings.

- [ ] **Step 2: Poll the Pages deployment state**

Run every 15 seconds for up to 5 minutes:

```powershell
gh api repos/rcc-tech30/RCC-Sustainability-Portfolio/pages --jq '{status: .status, html_url: .html_url, source: .source}'
```

Expected: status becomes `built`, source branch is `main`, and source path is `/`.

- [ ] **Step 3: Verify the deployed root and dashboard responses**

Run:

```powershell
$root = Invoke-WebRequest -Uri 'https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/' -MaximumRedirection 5
$dashboard = Invoke-WebRequest -Uri 'https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/dashboards/company-x-ghg/'
if ($root.StatusCode -ne 200 -or $dashboard.StatusCode -ne 200) { throw 'GitHub Pages did not return HTTP 200.' }
if ($dashboard.Content -notmatch 'Illustrative portfolio data') { throw 'Deployed dashboard disclosure is missing.' }
```

Expected: exit code `0`; both URLs return HTTP `200`, and the deployed dashboard contains the disclosure.

- [ ] **Step 4: Perform final visual verification on the deployed URL**

Open the live dashboard and repeat the navigation, filtering, reset, disclosure, presentation, download, and responsive-layout checks from Task 2. Confirm that no browser console error prevents dashboard use.

- [ ] **Step 5: Record final evidence for handoff**

Run:

```powershell
git log --oneline --decorate -5
git status --short
gh repo view rcc-tech30/RCC-Sustainability-Portfolio --json url,description,visibility,defaultBranchRef
gh api repos/rcc-tech30/RCC-Sustainability-Portfolio/pages --jq '{status: .status, html_url: .html_url}'
```

Expected: clean working tree, public repository metadata, default branch `main`, and Pages status `built`. Provide both public URLs and the exact verification results to the user.
