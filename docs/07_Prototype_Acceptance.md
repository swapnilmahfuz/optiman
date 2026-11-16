# 07 — Local Client Prototype Acceptance Checklist

## Customer UI
[ ] Mobile layout tested at 360px, 390px, 768px and desktop.
[ ] Original dark-brown/cream palette, responsive header, search, collection navigation, product cards.
[ ] Product page has frame-only/with-lenses selection and clear pricing.
[ ] FIXED_PRICE rules show owner-defined price; CONSULT_WHATSAPP shows contact flow; UNAVAILABLE blocks purchase.
[ ] Frame-only bypasses prescription fields; powered lenses can upload prescription.
[ ] Cart/checkout show itemized frame, lens and delivery totals.

## Inventory and POS
[ ] Seed at least 2 branches and central warehouse with distinct stock.
[ ] Branch A POS sale updates Branch A stock and storefront next stock check.
[ ] Last-unit race: only one stock-consuming transaction succeeds.
[ ] Warehouse-first order allocation and branch fallback both demonstrated.
[ ] Offline POS cannot finalize; timeout retry is idempotent.
[ ] Transfer and sellable/damaged return create correct ledger movements.

## Prescription and payments
[ ] Private upload inaccessible by direct public URL.
[ ] Staff reviewer approval required before lens production.
[ ] COD order allocates; online payment is explicitly simulated in demo.
[ ] No cart stock reservation; payment-success/stock-gone exception handled.

## AR
[ ] Optional 2D eyewear overlay or safe placeholder, visibly labeled prototype.
[ ] No AR dependency for checkout; no 3D model generator in scope.

## Delivery proof
[ ] Local setup README and demo data supplied.
[ ] No claim of production readiness, live payment, printer auto-cut or live AR test without proof.
[ ] Screenshot and regression test evidence recorded before client handover.
