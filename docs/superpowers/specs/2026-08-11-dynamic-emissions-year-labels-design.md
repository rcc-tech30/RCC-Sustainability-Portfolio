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

## Label-Length Boundary

The user's stored input is never overwritten or truncated. After outer whitespace is trimmed for presentation, the complete Baseline year and Target year values appear in the dynamic panel title, chart `aria-label`, and adjacent text summary. The HTML title and summary must defensively wrap unbroken content so arbitrary labels cannot widen the page.

Only the visual SVG year line has a compact form. Labels of 18 or fewer Unicode code points render exactly; labels longer than 18 code points render the first 17 code points followed by a single ellipsis (`…`). This derivation must use a pure tested helper, count Unicode code points rather than UTF-16 code units, and remain separate from the complete baseline and target labels used by non-SVG output. SVG interpolation continues to HTML-escape the compact label, including `<`, `>`, `&`, and `"` input.

## Chart Rendering

The line-chart label interface will accept a stage label and year label for each point. SVG output will render them as separate text lines so long stage names remain readable.

The chart remains responsive, self-contained, and dependency-free. The existing smooth path, values, markers, colors, and dimensions remain unchanged unless a small label-spacing adjustment is necessary to prevent overlap.

## Accessibility

The emissions chart container's `aria-label` will state the complete selected baseline and target years. The chart summary will also identify the complete period in readable text. Only the visual SVG year lines may use the compact labels defined above.

SVG label line breaks are implemented with separate text elements rather than visual-only punctuation.

## Verification

Automated tests will verify:

- year labels are derived from scenario inputs;
- blank values receive the specified fallbacks;
- the dynamic panel title uses both years;
- all three stage/year chart labels are present;
- accessible chart text includes both years;
- calculation outputs remain unchanged.
- full and compact year-label derivation stays correct at the 18-code-point boundary and for adversarial values;
- SVG year interpolation escapes special characters.

Browser verification will confirm immediate updates after editing both inputs, readable desktop and mobile labels, wrapping for long unbroken title and summary values, contained SVG labels, no horizontal overflow, and no console errors. It will cover ordinary custom years, blanks, a long unbroken value, and `<>&"`.

## Acceptance Criteria

The change is complete when editing Baseline year or Target year immediately updates the emissions panel title, all relevant chart labels, and the accessible chart description while leaving calculated results unchanged.
