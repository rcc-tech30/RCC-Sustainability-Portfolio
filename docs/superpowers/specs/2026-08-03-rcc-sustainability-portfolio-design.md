# RCC Sustainability Portfolio — Design Specification

## Purpose

Create a public, employment-focused GitHub portfolio for Reiniel Celgie Chan. The repository will begin with an interactive greenhouse-gas dashboard and grow to include sustainability analyses, data tools, n8n automations, and other practical learning projects.

The repository must present credible professional work without implying that fictional examples are real client engagements or assured sustainability reports.

## Repository identity

- GitHub repository name: `RCC-Sustainability-Portfolio`
- README title: **RCC Sustainability Portfolio**
- Visibility: public
- GitHub description: **A growing portfolio of sustainability projects, data tools, dashboards, automations, and practical experiments by Reiniel Celgie Chan.**
- License: none initially; default copyright remains in effect
- Git ignore rules: included from the first commit

## Initial content

The first featured project is the supplied single-file Company X GHG dashboard. It will remain self-contained and interactive.

The dashboard and README must state clearly that:

- Company X and all other entities are fictional;
- all figures are illustrative portfolio data;
- the example is not client work, external assurance, certification, or an official emissions inventory; and
- GHG Protocol references describe the conceptual approach, not formal conformance or verification.

## Information architecture

The repository will use a structure that can expand without renaming or repositioning the portfolio:

```text
RCC-Sustainability-Portfolio/
├── README.md
├── .gitignore
├── index.html
├── dashboards/
│   └── company-x-ghg/
│       └── index.html
├── automations/
└── docs/
```

`index.html` will provide a stable GitHub Pages entry point and redirect visitors to the initial featured Company X dashboard. The canonical project copy lives under `dashboards/company-x-ghg/` so future projects can coexist cleanly. When the portfolio contains multiple projects, the root entry point can become a project gallery without changing individual project URLs.

Empty category directories will not be committed merely to reserve space. They appear above only as the intended growth pattern and will be created when they contain a real project.

## README design

The README will act as the recruiter-facing portfolio index. It will include:

1. a concise professional introduction;
2. a statement of the portfolio's evolving scope;
3. a featured-project section for the live Company X dashboard;
4. the capabilities demonstrated by that project;
5. the fictional-data and non-assurance disclaimer;
6. a simple future-project taxonomy covering dashboards, carbon accounting and analysis, workflow automation, and data tools; and
7. a link to Reiniel Celgie Chan's LinkedIn profile already present in the dashboard.

The writing should emphasize outcomes and demonstrated skills without overstating expertise, standards compliance, or real-world deployment.

## GitHub Pages

GitHub Pages will publish from the default branch and repository root if account and repository settings permit it. The live site must work without a build system or external package installation.

The deployed page and repository URLs will be verified after publication. If Pages activation is unavailable through the available GitHub tooling, the repository will still be published and the precise manual activation step will be reported.

## `.gitignore` and security

The initial `.gitignore` will be small and technology-neutral. It will exclude common local environment, secret, operating-system, editor, dependency, build, log, and temporary files, including patterns such as `.env*`, credential or secret files, `.vscode/`, `.idea/`, `node_modules/`, logs, and generated output directories.

Because this is a public repository, every future n8n export must be reviewed before commit. Workflow JSON must not contain API keys, access tokens, webhook secrets, credential payloads, private endpoint details, personal data, or confidential business data. Ignore rules reduce accidental commits but do not replace manual review or secret scanning.

## Dashboard preservation and changes

The supplied HTML is already a self-contained artifact with embedded styles, scripts, illustrative records, accessibility labels, and a fictional-data badge. The initial implementation should preserve its behavior and visual design.

Only narrowly scoped changes are permitted for publication readiness, such as strengthening the disclaimer, correcting broken links, adjusting the downloadable filename, or adding navigation back to the portfolio index. Any change must be verified against the original behavior.

## Verification

Before publication:

- scan committed files for likely secrets and identifying client data;
- confirm there is no license file and the intended `.gitignore` is tracked;
- validate repository structure and links;
- open the dashboard locally and test navigation, filters, reset, download, presentation mode, and responsive layout where tooling permits;
- confirm the fictional-data disclaimer is visible;
- confirm the public repository name, description, visibility, default branch, and committed files; and
- confirm the GitHub Pages URL loads successfully if Pages is enabled.

## Success criteria

The result is complete when a public GitHub repository named `RCC-Sustainability-Portfolio` exists under the user's authenticated GitHub account, contains a professional README and the working Company X dashboard, includes the recommended `.gitignore`, contains no license, exposes no apparent secrets or real client data, and provides a verified live dashboard link when GitHub Pages can be activated.
