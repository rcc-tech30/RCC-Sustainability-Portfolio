# Overview KPI Story Design

## Purpose

Reorder and refine the Fleet Electrification Overview cards so the emissions story is immediately understandable to a board audience. The cards must show why avoided mobile-combustion Scope 1 does not translate directly into the same reduction after fleet transition: charging the BEVs adds grid-based Scope 2 emissions.

## Design Direction

This is a targeted evolution of the existing dashboard, not a new visual system. Preserve the current light theme, navy and emerald brand treatment, card dimensions, typography, responsive grid, accessibility behavior, inputs, charts, detailed views, and calculation model.

The dashboard remains trust-first and analytical:

- design variance: 3;
- motion intensity: 2;
- visual density: 6;
- no new card, animation, icon, color family, or dependency;
- use green for a beneficial emissions outcome, amber for an adverse outcome, and navy for neutral information.

## Approved Card Order

The Overview retains eight cards in a four-column desktop grid and the existing responsive collapse.

### First row: transition and emissions pathway

1. **Fleet transition**
2. **Scope 1 avoided**
3. **Scope 2 increase**
4. **Residual after certificates**

### Second row: financial outcome and decision context

5. **Annual operating impact**
6. **Simple payback**
7. **Net emissions change**
8. **Net transition investment**

The first row answers what changed in the emissions pathway. The second row combines the primary financial decision measures with the net pre-certificate emissions outcome and required investment.

## Live Calculation Requirements

Every KPI must update through the existing render cycle whenever any contributing input changes. No displayed number or direction word may be hard-coded from the sample scenario.

### Scope 2 increase

The third card replaces `BEV electricity added`.

```text
Scope 2 increase = post-transition grid Scope 2 - baseline grid Scope 2
```

For the sample scenario:

```text
148.55 tCO2e - 124.00 tCO2e = 24.55 tCO2e
```

Card content:

- label: `Scope 2 increase`;
- value: live Scope 2 difference in tCO2e;
- subline: `Grid Scope 2: [baseline] to [post-transition]`;
- treatment: amber when the difference is positive, neutral when exactly zero.

This is a grid-based figure before certificate adjustment. It must not use target certificate coverage to reduce the displayed increase.

### Residual after certificates

The existing residual result moves to the fourth card.

Card content:

- label: `Residual after certificates`;
- value: existing live `residualAfterCertificates` result;
- subline: `Before certificates: [residualBeforeCertificates]`.

The subline must not call `residualBeforeCertificates` a grid-based result because it can include remaining Scope 1 as well as post-transition grid Scope 2.

### Net emissions change

The seventh card replaces `BEV electricity added` in the second row. Its live signed relationship is:

```text
net reduction before certificates
  = baseline total emissions - residual before certificates
  = Scope 1 avoided - Scope 2 increase
```

For the sample scenario:

```text
46.49 tCO2e - 24.55 tCO2e = 21.94 tCO2e reduction
```

The card uses one stable, compact label: `Net emissions change`.

- When the signed result is positive:
  - value: absolute live result in tCO2e;
  - subline: `Reduction before certificates`;
  - treatment: green.
- When the signed result is negative:
  - value: absolute live result in tCO2e;
  - subline: `Increase before certificates`;
  - treatment: amber.
- When the signed result is exactly zero:
  - value: `0.00 tCO2e`;
  - subline: `No change before certificates`;
  - treatment: neutral.

The main value does not carry a minus sign. Direction is communicated in words and color, so an increase cannot be mistaken for a negative reduction.

### Net transition investment

The existing live transition-investment card moves to position eight. Its value and comparison with a new ICE purchase remain unchanged.

## Removed Overview Metrics

The Overview no longer displays dedicated cards for:

- `BEV electricity added`;
- `Additional certificate cost`.

These values are not removed from the model or detailed views:

- BEV electricity remains in the Emissions detail view and continues to drive post-transition Scope 2;
- additional certificate cost remains in the Cost/payback detail view;
- certificate cost remains included in annual operating impact, payback, and board interpretation calculations.

This avoids suggesting an extra standalone cost on the headline dashboard when the scenario can still produce total annual savings, without concealing the cost from detailed analysis.

## Accessibility and Responsive Behavior

- Preserve the semantic article structure and existing reading order.
- The DOM order must match the approved visual order at every breakpoint.
- Values use text, units, and direction words; color is never the only signal.
- Existing live rendering must update text and card state without moving focus.
- At widths below 1100px, cards remain two columns; below 640px, one column.
- Long currency and tCO2e values must wrap or scale within their cards without horizontal page overflow.

## Detailed Views and Model Integrity

Do not change:

- `calculateScenario` formulas or existing result values;
- scenario defaults or input fields;
- validation, persistence, export, charts, or navigation;
- the Emissions and Cost/payback detail rows, except where tests need to confirm they remain present;
- the board payback interpretation introduced in the previous feature.

The new Overview values should be derived from existing calculation results. A pure presentation helper may be added if it makes direction and copy independently testable, but it must not duplicate the underlying emissions formulas.

## Verification

Automated coverage must verify:

- the exact eight-card DOM order and removal of the two replaced Overview cards;
- sample Scope 2 increase of approximately `24.552 tCO2e`;
- sample net pre-certificate reduction of approximately `21.937536 tCO2e`;
- live derivation from current model results rather than hard-coded sample text;
- positive reduction, negative increase, and exact-zero Net emissions change states;
- appropriate green, amber, and neutral card states;
- additional certificate cost and BEV electricity remain available in their detailed views;
- all existing model outputs remain unchanged.

Browser verification must exercise desktop and mobile layouts with:

- the sample reduction state;
- an input change that alters Scope 2 increase live;
- a scenario where Scope 2 increase exceeds Scope 1 avoided;
- an exact-zero net emissions change;
- no stale text, horizontal overflow, console errors, or accessibility regression.

## Acceptance Criteria

The change is complete when the Overview tells a coherent live story from Scope 1 avoided, through Scope 2 added by charging, to residual and net emissions outcomes; the financial cards remain accurate; detailed certificate and electricity information is retained; and no calculation is duplicated or changed.
