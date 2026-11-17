# 06 — Codex Implementation Plan | OPTIMAN V4.0
Status: planning blueprint. This document is not authorization to start coding.

## Gate 0: Business baseline (LOCKED)
Preserve V3.2 + V3.3 + V3.4 + V3.5 decisions summarized in PRD V4.0. Record open items; do not invent final prices, gateway or WhatsApp number.

## Gate 1: Architecture approval
Choose PHP framework compatible with 8.2+ and cPanel; verify local XAMPP/PHP/MySQL and eventual hosting; define transaction locking, payment state machine, secure uploads and deployment procedure. Seek explicit approval.

## Gate 2: UI approval
Review original dark-brown/cream responsive storefront, product and lens selection, mobile checkout, POS and admin. Seek explicit approval.

## Gate 3: Implementation authorization
Only after explicit user confirmation, proceed in small, testable batches:
A. Local environment and basic auth/branch roles.
B. Product catalog/variants/images and premium responsive storefront.
C. Lens category/option/rule admin and consultation routing.
D. MySQL stock ledger, reservations, warehouse-first allocation and concurrency tests.
E. Browser POS, shifts, receipt printing placeholder and stock integration.
F. Cart/COD checkout and simulated gateway states (not real payments for demo).
G. Prescription upload/review and private access.
H. Optional 2D AR prototype integration (camera fallback, no 3D generator).
I. Reports, returns, transfers, end-to-end demo scripts and regression suite.

## Gate 4: Client demo
Use seeded non-sensitive sample eyewear products, 2 branches + warehouse, sample prices explicitly labeled demo, simulated payments. Demonstrate branch POS -> website availability, COD -> warehouse allocation, lens fixed price -> checkout, custom -> WhatsApp message, prescription review, AR off/on.

## Gate 5: Production readiness (later)
Real payment gateway integration, printer auto-cut validation, privacy policy, backup/restore drill, SSL, host resource/concurrency tests, gateway callback verification and live credentials. Client approval before purchasing hosting.

## Change control
Every change to a locked rule requires a new version entry and explicit user approval. Maintain root AGENTS.md and the six canonical docs; preserve test evidence and rollback plans.

## Changelog — 2026-11-17 / Phase 03
- Architecture direction approved subject to PHP/MySQL compatibility checks; production-specific decisions remain open.
- UI baseline approved. Explicit authorization granted for frontend visual prototype only, on a separate branch/PR.
- Added responsive storefront, collection, product/lens selection, cart/checkout simulation, POS and read-only admin/matrix previews. No backend batch authorization is implied.
- Review checks and rollback are documented in `preview/README.md`; screenshots and actual browser results are in `evidence/`.
- Gate: stop after frontend delivery. Await user review and separate backend authorization; do not merge or publish automatically.

## Changelog — 2026-11-17 / Phase 03 realistic imagery
- Integrated the five supplied AI demonstration photographs as responsive local WebP assets; no external image dependency.
- Updated editorial hero and consistent product mapping; removed misleading alternate gallery crop.
- Scope remains frontend-only. Expected behavior, verification and rollback are documented in `preview/README.md`. Await visual approval after delivery.

## Changelog — 2026-11-17 / compact product cards
- Visual feedback: constrain collection/homepage product panels to 4:3, trimming excess studio background while retaining the full eyewear. Gallery remains square.
- Expected: compact panels regardless of intrinsic image height; verify all four widths, frame visibility and existing interactions. Rollback: revert this styling commit. Frontend-only scope unchanged.

## Changelog — 2026-11-17 / natural image holder height
- Follow-up visual correction: remove holder aspect ratio and percentage image height; let the block image determine holder height directly. Version static asset URLs to refresh cached styling.
- Expected: holder and rendered photograph have identical heights. Verify this at four widths alongside existing UI checks. Rollback: revert this commit.

## Phase 03.2 — 2026-11-17
- Authorized targeted frontend refinement on `feat/phase-03-ui-prototype`: cinematic hero, responsive header, category tiles, product presentation and detail hierarchy.
- Expected: legible overlaid copy with visible eyewear, natural image-holder height, preserved shopping interactions. Validate at 360/390/768/1024/1440px, including categories, keyboard/touch, image loading and layout stability.
- Rollback: revert the Phase 03.2 commit. No persistent state or backend changes. Stop for visual approval; no merge, deployment or Phase 04.
