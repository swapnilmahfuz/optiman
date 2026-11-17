# Phase 03.5D / 03.6 / 03.7 — operational frontend demo

This supersedes earlier preview descriptions of read-only admin, disabled POS, memory-only inventory and staged prescription navigation. All products, prices, suppliers, transactions and stock are fictional. No backend, authentication, database, live payments or production deployment was added.

## Run and persistence

From the repository root run `py -m http.server 4173 --directory preview` on Windows (or `python3` on Linux), then open `http://127.0.0.1:4173/`. An already-installed PHP can serve the same files with `php -S 127.0.0.1:4173 -t preview`. Windows/PHP itself was not exercised here. A static server is recommended over file URLs for reliable storage behavior.

Operational data persists in this browser origin's localStorage (`optiman.operations.v1`). Refresh preserves synthetic stock, sales, receipts, transfers, orders and settings. Another browser/device/origin has independent data. Settings → Reset Demo Data restores the entire fictional fixture, in either demo role; this is an explicit global test control, not a production permission. Cart, prescription powers, file names and customer form fields remain memory-only. File contents are never read/uploaded. Never enter real medical/customer information.

## Completed increments

| Increment | Delivered |
| --- | --- |
| A | Immediate conditional prescription fields and live lens eligibility; no wizard |
| B | Shared persistent stock engine, reservations, ledger and guarded commands |
| C | Staff shell, catalog, multi-line receiving, unique SKU handling, Code128 labels |
| D | Branch POS, scan/search, ephemeral lens configuration, tender simulation, receipt and frame-only holds |
| E | Scoped inventory, reasoned adjustments, dispatch/partial receipt/cancel transfers |
| F | Derived dashboards, analytics, charts, price bands and CSV reports |
| G | Storefront availability/checkout integration, orders, prescription reviews, returns and shared lens settings |

Exactly **Owner** and **Branch Manager** have the same 13 module links. Owner selects all/one location; Branch Manager is fixed to Khulna. Engine commands and scoped reads enforce these demonstration boundaries; browser code is inspectable and this is not secure authentication. Cross-device transactions require the future server. Web Locks serialize supported same-origin browser commands; unsupported browsers do not provide production concurrency guarantees.

## Client review checklist

1. Open `#staff/dashboard`, select Owner, and inspect all 13 modules. Switch to Branch Manager: the same modules remain, scope is Khulna. Try changing location: no broader scope is offered. Return to Owner.
2. Reset. Atlas starts Khulna 3, Chattogram 2, Warehouse 5: total available **10**. In POS at Khulna scan `OPT-FR-001-BRN-52`, sell one with simulated tender: aggregate **9**. Receipt/reprint and ledger show one mutation.
3. Stock Receiving: select Khulna, supplier/invoice, Atlas quantity 4, explicit unit cost/retail price; review and confirm. Aggregate becomes **13**. Inspect receipt and print four labels. Add several lines or create a unique synthetic SKU; duplicate SKU/invoice and invalid quantities are rejected atomically.
4. Storefront: add two frame-only Atlas, checkout with fictional fields and successful simulation. Aggregate available becomes **11**, with two reserved at one eligible location. No warehouse-first priority and no silent split. Failure makes no reservation; paid-but-unallocated example enters an exception queue.
5. Product: Frame Only bypasses Rx. With Power / Lens immediately reveals Zero/Unifocal/Bifocal. Test signs, Axis 0–180, optional CYL/IPD, Moon Shape and positive ADD; malformed combinations block. Choose an eligible explicit pair price. Consultation/unavailable never enter ordinary checkout. File picker displays/replaces/removes synthetic filenames only. Cart Edit preloads powers, Save updates just that configuration, Cancel discards changes; differing configurations stay separate.
6. POS: configure lenses using the same product form, change quantity, complete simulated sale, inspect history/receipt. Offline simulation blocks completion. Hold/resume supports frame-only tickets; powered tickets stay in memory and cannot be persisted as holds.
7. Transfers: create, dispatch, partially receive and cancel remaining quantity. Transit is distinct from destination available stock. Branch Manager can dispatch only its source and receive only its destination. Inventory shows movements, reservations, quarantine and reasoned adjustments.
8. Orders & Returns: allocate exceptions, inspect prescription review, request revision/revised quote, simulate customer acceptance from tracking, then dispatch. Dispatch is gated by review/acceptance. Cancel/refund exceptional payment explicitly. Return an actual synthetic sale line, acknowledge inspection, choose sellable restock or quarantine and refund; repeated return cannot exceed sold quantity.
9. Lens Pricing: edit/create clearly synthetic rules and costs. FIXED_PRICE needs an explicit price; CONSULT_WHATSAPP has no automatic price; UNAVAILABLE stays blocked. Product controls read the same matrix.
10. Analytics/Reports: change date/category/SKU/price/scope; inspect daily/weekly/monthly sales, category/price-band/branch/lens groupings and best/low/zero/insufficient-history products. Export scoped CSV. Refresh to confirm operational persistence; Reset restores fixtures.

## Calculation boundaries

Revenue and unit metrics derive from completed sales and recorded returns, not reservations or payment exceptions. Sale records snapshot frame/lens prices and costs; missing costs make full gross profit unavailable, with known-cost contribution shown separately. Unallocated order payment refunds remain payment exception records, not sale returns. AOV uses net recognized revenue and qualifying sales. Lens groupings show lens-only revenue. Business dates use Asia/Dhaka. Price bands are configurable and start at zero. Stock age uses introduction/last positive movement; it is not FIFO batch aging. Unit turnover is an explicitly approximate stock ratio, not audited accounting. Slow/zero ranking uses a 30-day history threshold; new products are insufficient-history. Delivery, tax and discounts remain unconfigured.

## Verification and evidence

No dependencies were installed. JavaScript syntax and `git diff --check` are required. Run `node checks/demo-engine.cjs` without a server. With the server running, run `checks/ui.cjs`, `premium.cjs`, `shopping.cjs`, `configurator.cjs`, `configurator-edges.cjs` and `operations-browser.cjs` via Node, setting `PREVIEW_URL` as needed. Browser checks use the environment's existing Playwright installation.

Engine tests passed shared stock sequence 10→9→13→11, retries, atomicity, last-unit contention, role scope, partial transfer/cancel, returns, cost snapshots, review/quote gates, reconciliation, privacy and Code128 pattern/checksum checks. Browser suites cover 360, 390, 768, 1024 and 1440px, including overflow and JavaScript errors. JSON results and screenshots are in `evidence/`; latest prescription images use `immediate-prescription-*`, staff images `operations-*`. Final package validation uses `/optiman/` with exactly 22 allowlisted public files; README/docs/repository files are excluded.

Code128-B is generated locally with start/checksum/stop and quiet zones; printing uses browser dialogs with configurable labels and an 80mm receipt layout. Physical scanners, thermal printers, auto-cut, clinical eligibility, Windows hardware and PHP/MySQL/cPanel are **not verified**. No real payments, orders, stock or uploads occur. Backend authorization, database transactions, audit/retention, tax/currency, clinical matrices and production policies remain future work.

## Pages, update and rollback

Expected URL: https://swapnilmahfuz.github.io/optiman/ ; staff entry: `#staff/dashboard`. Pushes to `feat/phase-03-ui-prototype` trigger `.github/workflows/frontend-pages.yml`; it packages only approved preview code and local WebP assets, then deploys Pages. No main merge is required. Check the Actions run and Pages environment before calling an update live. This environment's GitHub API/Pages HTTP requests return proxy 403, so live deployment cannot be independently confirmed here. If necessary, use Actions → Publish frontend demo to GitHub Pages → Run workflow on this branch; Pages source must be GitHub Actions.

Rollback the A–G phase commits on this feature branch and push; reset browser fixture data after a schema rollback. Do not merge or proceed to backend before manual approval.
