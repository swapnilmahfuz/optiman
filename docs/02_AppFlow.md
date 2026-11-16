# 02 — Application Flows | OPTIMAN V4.0

## Customer purchase
Home -> category/search -> product -> choose color/SKU -> frame-only OR with lenses -> choose prescription category -> apply explicit pricing rule.
- FIXED_PRICE: show frame + lens subtotal; enter prescription or upload securely where required -> cart -> delivery -> COD or online gateway -> server stock check -> allocation/reservation -> order confirmation.
- CONSULT_WHATSAPP: show contact message and WhatsApp button with product/SKU/option; do not silently create a paid order; optionally save inquiry after consent.
- UNAVAILABLE: disable checkout for that combination and show explanation.
- Frame-only: bypass prescription form.

## Prescription review
Customer upload -> private file -> assigned authorized central/branch reviewer -> approve, ask clarification, reject, or quote revised price -> customer accepts changes -> authorize lens fabrication -> QA -> dispatch. No fabrication before approval.

## Payment and inventory
Cart does NOT reserve stock. COD confirmation: validate/allocate/reserve in one DB transaction. Online gateway: create payment attempt, verify signed callback, then allocate stock; if payment succeeds but stock is gone, create exception/refund workflow. Idempotent callbacks and order commands.

## Warehouse-first online fulfillment
Eligible central warehouse available? -> allocate there. Otherwise eligible branch by priority -> allocate. No eligible single location? -> staff review/unavailable; never silently split shipment.

## Branch POS
Authorized login -> assigned branch/register -> scan/search SKU -> server price/stock -> payment selection -> atomic sale commit -> receipt -> website next authoritative availability check updated. Offline or timeout: no fake success; check transaction status on reconnect.

## Transfers / returns
Request -> approve -> dispatch origin -> in-transit -> receive destination; shortages audited. Return -> verify order/policy -> inspect -> refund/exchange -> sellable restock or quarantine.

## AR
AR enabled + compatible 2D asset? -> camera permission -> tracked 2D overlay -> optional capture -> back to product. Camera denied/unsupported? -> ordinary product gallery and checkout remain available. 3D models deferred.
