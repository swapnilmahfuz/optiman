# OpenAI Codex Master Project Instructions V2.0 — OPTIMAN V4.0

## Mandatory workflow
1. **Start by reading** `README.md` and all `docs/01_PRD.md` to `docs/07_Prototype_Acceptance.md`.
2. The requirements in `01_PRD.md` are LOCKED. Do not replace them with generic ecommerce defaults.
3. This package is a **planning handover**. Do not write code, install dependencies, create migrations, or deploy merely because this package was opened. Ask for explicit implementation authorization first. The user has separately expressed a desire for a local demo; the next Codex execution still requires an explicit start/approval gate.
4. Follow architecture-first: PRD -> AppFlow -> UI Spec -> TRD -> Schema -> Plan; maintain docs before implementation.
5. Work in atomic tasks; for each task define expected behavior, tests, and rollback. Never bundle unrelated changes.
6. Use a single authoritative transactional inventory domain shared by storefront and POS. Tenant/branch authorization is server-enforced. Prevent negative sellable availability and duplicate stock mutations.
7. Do not claim real payment, printer auto-cut, webcam, AI generation, or live cPanel compatibility has been tested without actual test evidence.
8. No 3D generation engine or cloud GPU is in V1. AR is optional and must remain decoupled.
9. Never store prescription files in a publicly accessible directory; protect access, audit review, and define retention before production.
10. Preserve GOXO as **navigation reference only**, not copied design, content or assets.
11. Keep PHP 8.2+ and MySQL/cPanel compatibility as a deployment constraint. Framework selection remains PROPOSED until target hosting is checked. Do not assume Laravel 13 supports PHP 8.2.
12. Use six primary planning docs, optional seventh acceptance checklist; maintain changelog. Explicit gates: requirements -> architecture -> UI -> implementation -> release.

## Regression checklist
Cross-channel inventory; concurrent last-unit sale; warehouse fallback; returns; order/payment retries; branch permission isolation; prescription review; price matrix consultation; mobile checkout; AR-off experience; offline POS block.

## Approved Phase 03.5D / 03.6 / 03.7 amendment — 2026-11-17
The owner's consolidated prompt explicitly supersedes earlier demo assumptions: exactly Owner and Branch Manager, identical modules with location scope only; online allocation from any eligible single location (no warehouse-first preference); shared browser-local persistent synthetic operational state and simulated stock mutations; immediate same-page prescription controls without a wizard. Persist no prescription measurements, photo filenames/content, actual customer information or credentials. Production still requires transactional server authorization/inventory and private prescription storage. This phase authorizes frontend demo implementation and Pages updates only; no backend or merge.

## Targeted storefront authorization — 2026-11-17
Latest owner instruction establishes the configurable BDT 150 once-per-order delivery/lens advance policy and Bangla merchant guidance, superseding prior unconfigured-payment assumptions for the online demo only. Preserve prescription fields/validation/compatibility and operational modules. Supplied return text remains a merchant draft for legal review, subject to statutory rights; no automatic legal-policy enforcement or real payment verification is authorized.
