# 01 — Product Requirements Document | OPTIMAN V4.0
Status: LOCKED business baseline with OPEN decisions explicitly marked.

## Vision
One eyewear retailer with **2–5 physical branches** and **one shared responsive e-commerce website**. A centralized SKU catalog, branch/warehouse inventory, POS, prescription-lens ordering and optional paid AR. Merchant-aware data structures allow later SaaS commercialization, but multi-merchant rollout is not a V1 delivery promise.

## LOCKED — customer storefront
- GOXO-like category navigation, original premium UI; no copying GOXO assets/layout verbatim.
- Modern minimal mobile-first UX; dark brown/cream palette; large product photography, accessible rounded controls, clean tabs, quick filters, sticky mobile purchase action.
- Categories proposed as navigation labels: Sunglasses, Optical Frames, Day-Night, Polarized, Sale, Shop All. Owner may configure collection names.
- Frame-only and frame-with-lens purchasing, variants/SKUs, product dimensions, search, cart, checkout and order status.
- Guest checkout is PROPOSED; final customer identity requirements OPEN.

## LOCKED — prescription/lens rule engine
- Owner/admin creates or configures lens categories, coatings, prices and combinations; price must be based on an explicit category + option rule.
- Supported lens families: single vision, blue-cut/anti-reflective, photochromic, progressive/bifocal, and custom.
- Rules per combination: FIXED_PRICE, CONSULT_WHATSAPP, UNAVAILABLE. No implicit price fallback.
- If custom or owner-configured consultation-only option: show 'Contact our WhatsApp for details' with prefilled frame SKU/color/category and link; do not claim an automatic quotation.
- Unavailable means unavailable, unless owner explicitly enables consultation.
- Prescription upload and optional manual eye-power entry; authorized central or branch staff verify before production. No AI prescription interpretation.
- Changes to lens price after review require customer approval.
- Store prescription uploads privately with restricted access; obtain user consent before sending sensitive prescription measurements to WhatsApp.

## LOCKED — POS / stock
- Online-only browser POS at 2–5 branches; USB barcode scanner and 80 mm auto-cut thermal printer as target hardware, printer/cutter compatibility OPEN until physical test.
- One catalog; branch-specific stock, central warehouse, movements, transfers, returns, exactly Owner and Branch Manager roles, daily reports.
- Online Option B: any eligible branch or warehouse may fulfill; no warehouse-first preference. Website availability reflects only eligible fulfillable stock.
- Stock source of truth is MySQL transaction, not browser cache. POS sale decrements its branch; online order allocates and reserves at eligible location.
- No pre-payment cart reservation (0-minute selection). Confirmed COD order reserves after acceptance; online gateway confirmation followed by atomic allocation; paid-but-unavailable handled by reconciliation/refund, never oversell.
- Online-only POS: cannot finalize a sale without confirmed server response; timeout must query transaction status before retry.
- Seven-day conditional returns for eligible frames; prescription/custom returns reviewed separately. Detailed policy OPEN.

## LOCKED — payment/fulfillment
- COD + online payment gateway in scope. Provider, fees and payment split are OPEN; EterNeeds-style advance-payment split is NOT locked.
- Manual courier assignment/tracking in V1.
- Single-location fulfillment preferred; multi-location split policy OPEN; no silent split and unexpected charges.

## LOCKED — AR scope
- Optional paid add-on, disabled by default. V1 prototype may use calibrated 2D product-photo overlays; GLB 3D asset import and 3D generation deferred. Browser-based camera and tracking only when activated and consented.
- AR does not change stock and cannot block product purchase.

## LOCKED — deployment direction
- First build/test on local Windows PC; then new separate Optiman domain + cPanel shared hosting, PHP 8.2+ and MySQL. No hosting purchase required for client demo.
- Target <100 total daily orders/bills initially. Hosting limits, cron, backups, secure document root and extensions must be checked before production.

## Out of scope for first demo
- Production payment gateway transactions, real courier APIs, 3D scanner or AI 3D generator, multi-merchant billing, offline POS, automated prescription reading, advanced BI.

## OPEN decisions
- Final domain, logo, product photos/SKUs, WhatsApp number, payment provider, tax/discount policy, exact lens price matrix and supported powers, reservation expiry after order confirmation, prescription retention, return exceptions, printer model, gateway webhook contract, backup/restore plan, performance targets.

## Approved amendment — Phase 03.5D / 03.6 / 03.7 (2026-11-17)
Latest owner master prompt supersedes conflicting prototype assumptions. Exactly two roles share all operational modules; Branch Manager is assigned Khulna in the demo, Owner can scope all/one location. Shared persistent browser-local synthetic catalog, receipts, inventory ledger, transfers, sales, online allocations and returns power every screen. This is not secure authentication or cross-device synchronization. Prescription inputs remain ephemeral; no medical values or file metadata are persisted in operational records. Online fulfillment can use any eligible location, preferring a complete single-location allocation. No forced prescription wizard. No extra approval hierarchy. Barcodes identify master variants. Receiving costs are recorded; sale cost snapshots and returns drive reports; missing lens costs mean profit unavailable. Production backend remains unauthorized.

## Owner-approved targeted storefront payment amendment — 2026-11-17
Online demo delivery defaults to BDT 150, configurable, once per order. Required advance = delivery + total lens charges; frame-only advance is delivery. Remaining COD is the frame balance. Advance verification gates confirmation and dispatch; existing reservation mechanics remain. Merchant-supplied Bangla shipping/return text is a draft requiring legal review, subject to statutory rights; conflicting expectation/defect clauses are not silently resolved and operational return logic is unchanged. Five lens finish labels and Men/Women/Kids audience filters do not alter prescription types, power validation, explicit prices or SKU identities. See `12_Targeted_Storefront_Update.md`.
