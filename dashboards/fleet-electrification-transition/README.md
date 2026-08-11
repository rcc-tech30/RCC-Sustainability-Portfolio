# Fleet Electrification Transition Assessment

This folder contains a browser-based planning tool converted from a formula-driven fleet electrification workbook.

## View the live assessment

**[Launch the Fleet Electrification Transition Assessment](https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/dashboards/fleet-electrification-transition/)**

The application is self-contained. It requires no account, installation, package, build command, or external service.

## Organizing inputs

The Inputs and assumptions view opens with General expanded on first use. General, Fleet baseline, BEV, and EAC can then be opened or collapsed independently, and the browser remembers the last section combination for later visits.

Fuel-to-BEV conversion is enabled only when the BEV calculation method is Fallback. Distance-based scenarios retain the fallback value but do not use it in calculations.

## Board interpretation

The Overview keeps critical input errors above the KPIs and places explanatory notes below the graphs. Its payback card and Board interpretation update from the current scenario, including annual savings or cost increase and a strict whole-number fleet boundary where that boundary is meaningful.

The boundary holds Vehicles transitioning and every financial and energy assumption constant. It is decision support, not a permanent fleet rule.

## What the tool demonstrates

- Editable fleet, fuel, vehicle, electricity, certificate, and cost assumptions
- Distance-based and fuel-energy fallback methods for BEV electricity demand
- Scope 1 mobile-combustion emissions avoided
- Added grid-based Scope 2 from charging
- Separately reported certificate-adjusted Scope 2
- Transition and incremental investment comparisons
- Annual operating-cost impact and simple payback
- Input warnings, local scenario saving, JSON export, and print output
- Responsive, keyboard-accessible presentation

Scenario information remains in the browser and is not transmitted. Saved scenarios use browser local storage.

## Methodology boundaries

The sample mobile-combustion factors are Australian examples from DCCEEW National Greenhouse Accounts Factors 2025, Table 9. The grid factor, certificate price, charging loss, and fallback conversion factor are illustrative assumptions. Users must replace them with evidence appropriate to their geography, fuel, vehicle class, technology, and reporting year.

Scope 3 well-to-tank emissions are excluded. Certificate treatment is a simplified planning representation and does not establish instrument eligibility, ownership, retirement, or reporting compliance.

## Disclosure

The supplied company and figures are fictional and illustrative. Results are planning estimates, not investment advice, client work, external assurance, certification, an official emissions inventory, or a claim of formal standards conformance.

