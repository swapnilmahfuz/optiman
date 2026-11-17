# Targeted storefront update — 2026-11-17

Scope: owner-requested lens finish names, Bangla purchase guidance/merchant policy, delivery/advance calculations and audience filters. No homepage redesign, photography change, new prescription type, field/validation/compatibility change, POS workflow, inventory algorithm, role, barcode, receiving, transfer or analytics change.

## Lens finishes and pricing

The existing lens-category control lists White Lens, Anti-Reflective Lens, Blue Cut Lens, Photochromic Lens and Photochromic + Blue Cut Lens. These are finishes, separate from Zero/Unifocal/Bifocal/Progressive prescription types. Only compatible FIXED_PRICE cards are rendered. Selecting an unpriced/consultation finish gives the existing exact positive WhatsApp fallback, with no automatic quote or unavailable card.

| Existing rule | Customer finish | Price treatment |
| --- | --- | --- |
| Clear / anti-reflective, ID 0 | Anti-Reflective Lens | Existing demo 1200 retained |
| Blue-cut coating, ID 1 | Blue Cut Lens | Existing demo 1600 retained |
| Light-adaptive, ID 2 | Photochromic Lens | Existing demo 2200 retained |
| Moon standard pair, ID 6 | White Lens | Existing bifocal demo 1800 retained with original eligibility |
| New White Lens inquiry | White Lens | CONSULT_WHATSAPP; no price supplied |
| New combined-finish inquiry | Photochromic + Blue Cut Lens | CONSULT_WHATSAPP; no price supplied |

Progressive keeps its separate prescription type, original conditional fields and explicit eligibility/price rules. Existing owner-configured rules retain IDs/prices/statuses; staff can set a finish label on the lens rule. Existing rules without a finish use White Lens as their display grouping until assigned. This grouping makes no coating/clinical claim. No new selling price or clinical bound is invented. Production catalog names, prices and finish metadata require owner verification.

## Payment calculations and state

Delivery defaults to BDT 150 and is editable in Staff → Settings. It is added once per online order, regardless of line/quantity. Required advance = all lens charges plus delivery. Remaining COD = frame charges after the required advance. Cart, product and checkout show item subtotal, delivery, order total, required advance and remaining COD. Product and checkout guidance use the exact supplied Bangla wording; the fee digits follow the configured charge. Existing English interface/fields/buttons remain English; no language switcher.

Example: two Atlas frame-only pairs and one Atlas + Blue Cut pair have frames 9600, lenses 1600, delivery 150, order total 11350, advance 1750, remaining COD 9600. Fee and merchandise prices are snapshotted on the order. A stale delivery quote is rejected. Tax/discounts and real payment providers remain unconfigured.

Stock reservations continue at the same existing checkout event and eligible location; reservation does not imply confirmation. New orders have a separate `confirmation` state. Received online payment simulation alone does not verify advance. Tracking → **Simulate advance verification** explicitly verifies the complete required advance; insufficient amounts cannot confirm or dispatch. This is not gateway integration and collects no funds. The existing review/customer-quote gate remains. A higher accepted lens quote requires the additional advance; any previously verified excess reduces remaining COD. Old demo orders without a payment snapshot remain historical rather than being silently repriced. Merchandise sales/revenue analytics continue excluding delivery, so POS and financial reports retain their existing meanings.

## Policy and audience metadata

Product and checkout include the supplied Bangla policy verbatim in **Shipping, Return & Exchange**. It is visibly labeled a merchant-supplied draft requiring legal review before production publication and subject to statutory consumer rights. The expectation-based return paragraph and defect-only paragraph conflict; the policy must also be reconciled with the earlier seven-day planning baseline. No automatic cancellation/return enforcement was added, no statutory rights are suppressed, and existing staff return/exception tools remain unchanged.

Listing audience filters Men/Women/Kids combine with existing categories/search/price/sort and are also reachable as `#shop/men`, `#shop/women`, `#shop/kids`. Staff → Products → Edit shared pricing has optional comma-separated audience tags on the same SKU. No product duplication or inferred gender/child-fit claim. Reset fixtures intentionally have no assigned audiences because the owner supplied no product-to-audience mapping; audience-specific results stay honestly empty until tags are assigned. Reset clears filters and retains the approved default low-to-high sort. Homepage/top navigation are unchanged.

## Review and validation

1. Product: expand policy with keyboard; inspect exact Bangla instructions and legal-review note. Frame Only still bypasses powers.
2. With Power / Lens: inspect five finish choices and the four unchanged prescription types. Zero/Unifocal retain their explicit prices; Bifocal Moon works; Progressive retains its rules/fallback. White (outside the seeded bifocal range) and combined finish remain consultation-only until configured.
3. Add frame-only and lens items in different quantities. Check once-per-order delivery and advance/COD arithmetic in cart/checkout.
4. Submit a checkout simulation. Tracking must say awaiting advance, with a separate verification action. Only simulated verification can confirm. Verify retry does not mutate stock twice. Failed payment/no-allocation behavior remains intact.
5. Change delivery in Settings; existing order snapshots stay unchanged and new quotes/guidance update.
6. Tag one synthetic SKU Men and Women, then test both audience filters and category intersection. Kids stays empty without an explicit tag. Check same master SKU and unchanged inventory.

Checks: `checks/storefront-payments.cjs` (financial/state/preservation invariants), `checks/storefront-update.cjs` (five-width browser flows), and all existing engine/UI/premium/shopping/configurator/boundary/lens/operations suites. Existing browser selectors were updated only for requested finish labels and the presence of a finish filter during consultation; pricing assertions, hidden-rule guards and operational checks are retained. Node engine dispatch regression now explicitly verifies the new required advance after accepting a revised quote.

Evidence: `evidence/storefront-checkout-{360,390,768,1024,1440}.png`, `storefront-update-results.json`, `storefront-payment-results.json`, plus Pages package validation. No dependencies added. Physical devices, production legal validity, live gateway verification and PHP/MySQL remain unverified. The business WhatsApp number and unpriced finish rates remain owner-supplied decisions.

Rollback this targeted commit; preserve historical operational state and prior price snapshots. Push feature branch only, no main merge or backend work. Stop for visual acceptance. Live Pages status is reported separately when network allows.

## Actual delivery results
All eleven test suites passed: three Node engine suites and eight browser suites. Browser checks ran at 360/390/768/1024/1440px against the staged `/optiman/` package (boundary suite is viewport-independent). The existing lens-correction suite now honors reduced motion to stabilize automatic smooth-scroll timing during repeated cart edits; edit/save/cancel and all other assertions remain. Syntax and whitespace checks passed. The 22 public files match source exactly; README/docs/.git requests returned 404. GitHub API returned proxy HTTP 403, so live Pages deployment could not be verified. Dedicated screenshots include both `storefront-product-*` and `storefront-checkout-*`.
