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
