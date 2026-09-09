# Fleet Electrification Transition Assessment

This folder contains a browser-based planning tool converted from a formula-driven fleet electrification workbook.

## View the live assessment

**[Launch the Fleet Electrification Transition Assessment](https://rcc-tech30.github.io/RCC-Sustainability-Portfolio/dashboards/fleet-electrification-transition/)**

The application is self-contained. It requires no account, installation, package, build command, or external service.

## Organizing inputs

The Inputs and assumptions view opens with General expanded on first use. General, Fleet baseline, BEV, and Electricity + Solar REC can then be opened or collapsed independently, and the browser remembers the last section combination for later visits.

Fuel-to-BEV conversion is enabled only when the BEV calculation method is Fallback. Distance-based scenarios retain the fallback value but do not use it in calculations.

## Board interpretation

The Overview keeps critical input errors above the KPIs and places explanatory notes below the graphs. Its payback card and Board interpretation update from the current scenario, including annual savings or cost increase and a strict whole-number fleet boundary where that boundary is meaningful.

The boundary holds Vehicles transitioning and every financial and energy assumption constant. It is decision support, not a permanent fleet rule.

## What the tool demonstrates

- Editable fleet, fuel, vehicle, electricity, certificate, and cost assumptions
- Distance-based and fuel-energy fallback methods for BEV electricity demand
- Scope 1 mobile-combustion emissions avoided
- Current market-based Scope 2 for facility electricity using current Solar REC coverage
- Post-transition market-based Scope 2 for facility electricity plus added BEV charging using target Solar REC coverage
- An editable market-based residual mix factor, defaulting to the Australian national 2026 factor of 0.79 kg CO2-e/kWh
- Transition and incremental investment comparisons
- Annual operating-cost impact and simple payback
- Input warnings, local scenario saving, JSON export, and print output
- Responsive, keyboard-accessible presentation

Scenario information remains in the browser and is not transmitted. Saved scenarios use browser local storage.

## Methodology boundaries

The sample market-based residual mix and mobile-combustion factors are Australian examples from DCCEEW National Greenhouse Accounts Factors 2026, Tables 2 and 9. The residual mix factor is held constant across the current FY2026 and target FY2030 cases to isolate fleet transition and Solar REC coverage effects. It is a scenario assumption, not a forecast FY2030 factor. Users outside the relevant Australian market or reporting period must replace it with an appropriate residual mix factor.

Current market-based Scope 2 equals current facility electricity multiplied by uncovered current Solar REC coverage and the residual mix factor. Post-transition market-based Scope 2 uses all post-transition electricity, which is current facility electricity plus added BEV charging, multiplied by uncovered target Solar REC coverage and the same residual mix factor. Solar REC-covered electricity is assumed to have a zero Scope 2 emission factor.

This simplified market-based scenario does not reproduce the complete DCCEEW market-based calculation and does not present a location-based result. Solar RECs are assumed eligible, exclusively claimed, purchased and retired for the applicable reporting period and electricity market. BEV charging electricity is assumed to be purchased by the company and included within its Scope 2 reporting boundary.

Sources: [DCCEEW National Greenhouse Accounts Factors 2026](https://www.dcceew.gov.au/climate-change/publications/national-greenhouse-accounts-factors-2026) and [GHG Protocol Scope 2 Guidance](https://ghgprotocol.org/sites/default/files/2023-03/Scope%202%20Guidance.pdf).

Scope 3 upstream fuel and electricity emissions, well-to-tank emissions, and transmission and distribution losses are excluded.

## Disclosure

The supplied company and figures are fictional and illustrative. Results are planning estimates, not investment advice, client work, external assurance, certification, an official emissions inventory, or a claim of formal standards conformance.
