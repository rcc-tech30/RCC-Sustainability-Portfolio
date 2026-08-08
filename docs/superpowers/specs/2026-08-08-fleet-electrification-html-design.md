# Fleet Electrification HTML Conversion Design

## Purpose

Convert `Fleet_Electrification_Transition_Assessment(1).xlsx` into a professional, self-contained web application for the RCC Sustainability Portfolio. The application must preserve the workbook's decision logic, editable assumptions, warnings, methodology, and limitations while making the assessment usable directly through GitHub Pages.

The result is a portfolio demonstration and reusable planning tool. It is not a verified emissions inventory, investment recommendation, client engagement, or substitute for geography-specific factors and professional review.

## Audience and success criteria

The primary audience is a recruiter, sustainability practitioner, or business decision-maker assessing Reiniel Celgie Chan's ability to translate a spreadsheet model into a clear digital decision tool.

The conversion succeeds when:

- a visitor can understand the tool without opening Excel;
- all company assumptions needed by the workbook can be edited in the browser;
- calculated outputs agree with the workbook for the supplied sample scenario and representative edge cases;
- warnings identify invalid or incomplete inputs before results are trusted;
- the interface works on desktop, tablet, and mobile;
- the app is usable by keyboard and respects reduced-motion preferences;
- the app requires no build step, account, server, or external runtime dependency; and
- disclosures and factor-replacement guidance remain prominent.

## Repository placement

Work will occur on branch `feat/fleet-electrification-html`.

```text
RCC-Sustainability-Portfolio/
├── README.md
├── index.html
├── dashboards/
│   ├── company-x-ghg/
│   └── fleet-electrification-transition/
│       ├── README.md
│       └── index.html
├── scripts/
│   └── verify-portfolio.ps1
└── docs/superpowers/
    ├── specs/
    └── plans/
```

The application is a single HTML file with embedded CSS and JavaScript. Its project README provides viewing instructions, methodology boundaries, and a link to the live GitHub Pages route.

The existing Company X dashboard remains unchanged. The root portfolio page will become a small project gallery because redirecting every visitor to the older dashboard would make the new live project difficult to discover. Existing project URLs remain stable.

## Product structure

### Portfolio landing page

The root `index.html` will replace the current redirect with an accessible portfolio index. It will introduce the portfolio, present both live projects, and link to their project notes. It will remain dependency-free and visually consistent with the repository README.

### Assessment application

The application will use five primary views:

1. **Overview**: executive KPIs, emissions pathway, annual operating-cost comparison, active warnings, and concise interpretation.
2. **Scenario inputs**: all editable company, fleet, energy, capital, operating, and certificate assumptions.
3. **Emissions**: Scope 1 mobile-combustion calculations, BEV electricity demand, grid-based Scope 2, EAC-adjusted Scope 2, and residual emissions.
4. **Cost and payback**: investment comparisons, fuel savings, electricity procurement, certificate cost, operating impact, and simple payback.
5. **Methodology**: calculation explanations, factor table, sources, limitations, and replacement guidance.

Desktop navigation uses a persistent left rail. Below tablet width it becomes a compact top navigation with a view selector. URL hashes identify views so browser history and direct links remain useful.

## Calculation model

The JavaScript calculation engine will be isolated from rendering. It accepts a normalized scenario object and returns outputs plus validation messages. No calculated result will be hardcoded into the interface.

The engine will reproduce the workbook's principal formulas:

- fleet transition percentage capped at 100%;
- diesel, petrol, and other-fuel Scope 1 emissions;
- Scope 1 avoided and remaining;
- distance-based BEV electricity demand;
- fuel-energy fallback BEV demand;
- post-transition electricity demand;
- baseline and post-transition grid-based Scope 2;
- separately reported EAC-adjusted Scope 2;
- current, target, and additional certificate cost;
- electricity procurement cost change;
- fuel cost avoided;
- combined annual operating-cost increase or savings;
- transition investment and incremental investment versus a new ICE purchase;
- simple payback under both investment bases; and
- baseline, pre-certificate, and post-certificate residual emissions.

Scope 3 well-to-tank factors remain excluded, matching the workbook. Certificates do not alter the grid-based Scope 2 result; they produce a separately labelled adjusted result.

## Inputs and data handling

All workbook assumptions required by the calculation engine will be represented as typed controls. Number fields enforce sensible minimums, percentage fields are bounded from 0% to 100%, and select fields accept only supported values.

The default state reproduces the workbook's illustrative sample scenario. The header must show `Sample data` until the user explicitly changes the data-status field.

Scenario data remains in the browser. No data is transmitted. The application provides:

- reset to the supplied sample scenario;
- save and restore the current scenario using `localStorage`;
- export scenario inputs and calculated outputs as JSON; and
- print-friendly output through the browser print dialog.

If stored data is missing, malformed, or from an incompatible schema version, the application ignores it safely and explains that the sample scenario has been restored.

## Validation and states

Blocking errors prevent affected results from being presented as decision-ready. Advisory warnings remain visible while results are shown.

Validation covers at minimum:

- zero or negative fleet size;
- vehicles transitioning greater than total ICE vehicles;
- unsupported BEV calculation method;
- missing distance or efficiency inputs for the distance-based method;
- missing fuel or conversion inputs for the fallback method;
- missing electricity consumption, rate, or grid factor;
- certificate coverage outside 0% to 100%;
- negative cost inputs;
- no operating savings, making payback unavailable; and
- sample factors still being used while data status is marked as user data.

Unavailable payback is labelled `No payback under current assumptions`; it is never displayed as zero or infinity.

## Visual direction

Design read: an enterprise sustainability decision tool for business users, presented as polished recruiter-facing portfolio work.

- `DESIGN_VARIANCE: 4`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 7`

The interface uses a light theme, a deep navy structural color, cool neutral surfaces, and one emerald accent for active controls and favorable outcomes. Orange is reserved for warnings and cost increases; red is reserved for blocking errors. These semantic colors do not become competing decorative accents.

Typography uses a system sans-serif stack for offline reliability. Tabular numerals are used for KPIs. Cards are limited to metrics and grouped controls where containment improves comprehension. Detailed calculations use aligned rows and disclosure panels rather than a grid of decorative cards.

The geometry system is consistent: 12-pixel panels, 8-pixel inputs, and pill treatment only for status labels. Shadows are subtle and tinted. Motion is limited to view transitions, disclosure expansion, and chart updates, with a no-motion fallback.

## Charts and interaction

Charts will use semantic HTML, CSS, and inline SVG generated by JavaScript. No charting package or remote CDN is required.

The overview contains:

- an emissions pathway chart comparing baseline, after fleet electrification, and after certificate adjustment; and
- an annual operating-cost comparison separating electricity and fuel costs.

Every chart includes an adjacent accessible data summary. Charts update when inputs change and use stable scales, explicit units, and readable labels. Tooltips are supplemental; no essential value is available only on hover.

## Accessibility and responsiveness

The application targets WCAG 2.2 AA fundamentals:

- semantic landmarks and heading order;
- explicit labels and descriptions for every input;
- keyboard-operable navigation and controls;
- visible focus indicators;
- error messages connected to relevant controls;
- sufficient color contrast;
- status conveyed by text as well as color;
- `aria-live` announcements for recalculation and save/reset feedback;
- reduced-motion support; and
- chart summaries readable without graphics.

At narrow widths, KPI sections become a single-column flow, charts scroll or reflow without clipping, forms remain one column, and the navigation does not obscure content.

## Content and disclosures

The application and project README will state that:

- the supplied company and figures are fictional and illustrative;
- results are planning estimates, not investment advice or assured reporting;
- Australian mobile-combustion factors are examples from DCCEEW National Greenhouse Accounts Factors 2025, Table 9;
- the grid factor and several operating assumptions are fictional samples;
- users must replace factors for their geography, fuel, vehicle class, and reporting year;
- Scope 3 well-to-tank emissions are excluded; and
- certificate treatment is a simplified planning representation and does not establish eligibility, ownership, retirement, or reporting compliance.

No claim of formal GHG Protocol conformance, external assurance, certification, or client deployment will be made.

## Verification

Verification will include:

1. static repository checks for required files, links, disclosures, and likely secrets;
2. unit-style JavaScript tests for calculation functions and validation rules;
3. parity tests using the workbook sample scenario, including expected headline values;
4. edge cases for partial transition, no certificate coverage, no operating savings, and invalid fleet counts;
5. automated browser checks for navigation, input recalculation, reset, persistence, export, responsive layout, console errors, and keyboard focus;
6. visual inspection at representative desktop and mobile sizes; and
7. a final scan confirming no external dependencies, real client data, or embedded credentials.

Sample-scenario parity includes at least:

- 10 of 10 vehicles transitioned;
- 46.489536 tCO2e Scope 1 avoided;
- 39,600 kWh added BEV electricity under the distance method;
- 148.552 tCO2e post-transition grid-based Scope 2;
- AUD 13,178 additional certificate cost;
- AUD 8,902 annual operating savings;
- AUD 370,000 transition investment;
- 41.5637 years simple payback on the transition basis; and
- 0 tCO2e modelled residual emissions after 100% certificate adjustment.

Numeric comparisons will use explicit tolerances to avoid false failures from floating-point rounding.

## Out of scope

- Server-side storage, authentication, multi-user collaboration, or telemetry
- Live emission-factor APIs or automatic regulatory updates
- Financial measures beyond the workbook, such as discounted cash flow, financing, tax, depreciation, maintenance savings, or residual-value forecasting
- Formal compliance determination or assurance
- Editing or replacing the original workbook
- Rebuilding the existing Company X dashboard

