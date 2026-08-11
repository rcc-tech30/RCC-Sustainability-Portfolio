# Bidirectional Payback Fleet Boundary Design

## Purpose

Correct the board-facing fleet threshold for every valid live scenario, including Fallback BEV cases where annual savings improve rather than worsen as total fleet grows.

## Root Cause

The current threshold search assumes annual savings exist at the smallest feasible fleet and then disappear as total fleet increases. That direction is valid for the default scenario, but it is not guaranteed for Fallback calculations. Changes in certificate coverage can make the operating-cost relationship move in the opposite direction. In that case, a minimum fleet can create savings even when the smallest feasible fleet does not.

The financial model remains authoritative and unchanged. Only the interpretation of its live results changes.

## Board-Facing States

For whole-number total fleets at or above Vehicles transitioning, the interpretation classifies the live relationship as one of these states:

- **Maximum fleet:** annual savings exist up to a largest total fleet. The note says savings require `[maximum] vehicles or fewer`.
- **Minimum fleet:** annual savings begin at a smallest total fleet. The note says savings require `[minimum] vehicles or more`.
- **No finite cap:** annual savings continue as total fleet grows, so the note must not invent a maximum.
- **No valid fleet threshold:** no feasible whole-fleet size produces annual savings under the current assumptions.
- **Not calculable:** existing no-transition, zero-fuel-cost, and other invalid or non-interpretable cases retain a plain-language explanation.

When the current scenario already has payback, the Overview continues to prioritize its investment, annual savings, and payback explanation. Threshold copy remains hidden unless it is needed to explain a no-payback result.

## Calculation Design

The threshold helper uses `calculateScenario` as the single source of truth. It must not copy or modify electricity, certificate, fuel, investment, or payback formulas.

For feasible fleet size `n`, the current model's annual operating change has the form `A + B/n` while all other inputs and Vehicles transitioning remain fixed. The correction determines the direction from full-model evaluations, then finds the strict whole-number transition where annual operating change changes between negative (savings) and zero-or-positive (no savings).

The implementation must:

- support both increasing and decreasing cost relationships;
- preserve the strict rule that exactly zero annual change is not payback;
- return a maximum threshold only when savings are on the lower-fleet side;
- return a minimum threshold only when savings are on the higher-fleet side;
- return no finite cap or no valid fleet threshold when no finite crossing exists;
- avoid arbitrary search limits and avoid assuming that the default direction applies to Fallback;
- suppress a numeric threshold rather than present one that cannot be established reliably.

## Live Copy

All values and wording update through the existing render cycle after every user input.

Examples:

- Maximum: `With 10 vehicles transitioning, annual savings require a total fleet of 14 vehicles or fewer, holding other assumptions constant.`
- Minimum: `With 10 vehicles transitioning, annual savings require a total fleet of 15 vehicles or more, holding other assumptions constant.`
- No finite cap: `No maximum total-fleet threshold applies under these assumptions; modelled annual savings continue as total fleet grows.`
- None: `No feasible total-fleet size produces annual savings with the current vehicles transitioning and cost assumptions.`

Dynamic text must continue to use `textContent`. No new color-only meaning, card, chart, formula, persistence field, or user input is introduced.

## Testing

Test-driven coverage must exercise real model behavior and include:

- the existing default Distance-based maximum of 14;
- the existing default Fallback transition between 15 and 16;
- the reproduced inverse-direction Fallback scenario, proving a minimum threshold of 15;
- the adjacent values on both sides of every threshold;
- exact-zero behavior as no payback;
- all-savings/no-finite-cap and no-valid-fleet states;
- live Overview wording for both `or fewer` and `or more`;
- unchanged calculation results.

Browser verification must cover the affected Distance-based and Fallback states at desktop and mobile sizes, with no stale copy, overflow, or console errors.

## Acceptance Criteria

The correction is complete when the Overview never assumes a threshold direction, reports a maximum, minimum, or non-numeric condition that matches the full live model, and leaves every underlying financial calculation unchanged.
