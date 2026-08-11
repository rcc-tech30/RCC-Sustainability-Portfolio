# Native Power BI Dashboard Portfolio Entry

## Goal

Add the supplied Power BI file as a distinct, employer-facing portfolio project without changing or conflating it with the existing Company X HTML dashboard.

## Project structure

Create `dashboards/company-x-power-bi/` containing:

- `company-x-sustainability-dashboard.pbix`, the downloadable native Power BI Desktop file
- `README.md`, with viewing requirements, project context, demonstrated capabilities, and a fictional-data disclosure

## Portfolio presentation

Add a separate project entry to the portfolio homepage and root README. The entry will identify the artifact as a native Power BI dashboard, explain that it uses a different illustrative dataset from the existing HTML dashboard, and provide a direct PBIX download link plus a link to its project notes.

The existing HTML dashboard and its descriptions will remain unchanged. New descriptions will not use em dashes.

## Download behavior

The homepage will link directly to the PBIX file with the HTML `download` attribute. GitHub visitors will also be able to download it from the project folder. The project notes will state that Microsoft Power BI Desktop is required and that GitHub does not provide an interactive PBIX preview.

## Disclosure and boundaries

The project will state that Company X and the dashboard data are fictional and illustrative. It will not claim client work, assurance, certification, or formal standards conformance. The portfolio copy will not imply that the PBIX runs in a browser.

## Verification

Verification will cover:

- The copied PBIX file matches the supplied source by SHA-256 hash
- All local links resolve to existing files
- The portfolio's existing verification script and tests pass
- No em dash appears in newly added descriptions
- Only intended project files are staged and committed
