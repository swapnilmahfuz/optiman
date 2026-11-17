# Prescription and lens selection correction — 2026-11-17

Owner-authorized targeted correction on `feat/phase-03-ui-prototype`, based on `0299ca6`. Supersedes earlier descriptions of three prescription types and visible unavailable/consultation lens cards. No homepage, photography, category, inventory allocation, role, POS workflow or analytics redesign.

## Customer behavior

Four same-page type cards: Zero Power — No correction; Unifocal — Distance / Single Vision; Bifocal — Near & Distance; Progressive — Multifocal / No-line. Powered forms show separate OD/OS SPH, optional CYL/Axis and optional IPD. Bifocal and Progressive require positive ADD under the existing synthetic manual-entry rules; only Bifocal requires shape. Existing sign, quarter-power, Axis and IPD validation is retained. Inherited input bounds are demo fixtures, not newly asserted clinical eligibility.

Incomplete details show “Enter your prescription details to explore lens options.” Only valid FIXED_PRICE rules that match the current type/powers/shape appear in customer categories and cards. Cards show option, features, explicit pair price and selected state. No disabled/unavailable cards or internal rule status/reason text. Type/power/category/variant changes recalculate or clear the selection. Hidden rules remain blocked by add/cart and operational checkout validation.

Completed details with no purchasable options use exactly:

**Looking for a specific lens?**

For your specific lens requirements, please contact us on WhatsApp. Our team will be happy to assist you.

**Chat with Us on WhatsApp**

Consultation is a separate inquiry, never an automatically priced cart item. The fallback does not convert any UNAVAILABLE rule into consultation or FIXED_PRICE; it is a general contact invitation.

## Matrix and contact configuration

Existing rules 0–6, IDs, prices and eligibility remain intact. An additive compatibility upgrade appends a distinct Progressive consultation rule without resetting stock, sales or owner-configured rules. No progressive selling price or medical range is invented in the reset fixture. Staff → Lens Pricing supports Progressive independently; an explicit fixed price and SPH/CYL/ADD demo bounds are required before such a rule becomes purchasable. Both existing roles retain their shared matrix features.

Staff → Settings accepts an optional business WhatsApp number: 7–15 digits, international country code first, no plus, spaces or leading zero. Blank remains the default. A configured number produces `https://wa.me/{number}?text=...`, opening a new tab only after customer activation. Prefill includes product/model, SKU and general lens category; no eye powers, IPD, file name/content or customer data. Missing/invalid contact produces no broken external link; the button explains that contact details are not configured. Configuration is browser-local, consistent with this static demo. The actual Optiman business number remains an owner-supplied decision.

Progressive powers and selection are preserved in the in-memory cart, editable with Save/Cancel, and itemized at simulated checkout. Operational records persist the type/selected rule and price snapshot only; powers/files/contact fields are not stored. The demo has no backend or real uploads/payment processing.

## Review checklist

1. Product → With Power / Lens: verify four cards and immediate conditional fields, no Continue/Back.
2. Zero Power: choose a visible lens and see its explicit price. No eye form is required.
3. Unifocal: enter invented SPH +1 / −1; CYL −0.50 with Axis 90, IPD 63.5 is optional. Verify eligible fixed options only; change SPH to 7 and see the positive fallback.
4. Bifocal: enter SPH 1 and ADD 1.50 for both eyes, choose Moon Shape, then select the existing fixed pair. Flat Top retains consultation fallback unless separately configured.
5. Progressive: fields include SPH/CYL/Axis/ADD/IPD but no bifocal shape. Incomplete fields show guidance; complete fields use the contact fallback under the reset matrix.
6. Staff → Lens Pricing → Progressive: configure your own explicitly synthetic price and ranges. For test evidence only, tests use pair price 2400, SPH ≤3, CYL ≤2, ADD ≤2.50, with no clinical claim. Return to product and see only that matching progressive option. Change ADD to 3 to clear the choice and show fallback. These test values are not saved in the distributed reset seed.
7. Add a progressive configuration, edit it from cart, Cancel then Save, change quantity and inspect checkout totals. Frame Only remains unchanged.
8. Staff → Settings: supply an authorized business number; verify the fallback link and redacted prefill. Leave blank to test the graceful contact message. Automated tests use a reserved fictional number and never send a message.
9. Check 360/390px wrapping and touch targets, keyboard selection/focus, and desktop 1024/1440px. Existing operations should still share identical stock and sales behavior.

## Actual checks and artifacts

No dependencies added. Syntax/whitespace checks and `checks/demo-engine.cjs`, `checks/lens-engine.cjs`, `checks/configurator-edges.cjs` passed. Existing `ui.cjs` (45 layouts), `premium.cjs`, `shopping.cjs`, `configurator.cjs` and `operations-browser.cjs` passed at all five widths. Tests that selected obsolete unavailable/consultation dropdown entries now verify the corresponding cards are absent, the positive fallback works, and direct purchase guards still reject those internal IDs; unrelated regression coverage is retained.

`checks/lens-correction.cjs` adds four-type/conditional-field coverage, exact incomplete/fallback text, configured/missing WhatsApp, editable progressive matrix, selection revalidation, live prices, cart Save/Cancel, simulated checkout, role-independent rule integrity, privacy and responsive checks. `checks/lens-engine.cjs` verifies additive legacy-state upgrade preserving owner rule IDs/balances, contact validation, explicit progressive bounds, ADD validation and hidden-rule rejection.

Screenshots: `evidence/lens-progressive-{width}.png` and `evidence/lens-consultation-{width}.png`; JSON results: `lens-correction-results.json` and `lens-engine-results.json`. Progressive fixed-price screenshots use the test-only configured matrix. The isolated Pages package remains 22 public files, excludes README/docs/repository files, and is tested under `/optiman/`. Live Pages verification depends on network/API availability and is reported separately.

Production clinical matrices, actual WhatsApp number, authentication/backend, physical hardware and cross-device synchronization remain unverified or out of scope. Rollback: revert this correction commit; the additive stored Progressive rule can remain internal or be set to UNAVAILABLE by staff. Do not reset operational fixtures merely to roll back styling. Stop for visual acceptance; no merge into main or backend work.

Final staged result: both lens-correction and operations browser suites passed at 360/390/768/1024/1440px under `/optiman/`. All 22 artifact files match source; README/docs/.git paths returned 404. GitHub API and live Pages access returned proxy HTTP 403, so live deployment remains unverified.
