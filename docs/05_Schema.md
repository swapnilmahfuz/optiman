# 05 — Conceptual Schema | OPTIMAN V4.0
NOT executable SQL. Implementation needs reviewed migrations and indexes.

## Organization
merchants, users, memberships, roles, branches, warehouses, stock_locations, registers, shifts.

## Products
products, variants(SKU,color,dimensions), categories, product_media, price_lists, product_prices.

## Lens rules
prescription_categories, lens_types, lens_options, lens_price_rules(merchant_id,category_id,option_id,price_nullable,rule_type FIXED_PRICE|CONSULT_WHATSAPP|UNAVAILABLE,enabled,power_constraints), lens_compatibility, merchant_whatsapp_settings.
- Enforce uniqueness for active rule per category/option/context; no implicit fallback. Price snapshot stored on order item.

## Inventory
stock_balances(merchant,location,variant,sellable_on_hand,reserved,version), stock_movements(immutable,actor,reason,reference,idempotency_key), reservations(order_item,location,qty,state), transfers, transfer_lines, stocktakes.
- No negative availability; all changes through transaction service.

## Sales / fulfillment
customers, addresses, carts, orders, order_items, order_allocations, payments, payment_attempts, gateway_webhook_receipts, refunds, shipments, courier_tracking, pos_sales, pos_sale_items, receipts, register_closings.
- Payment and order states separate; paid-unallocated exception supported; COD acceptance reserves stock.

## Prescription
prescription_uploads(private_path,retention_status), prescription_entries, prescription_reviews(reviewer,decision), quotation_requests, customer_change_approvals. Restrict access to authorized roles.

## AR
merchant_feature_entitlements, ar_assets(variant_id,type=IMAGE_2D|GLB_3D,path,calibration,approval_state). GLB model generation outside system.

## Security
activity_audit, idempotency_keys, merchant_scope, branch_access, notification_events.

## Master prompt amendment — 2026-11-17
Demo entities: locations, exactly two role modes, products/master SKUs, suppliers, on-hand/reserved/quarantine balances, immutable movements, multi-line receipts, transfers with cumulative receipt, sales with frame/lens revenue and cost snapshots, returns, online orders/reservations, redacted prescription review states, lens rules. Ephemeral Rx/cart configuration never enters persisted operational state. Owner/manager scope checks apply to commands and filtered read views. Stock availability = on-hand − reserved; in-transit is separate.
