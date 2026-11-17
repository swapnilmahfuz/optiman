# OPTIMAN — Locked Prototype Blueprint V4.0
Date: 2026-11-16 | Status: **Requirements baseline locked; implementation not included in this package**.

## Purpose
Build a polished **local-PC functional client prototype** of Optiman eyewear retail, with a shared online storefront and branch POS. Production deployment comes only after client demonstration and testing. This ZIP is the **Codex planning/handover template**, not the finished web application.

## Read first
1. `AGENTS.md` — project guardrails and approval rules.
2. `docs/01_PRD.md` — locked business scope.
3. `docs/02_AppFlow.md` — end-to-end flows.
4. `docs/03_UI_Spec.md` — dark brown / cream customer UX.
5. `docs/04_TRD.md` — local PHP/MySQL and future cPanel architecture.
6. `docs/05_Schema.md` — conceptual database model.
7. `docs/06_Plan.md` — milestone and test gates.
8. `docs/07_Prototype_Acceptance.md` — client demo acceptance checklist.

## Lock semantics
`LOCKED` = explicitly confirmed in conversation. `PROPOSED` = engineering recommendation pending feasibility. `OPEN` = needs business decision; no invented default should silently become policy.

## Scope boundary
The external 3D model generator/scanner/photography box is deferred. AR is an optional add-on; calibrated 2D frames are allowed for the first demo, 3D GLB import later. AR failure must never block checkout.

## Phase 03 — frontend preview (2026-11-17)
The architecture direction and UI baseline were approved in chat. Authorization now covers **frontend visual prototyping only**. Locked business requirements are unchanged; backend, database, authentication, live payments and production deployment remain unapproved.

See [preview/README.md](preview/README.md) for local Windows instructions, mocked interactions, routes and limitations. Run the preview from `preview/index.html` or a local static server. Review evidence is in `evidence/`.

## Public interactive demo setup
[GitHub Pages deployment instructions](docs/08_Demo_Publishing.md) describe the feature-branch workflow, isolated public artifact, manual GitHub settings and future updates. Adding the workflow does not establish a successful live deployment; check the Actions deployment status.

## Current operational frontend demo
The owner-approved Phase 03.5D / 03.6 / 03.7 frontend is implemented on the feature branch. [Current demo runbook and review checklist](docs/10_Operations_Demo.md) supersede older preview-state descriptions. Backend and production integration remain unimplemented.

Latest storefront-only update: [lens finishes, Bangla guidance, advance/delivery rules and audience configuration](docs/12_Targeted_Storefront_Update.md).
