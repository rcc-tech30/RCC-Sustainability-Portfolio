# Inputs and Assumptions UX Refinement

## Purpose

Reduce the cognitive load of the fleet assessment's **Inputs and assumptions** view without changing its calculation model or removing access to any input.

## Scope

This refinement covers:

- collapsible input groups for General, Fleet baseline, BEV, and EAC;
- first-use and returning-user section-state behavior;
- conditional presentation of fallback-only BEV conversion inputs;
- responsive, keyboard-accessible interaction;
- regression and browser verification.

It does not change formulas, scenario values, exports, report content, or other application views.

## Section Navigation

The view will show a compact row of four filter buttons above the form:

1. General
2. Fleet baseline
3. BEV
4. EAC

Each filter controls its corresponding section independently. Users may open any combination of sections. Clicking an expanded section's filter collapses it; clicking a collapsed section's filter expands it. The section heading provides the same control and displays an explicit Show or Hide state.

The filter buttons remain visible while the user works in this view. They use the existing emerald accent, show each group's field count, wrap on small screens, and never require horizontal scrolling.

## First Use and Returning Use

On first use, only General is expanded. Fleet baseline, BEV, and EAC are collapsed.

After the user changes the open-section combination, the application stores that UI preference in a dedicated, versioned local-storage entry. On later visits, it restores the last valid combination. Invalid, missing, or unreadable stored data falls back to the first-use state.

Section-state persistence is separate from scenario-data persistence. Resetting scenario inputs does not reset the open-section preference. At least one section is not required to remain open; users may collapse all four.

## Section Structure and Motion

Each section uses a semantic heading button with `aria-expanded` and an `aria-controls` relationship to its content region. Filter buttons expose the same expanded state. Both control surfaces stay synchronized.

Expanded content uses the existing form grid. Collapsed content is removed from the visual flow and keyboard tab order. A short opacity and vertical-translation transition may reinforce the change without animating layout dimensions. Reduced-motion preferences disable the transition.

The design uses spacing and dividers for hierarchy rather than adding decorative cards or heavy shadows.

## Conditional Fuel-to-BEV Input

The Fuel-to-BEV conversion input is applicable only when **BEV calculation method = Fallback**.

When Distance-based is selected:

- the field remains visible for context;
- the control is disabled and visually muted;
- its helper text reads **Applicable only when BEV calculation method = Fallback.**;
- a **Not applicable** status is shown;
- the existing stored value is preserved but ignored by calculations.

When Fallback is selected:

- the field becomes enabled and uses the standard editable-control appearance;
- its status changes to **Required for Fallback**;
- validation continues to require a valid positive fallback value.

Any other input used only by the fallback formula receives the same conditional enabled/disabled treatment and explanatory helper text. This keeps the visible form consistent with the active calculation path.

## Data and Error Handling

The calculation engine remains unchanged. UI state changes trigger presentation updates only. Changing the BEV method continues to trigger the existing scenario calculation and validation cycle.

Local-storage access remains defensive: malformed data, unknown section identifiers, or unavailable storage must not block form use. The application falls back silently to the default section state.

## Accessibility

- All section controls are native buttons and keyboard operable.
- Visible focus states use the existing accent treatment.
- Expanded state is communicated through `aria-expanded`.
- Controlled content is linked through `aria-controls`.
- Disabled fallback-only inputs use the native `disabled` state and explanatory text.
- Filter labels and field statuses do not depend on color alone.

## Verification

Automated regression tests will verify:

- the four section controls and content regions exist;
- the first-use default expands only General;
- section state is stored separately and restored defensively;
- groups toggle independently;
- fallback-only fields are disabled for Distance-based and enabled for Fallback;
- the explanatory note and status labels are present;
- the application remains self-contained.

Browser checks at desktop and mobile widths will verify:

- section filters wrap without horizontal overflow;
- opening and closing sections updates both control surfaces;
- the last open-section combination survives reload;
- keyboard focus remains visible and logical;
- changing the BEV method updates conditional fields immediately;
- no browser console errors occur.

## Acceptance Criteria

The refinement is complete when a first-time user sees only General expanded, a returning user sees their last valid section combination, all groups can be independently opened or collapsed, and fallback-only fields clearly become active only for the Fallback calculation method without changing assessment results.
