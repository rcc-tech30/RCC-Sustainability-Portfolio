# Board Payback Interpretation Design

## Purpose

Make the Overview dashboard explain why simple payback is available or unavailable using live scenario values, while keeping board-facing notes below the graphs and critical input errors above the KPIs.

## Problem

The current model correctly returns no payback whenever annual operating savings are zero, but the Overview only says `No payback under current assumptions.` It does not identify the cost relationship responsible for that outcome or the fleet boundary at which the outcome changes.

Changing Total fleet while leaving Vehicles transitioning and Current fleet fuel cost unchanged can reduce the modelled fuel savings without reducing BEV electricity demand. The existing UI does not make that relationship visible.

## Scope

This refinement covers:

- live payback-card wording;
- a live board interpretation section below the Overview graphs;
- a calculated fleet break-even boundary where meaningful;
- separation of blocking errors from explanatory warnings;
- placement of board-facing notes after the graphs;
- accessible and responsive presentation;
- regression and browser verification.

It does not alter financial formulas, scenario defaults, validation rules, persistence, exports, charts, or other dashboard views.

## Payback Condition

The existing calculation remains authoritative:

```text
annual operating change = electricity cost change - fuel cost avoided
annual savings = absolute annual operating change, only when the change is negative
simple payback = transition investment / annual savings
```

Payback is unavailable when annual operating change is zero or positive. There is no maximum acceptable payback period hidden in the model; any positive annual saving produces a numeric result.

## Live Payback Card

The card updates through the existing render cycle on every input change.

When annual savings exist:

- value: calculated simple-payback years;
- subline: `Based on [currency] [annual savings] annual savings`;
- the existing transition-investment basis remains the primary result;
- incremental payback versus a planned replacement ICE purchase moves to the detailed interpretation note.

When annual operating cost increases:

- value: `No payback`;
- subline: `Annual operating cost increases by [currency] [amount]`.

When annual operating change is exactly zero:

- value: `No payback`;
- subline: `No annual operating savings`.

The card uses a neutral treatment for a numeric result and the existing amber warning treatment when payback is unavailable. The design will not introduce an arbitrary “acceptable payback” threshold.

## Live Board Interpretation

A new `Board interpretation` section appears immediately after the two Overview graphs. It uses dividers and negative space rather than additional elevated cards.

When payback exists, the section explains:

- transition investment;
- annual operating savings;
- simple-payback calculation;
- incremental investment and payback versus planned replacement ICE vehicles;
- the simple-payback limitation.

When payback is unavailable because costs increase, it explains:

- live fuel cost avoided;
- live electricity and certificate cost change;
- the live annual cost increase;
- a live fleet boundary where it can be calculated;
- the condition that all other inputs are held constant.

Example output, using current values rather than hard-coded figures:

```text
Fuel savings of AUD 20,000 do not cover the AUD 21,098 electricity and certificate increase. With 10 vehicles transitioning, annual savings require a total fleet of 14 vehicles or fewer, holding other assumptions constant.
```

When the annual operating change is exactly zero, the note states that fuel savings exactly equal the electricity and certificate increase.

## Fleet-Boundary Calculation

The boundary answers only this question: if Total fleet changes while Vehicles transitioning and every financial and energy assumption remain fixed, what is the largest whole-number fleet that still produces positive annual savings?

For positive Current fleet fuel cost, positive Vehicles transitioning, and positive electricity cost change:

```text
raw fleet boundary = current annual fuel cost × vehicles transitioning / electricity cost change
largest fleet with positive savings = ceiling(raw fleet boundary) - 1
```

Subtracting one when the raw boundary is a whole number preserves the strict requirement that fuel savings must be greater than—not equal to—the electricity cost increase.

The boundary is not displayed as a number when:

- no vehicles are transitioning;
- current annual fuel cost is zero;
- electricity cost change is zero or negative;
- the calculated maximum is below Vehicles transitioning and therefore is not a valid total-fleet scenario.

In those cases, the note describes the actual limiting condition instead of presenting a misleading threshold.

## Message Hierarchy

Only validation messages with severity `error` remain above the KPIs. The region is labelled as requiring input correction so board members do not treat invalid outputs as decision-ready.

Validation messages with severity `warning` move into the Board interpretation section below the graphs. This includes sample-factor warnings. The generic no-payback validation warning is replaced in the Overview by the richer live interpretation, avoiding duplicate messages.

The graph summaries remain directly below their respective graphs because they describe the charts rather than the scenario's decision implications.

## Simple-Payback Limitation

The bottom interpretation section always states that simple payback excludes maintenance, financing, tax, depreciation, battery replacement, and time value of money. This note is not placed above the KPIs or graphs.

## Accessibility

- The top error region remains an accessible labelled status area.
- The Board interpretation section has a semantic heading.
- Live explanation text is generated as text content, not HTML.
- Currency, negative/positive direction, and unavailable boundaries are communicated in words rather than color alone.
- No automatic focus movement occurs when live values update.

## Verification

Automated tests will cover:

- payback availability when annual savings are positive;
- no payback when operating change is zero or positive;
- the strict whole-number fleet boundary, including the default transition from 14 to 15 total vehicles;
- exact-boundary arithmetic;
- no-transition, zero-fuel-cost, nonpositive-electricity-change, and invalid-boundary cases;
- live card and interpretation values;
- errors remaining above the KPIs while warnings render below the graphs;
- unchanged calculation outputs.

Browser verification will cover desktop and mobile scenarios with numeric payback, no payback, exact zero savings, invalid inputs, and live input changes. It will confirm message placement, readability, no horizontal overflow, accessible labels, and no console errors.

## Acceptance Criteria

The refinement is complete when the Overview always states whether payback exists, explains the live financial reason, shows a valid live fleet boundary when calculable, keeps critical errors above the KPIs, places explanatory notes below the graphs, and leaves every underlying financial result unchanged.
