# Dynamic Emissions Year Labels Design

## Purpose

Make the Baseline year and Target year inputs visibly affect the Overview dashboard by incorporating them into the emissions pathway title, chart labels, and accessible description.

## Scope

This change affects only emissions-pathway presentation. It does not change scenario calculations, emissions values, the input schema, persistence, exports, or other dashboard views.

## Display Behavior

The emissions panel title will update immediately to:

```text
Emissions pathway: [Baseline year] baseline to [Target year] target
```

The three chart points will use two-line labels:

1. `Baseline` with the Baseline year underneath.
2. `After fleet transition` with the Target year underneath.
3. `After certificates` with the Target year underneath.

This preserves both dimensions users need: the reporting period and the meaning of each stage.

## Data Flow

The existing scenario render cycle remains the single source of truth. Each render derives display-safe baseline and target labels from `scenario.baselineYear` and `scenario.targetYear`, then supplies those labels to the title, chart renderer, chart accessible label, and chart summary.

Changes to either year input already trigger the scenario render cycle, so no separate event listener or state store is required.

## Blank Values

Whitespace-only or empty Baseline year values display as `Baseline year`. Whitespace-only or empty Target year values display as `Target year`.

Fallback text affects presentation only. The user's underlying input value remains unchanged.

## Chart Rendering

The line-chart label interface will accept a stage label and year label for each point. SVG output will render them as separate text lines so long stage names remain readable.

The chart remains responsive, self-contained, and dependency-free. The existing smooth path, values, markers, colors, and dimensions remain unchanged unless a small label-spacing adjustment is necessary to prevent overlap.

## Accessibility

The emissions chart container's `aria-label` will state the selected baseline and target years. The chart summary will also identify the period in readable text. These descriptions use the same display-safe labels as the visual title and axes.

SVG label line breaks are implemented with separate text elements rather than visual-only punctuation.

## Verification

Automated tests will verify:

- year labels are derived from scenario inputs;
- blank values receive the specified fallbacks;
- the dynamic panel title uses both years;
- all three stage/year chart labels are present;
- accessible chart text includes both years;
- calculation outputs remain unchanged.

Browser verification will confirm immediate updates after editing both inputs, readable desktop and mobile labels, no horizontal overflow, and no console errors.

## Acceptance Criteria

The change is complete when editing Baseline year or Target year immediately updates the emissions panel title, all relevant chart labels, and the accessible chart description while leaving calculated results unchanged.
