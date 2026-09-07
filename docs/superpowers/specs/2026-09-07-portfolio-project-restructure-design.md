# Portfolio Project Restructure Design

Date: 2026-09-07

## Objective

Replace the current four-project presentation with three clearly ordered public projects. Consolidate the audited RCC Holdings Excel calculator and private Power BI report into one lead project, move Fleet Electrification to Project 02, rename the Canadian workbook as Project 03, and retire the public Company X interactive dashboard without breaking its existing URL.

## Approved public project order

### Project 01 — RCC Holdings Emissions & Decarbonization

This project presents two related artifacts as one case study:

- Primary action: **Download Excel calculator**.
- Secondary action: **Request Power BI file** through the existing Google Form workflow.
- The Excel workbook is public and stored in this repository.
- The PBIX is never stored in, committed to, or served from the public repository.
- The project copy must state that the workbook and report use illustrative sample data and require the relevant desktop application for their native features.

Public files live under:

```text
dashboards/rcc-holdings-emissions-decarbonization/
├── README.md
└── RCC_GHG_Calculator_AU_UK_2026.xlsx
```

The source workbook is the audited saved-state file:

```text
D:\RCC_GHG_Calculator_AU_UK_2026 - (Share).xlsx
SHA256: B0F98EA070F8D28178B6D428BC8109C66FC827529AF88A5FE320FF4B3B9B32B7
```

The repository copy must match that hash after copying.

The existing PBIX request dialog and Google Form endpoint remain in use. Update only the visible project association and copy:

- Kicker: `Project 01`
- Title: `Request the RCC Holdings Power BI file`
- Success and privacy messaging remain concise and retain the existing work-email validation unless a separate change is approved.

### Project 02 — Fleet Electrification

- Reuse the existing Fleet Electrification project card and live dashboard.
- Change its project number from 01 to 02.
- Preserve its current actions, data, responsive behavior, and project notes.
- Use the public card title `Fleet Electrification`; supporting copy may describe it as a transition assessment.

### Project 03 — RCC GHG Canada Operations Sample

- Reuse the existing Canadian workbook and project folder.
- Change its project number from 04 to 03.
- Change the public title to `RCC GHG Canada Operations Sample`.
- Preserve the current workbook download and project-notes link.
- Keep the fictional/sample-data disclosure.

## Company X archive behavior

The Company X interactive dashboard is no longer a featured project. Its existing public URL must continue returning a useful page instead of a 404.

Replace `dashboards/company-x-ghg/index.html` with a small, accessible archive page containing:

- A clear `Project archived` heading.
- Short copy: `This project has been archived. View the current sustainability portfolio projects by Reiniel Celgie Chan.`
- A primary link back to the homepage portfolio section.
- No dashboard data, controls, download button, scripts, or interactive views.

Update `dashboards/company-x-ghg/README.md` to the same archive status. Remove the obsolete dashboard-specific test after the replacement page has its own archive-route coverage.

The complete pre-archive project has already been preserved outside the repository:

```text
D:\RCC-Company-X-GHG-Archive-9bb69ec.zip
SHA256: 425AAA9F21EF76C883569D7F9951D04AF43A47957028817D5C89B02E64822433
```

Its extracted files were independently hash-matched and its original test suite passed 22/22 before archival.

The old dashboard remains visible in public Git history unless a separately approved history rewrite is performed. This task does not rewrite history.

## Existing Company X Power BI notes

The current `dashboards/company-x-power-bi/README.md` uses obsolete Company X and Project 03 wording. Replace it with a short archived pointer to Project 01 and its public notes. Do not add a PBIX file or a direct PBIX download URL.

## Homepage and repository documentation

Update `index.html` so Featured Work contains exactly three cards in the approved order. Remove the separate Company X HTML and Company X Power BI cards. The combined Project 01 card must have exactly the two approved primary actions: workbook download and PBIX request.

Update the root `README.md` to match the same three-project structure. Remove its stale direct PBIX download claim and the obsolete Company X project descriptions.

Do not redesign the site shell, About section, navigation, typography, or unrelated portfolio content.

## Download and request behavior

- The Project 01 Excel action points to the repository-relative workbook path and uses the `download` attribute.
- The workbook must return HTTP 200 when served locally and must retain the audited SHA256.
- The PBIX request button opens the existing accessible dialog.
- The form continues posting to the existing Google Form endpoint.
- No PBIX path, raw GitHub PBIX URL, or `.pbix` file may appear in tracked public assets.
- Closing the dialog must restore focus to its trigger; errors and success state remain accessible to assistive technology.

## Tests and verification

Add focused automated coverage for:

- Exactly three homepage project numbers and titles in the approved order.
- Project 01 workbook download path and PBIX request trigger.
- Absence of a tracked `.pbix` file and direct PBIX download link.
- Updated Project 01 dialog copy with the existing form endpoint.
- Project 02 and Project 03 actions still point to their existing artifacts.
- Company X route contains the archive message and homepage link but no former dashboard controls or data.
- Root and project README files do not advertise obsolete Company X projects or direct PBIX downloads.

Run all repository tests and `git diff --check`.

Perform browser verification at desktop, tablet, and mobile widths, including at least 1280 px, 768 px, and 375 px:

- Project cards remain readable with no horizontal overflow or clipped actions.
- The Project 01 request dialog opens, closes, restores focus, validates input, and fits the viewport.
- Keyboard focus is visible.
- The archive page is readable and its return link works.
- Reduced-motion behavior remains respected.
- The Excel download returns HTTP 200 and its downloaded hash matches the audited source.

## Scope protection

- Preserve `.superpowers/` and all unrelated modified or untracked work.
- Do not switch branches, reset, clean, rewrite history, or overwrite unrelated files.
- Do not add, commit, publish, or expose the PBIX.
- Do not create or modify a private repository in this task.
- Do not change the Google Form endpoint, credentials, deployment configuration, or GitHub Pages settings.
- Local implementation and tests do not authorize pushing or publishing. Publishing requires a separate owner instruction.

## Completion boundary

The implementation is complete locally when the three-project structure, workbook asset, archive route, documentation, automated tests, and browser checks satisfy the criteria above. Commit the implementation as one reviewable change after verification. Do not push until the owner explicitly approves publication.
