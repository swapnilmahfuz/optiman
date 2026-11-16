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
- One catalog; branch-specific stock, central warehouse, movements, transfers, returns, cashier roles, daily reports.
- Warehouse first for online allocation, eligible branches fallback. Website availability reflects only eligible fulfillable stock.
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
