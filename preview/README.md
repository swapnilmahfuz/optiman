# Latest targeted storefront update

See [finish names, Bangla guidance, payment rules, audience setup and review checklist](../docs/12_Targeted_Storefront_Update.md). This supersedes older notes that delivery/advance were unconfigured.

# Latest prescription correction

See [current lens behavior, WhatsApp setup and review checklist](../docs/11_Lens_Selection_Correction.md). Progressive is a separate fourth type; customer suggestions contain only compatible purchasable lenses.

# Current demo: Phase 03.5D / 03.6 / 03.7

See [the operational demo runbook](../docs/10_Operations_Demo.md) for current run instructions, 13 staff modules, persistence, review checklist and limitations. The historical phase notes below describe earlier revisions; the runbook supersedes their disabled POS, read-only admin and wizard behavior.

# Optiman Phase 03 — visual prototype

Plain HTML, CSS and JavaScript. No application dependencies or build step. All product names, SKU data, prices, quantities, branch information and admin metrics are synthetic. BDT is an illustrative presentation choice, not finalized currency policy.

## Run on Windows

1. Check out branch `feat/phase-03-ui-prototype`.
2. Open `preview/index.html` in a current Chrome or Edge browser. No installation is required.
3. If PHP is already installed, from the repository root run `php -S 127.0.0.1:4173 -t preview`, then open http://127.0.0.1:4173/.
4. Alternatively, if Python is already installed: `py -m http.server 4173 --directory preview`.
5. Stop a local server with Ctrl+C. Refresh to reset all mock basket and form state.

Do not install a PHP framework or database for this preview. PHP is not available in the review environment, so the optional PHP run command was not exercised. Windows itself and cPanel compatibility have not been tested.

## Review routes

Append these fragments to the preview URL (also supported when opening the file directly):

| Route | Screen / interactions |
| --- | --- |
| `#home` | Category navigation, editorial hero, featured products, collections |
| `#shop` | Search, category and price filters, sort, reset, empty results |
| `#product/atlas` | Single accurate photograph, color selection, measurements, frame/lens tabs |
| `#product/muse` | Alternate product details |
| Product → With lenses | Lens category and option selection, explicit rule outcomes |
| `#cart` | In-memory demo bag; quantities and removal; frame/lens breakdown |
| `#checkout` | Fictional fields, COD/online labels, pending/failure/allocation exception dialogs |
| `#pos` | Branch selector, example SKU input, demo basket, offline warning, receipt layout dialog |
| `#admin` | Synthetic operational overview and review queues |
| `#matrix` | Read-only example lens matrix and rule inspection dialogs |

For lens demonstrations: Single vision → clear option is fixed-price; Custom and Progressive / bifocal require consultation; Single vision → Ultra-thin is unavailable. Consultation and unavailable configurations cannot be added to the demo bag. Frame-only omits prescription steps.

Add a frame before reviewing cart/checkout. POS recognizes `OPT-ATLAS`, `OPT-MUSE`, `OPT-NOIR`, `OPT-FORMA` or the exact product name. Barcode support is a text-input demonstration, not a scanner hardware test.

## Mock boundaries

- All state lives in browser memory and resets on refresh. Nothing is an authoritative stock balance or order record.
- Checkout displays illustrative outcomes only; no successful order, reservation or real payment is claimed.
- All POS finalization is disabled because no server exists. Branch selection does not enforce access or connect stock. Offline simulation only demonstrates UI blocking.
- Receipt is a dialog layout; no print bridge, physical printer or automatic cutter is tested.
- Admin data is read-only. No login, roles, backend API, persistence, database migrations or inventory ledger exist.
- Phase 03.5C supersedes the prescription placeholder with synthetic demo inputs and a filename-only photo interface. Never enter actual medical information. No file content is read or uploaded, and no measurements are transmitted or persisted.
- WhatsApp opens an internal message preview with synthetic product context. No number is configured and nothing is sent. Prescription measurements and filenames are excluded.
- AR is an optional placeholder, disabled by default; no camera or tracking engine is accessed.
- Demo checkout fields are not submitted or persisted. Use fictional information only.
- Shipping, tax, discounts, customer identity, return exceptions and operational policies remain open; no final payable total is implied.

## Assets and design

Uses the five locked palette colors, local system fonts, and the five user-supplied AI-generated demonstration photographs, stored locally as WebP. They do not represent the client's actual inventory. No external image dependencies or competitor assets are included.

| Product / placement | Local asset stem | Source ZIP file |
| --- | --- | --- |
| Homepage hero | `campaign-eyewear-duo` | Warm Eyewear Duo in Sunlight.png |
| Atlas | `atlas-tortoiseshell-sunglasses` | Tortoiseshell Wayfarer Sunglasses-4.png |
| Noir | `noir-black-sunglasses` | Glossy Black Wayfarer Sunglasses-2.png |
| Muse | `muse-amber-optical` | Translucent Amber Tortoiseshell Eyeglasses-3.png |
| Forma | `forma-brown-optical` | Tortoiseshell Browline Glasses on Cream-1.png |

Hero variants are 768/1200/1774px wide; product variants are 320/640/1000px square. Pillow encoded WebP at quality 86 without cropping or changing the photographic content. Responsive `srcset`/`sizes` and explicit dimensions prevent unnecessary downloads and layout shifts. Hero is eager/high priority; secondary images are lazy-loaded. Product galleries are eager.

One shared image mapping covers cards, listings, galleries, bag and POS. Each gallery shows the single supplied photograph without invented alternate views. Existing names, SKUs, prices, categories, filters and color choices are preserved. Their synthetic metadata (including Forma's category/material/color and Noir's polarized category) is not verified by the photos; this is stated on product pages. Other color selections reuse the same demo photograph.

Phase 03.2 supersedes the split hero. The campaign now fills a 650px desktop hero, with cream HTML copy over a brown gradient at lower left. Mobile uses a 560px hero with a dedicated right-side focal crop and lower-left overlay. The supplied 2:1 photograph cannot keep both faces at mobile portrait proportions: the sunglasses model is prioritized, with her eyewear intact and above the copy. Desktop and tablet retain both sets of glasses. No new image or fictional campaign claim is introduced.

The frontend is structured for later extraction into PHP templates: shell in `index.html`, components and synthetic data in `app.js`, responsive styles in `styles.css`. This makes no claim of verified PHP/MySQL or live hosting compatibility.

## Checks and evidence

- Syntax: `node --check preview/app.js`.
- Browser regression: start the static server on port 4173, then `node checks/ui.cjs` from the repository root, using an already installed Playwright and Chromium. Set `CHROMIUM_PATH` when necessary. This optional review tool is not an application dependency.
- Current regression covers 360, 390, 768, 1024 and 1440px: eight routes plus expanded lens selection = 45 layout checks, plus the behavioral cases listed in `evidence/results.json`.
- Screenshots are under `evidence/`; they show synthetic prepopulated review state.
- Automated checks cover Chromium only. Physical touch, screen readers, Windows, PHP, MySQL, payments, scanner, printer and AR have not been verified. Accessibility attributes and keyboard focus styles are included but no accessibility certification is claimed.

## Task scope / rollback

1. Responsive shell and catalog: expected original navigation and browse screens; verify route widths and search/sort. Roll back by reverting the frontend commit.
2. Product, lens, cart and checkout preview: expected explicit rule branches and safe in-memory interactions; verify blocked combinations and simulation messages. Same rollback; refresh clears state.
3. POS/admin and evidence: expected disabled real finalization, read-only rules and viewport evidence; verify offline block and route layouts. Same rollback.

Backend implementation must wait for separate authorization after UI review. Do not merge automatically or deploy.


## Image integration review — 2026-11-17
Expected behavior: local AI photographs replace SVG illustrations on all surfaces, without changing shopping rules. Verify image decoding, mapping, full hero framing, gallery containment, four responsive widths and existing interactions. Rollback: revert the image-integration commit; no migrations or persistent data are involved. Backend, deployment and merge remain unauthorized.

Earlier image-integration result: 36 layout checks passed at 360/390/768/1440px, including image decoding, square product image proportions and uncropped 2:1 hero framing. Existing interaction regression and all four gallery mappings passed with no JavaScript errors. Desktop/mobile screenshots were visually reviewed. This remains Chromium-based review, not physical-device or Windows verification.

Product-card refinement: homepage and listing holders follow the actual rendered photograph height, with no fixed height or forced aspect ratio. Images retain natural proportions. Responsive checks explicitly verify holder height matches image height.

## Phase 03.2 review
- Full-width campaign, image-safe mobile focal point, brighter CTA, larger wordmark and search, six photographic category routes, natural product holders, stronger frame-price/variant/lens hierarchy. No business behavior or architecture change.
- Category photographs are illustrative: they do not prove polarization, day-night behavior, material, stock or discounts. Sale remains an honest empty demo collection.
- `node checks/premium.cjs` checks all six category routes at five widths, header search, image/overlay geometry, keyboard focus and consultation dialog behavior, touch targets, and initial layout shifts. Eyewear bounds are manually traced from the supplied photo and checked against the CSS crop and copy region. This supplements screenshot review; it is not a substitute for physical-device or screen-reader testing.
- Required screenshots: `evidence/home-premium-1440.png`, `evidence/home-premium-390.png`, `evidence/product-premium-1440.png`, `evidence/product-premium-390.png`. Additional widths use the same naming convention.
- Preview: open `preview/index.html`, or run `py -m http.server 4173 --directory preview` on Windows and visit `http://127.0.0.1:4173/`. No installation or build is required.
- Rollback: revert the Phase 03.2 commit. Backend, merge, deployment and Phase 04 remain unauthorized.

Actual Phase 03.2 results: `node --check preview/app.js` and `git diff --check` passed. `node checks/ui.cjs` passed 45 viewport/route layout checks and existing shopping regression. `node checks/premium.cjs` passed all six category routes at all five widths, header search, hero keyboard focus/touch size, keyboard consultation/Escape, eyewear crop/overlay bounds and image loading checks. Initial CLS measured 0 at each viewport after adding initial route space reservation. The cream copy/brown gradient and focal crop were also reviewed in screenshots; no formal contrast or accessibility certification is claimed. See `evidence/results.json` and `evidence/premium-results.json`.

## Phase 03.3 — clean category navigation
The homepage category section now uses text links only, in the approved order. Six columns at 1024px+, three at tablet widths, and two on mobile. Links use fine separators, visible keyboard focus and targets at least 52px high. Removed repeated category images and their section-specific disclosure; the campaign/footer AI disclosures remain. Tightened the transition to featured products. The approved hero, top navigation, catalog and business flows are unchanged.

Expected behavior and checks: all six routes and Sale's empty state remain intact; verify ordering, absence of images, grid columns, label clipping, touch targets, keyboard focus/Enter and all existing regression cases at five widths. Rollback: revert the Phase 03.3 commit. Screenshots: `evidence/home-categories-1440.png` and `evidence/home-categories-390.png` (additional widths included). No merge or deployment; await visual review.

Phase 03.3 actual results: 45 existing layout checks and shopping regressions passed. Category checks passed at all five widths: correct 6/3/2 column counts, exact label order, zero category images, all 30 route/keyboard-activation cases, visible focus, minimum touch sizes, no text clipping or page overflow, and unchanged Sale empty state. No JavaScript errors; measured initial CLS was zero. Desktop/mobile homepage screenshots were visually reviewed.

## Phase 03.4 — premium category pills
The homepage category section now uses compact rounded links, ordered All Eyewear, Sunglasses, Optical Frames, Day-Night, Polarized, Sale. The eyebrow is “EXPLORE THE COLLECTION”. Cream/sand inactive pills and brown/cream active styling replace separators, arrows and the redundant link. Desktop fits one row; mobile wraps naturally with no horizontal scrolling. Touch targets are at least 44px.

`categoryPills()` derives its active state from `location.hash`, with All Eyewear the allowed homepage default. There is no click-based selection state. The pills appear only on the homepage; their destination pages retain the existing category filter. The renderer also resolves active states for those routes, checked by the browser suite against the actual location. No pills are added to other screens.

Validation: five viewport sizes, all six routes, active rendering, empty Sale, keyboard focus/Enter, touch sizes, wrapping, clipping and overflow via `node checks/premium.cjs`, plus existing `node checks/ui.cjs`. Screenshots: `evidence/home-pills-1440.png` and `evidence/home-pills-390.png` (all five widths included). Rollback: revert the Phase 03.4 commit. No dependencies or backend changes; do not merge or deploy.

Phase 03.4 actual results: all five viewport checks passed, including exact label order, no category imagery/icons/arrows, homepage active default, route-derived selection for each destination, 44px+ targets, visible keyboard focus, Sale's empty state and no overflow/clipping. Desktop is one row; mobile wraps. Existing 45 layout checks and shopping regressions also passed with no JavaScript errors. Desktop/mobile screenshots were visually reviewed. Physical-device testing remains pending.

## Phase 03.5 — product and shopping UX
Product pages retain one accurate AI demo photograph, original metadata and prices. Frame Only is the default; Frame + Prescription Lenses reveals the existing explicit rules. A live frame/lens/subtotal breakdown avoids numeric fallback for consultation or unavailable options. Those combinations remain blocked by both UI and existing add-to-bag guard. Only eligible fixed-price choices show the future prescription submission explanation; no upload or medical fields exist.

The purchase button stays in the document flow on mobile so it cannot obscure controls. Added items receive inline live-region feedback and a View demo bag link, without an overlay toast. Cart quantities/removal retain their behavior and now restore keyboard focus after re-rendering. Cart and checkout have scoped thumbnail, typography, summary and form-section refinements; all non-final charges and simulated payment outcomes remain explicit. POS/admin presentation is unchanged.

Verification: `node checks/ui.cjs`, `node checks/premium.cjs`, and `node checks/shopping.cjs` with the local server on port 4173. The shopping suite covers all five viewport widths, frame default, three fixed lens calculations, consultation blocking (including command guard), unavailable blocking, frame reset, keyboard quantity changes, removal/empty bag, all three checkout outcomes, navigation, image decoding, clipping, overflow and purchase-action placement. Screenshots: `evidence/product-shopping-{width}.png`, `evidence/product-lenses-shopping-{width}.png`, `evidence/cart-shopping-{width}.png`, `evidence/checkout-shopping-{width}.png`. Results: `evidence/shopping-results.json`.

Run locally as before: open `preview/index.html`, or `py -m http.server 4173 --directory preview` on Windows, then browse to `http://127.0.0.1:4173/#product/atlas`. Refresh resets all synthetic bag state. Physical Windows/device testing remains pending. No backend, real orders/payments, document collection, inventory mutation or production compatibility is implemented or verified. Rollback by reverting this phase's commit. Await visual approval before Phase 04; do not merge or deploy.

Phase 03.5 actual results: JavaScript syntax and whitespace checks passed. Existing UI suite passed 45 layout checks and its interaction regressions; premium/category suite passed across all five widths. The shopping suite passed all listed flows at all five widths, with no JavaScript errors, overflow, clipped controls or purchase-action overlap. Desktop product, mobile lens configuration, cart and checkout screenshots were visually reviewed. Homepage/pill markup, catalog/rules and POS/admin renderers were verified unchanged against the preceding commit.


## Phase 03.5C — full synthetic prescription configurator
Use **With Power / Lens**, then choose Zero Power, Unifocal / Distance Power, or Bifocal / Near Power. Zero Power proceeds directly to lenses. Powered types show separate eye/sign controls, optional IPD and a filename-only demo photo picker. Bifocal requires shape and positive ADD. Continue validates before lenses. All prices/ranges/eligibility are synthetic fixtures documented in [09_Synthetic_Lens_Demo_Rules.md](../docs/09_Synthetic_Lens_Demo_Rules.md). The four reference screenshots were not available in this chat; no claim of matching their exact layout is made.

Choose an eligible explicit pair to add; consultation and unavailable rules never enter the ordinary cart. Change power details to clear the lens selection. The quantity input updates total immediately. Cart lines preserve separate configurations and provide **Edit Prescription & Lenses**; Save replaces just that line, Cancel discards the draft. Checkout displays all configuration details and frame/lens sums as simulation only.

Safe demonstration: enter invented values (e.g. SPH +1.25 / −2.00, CYL −0.50, Axis 180, IPD 63.5). For bifocal, Moon Shape, SPH +2 / −1 and ADD +1.50 demonstrate a fixed-price synthetic pair. Use only synthetic image files for file selection. Only the name is retained; contents are never read, displayed or uploaded. Browser memory only; refresh clears all configuration/cart state. No actual medical information should be entered.

New source: `configurator.js` loads before `app.js` and owns draft/validation/eligibility/cart-edit commands. Pages packaging explicitly includes it. No dependencies or backend added. Existing synthetic rule IDs 0–5 retain their price/consultation/unavailable semantics; new ID 6 is a clearly labeled synthetic bifocal example. Production policy remains OPEN.

Checks: existing UI/premium/shopping suites now navigate the staged flow; `node checks/configurator.cjs` exercises all types, signs, bounds, eligibility, filenames, quantities, independent cart lines, Save/Cancel and checkout at five widths, with file reads/persistent storage/non-GET requests checked. Use `PREVIEW_URL` to test a staged `/optiman/` package. Evidence uses `configurator-{screen}-{width}.png` and `configurator-results.json`. Revert this phase's commit to roll back. Stop for manual approval; no merge or backend.

Actual Phase 03.5C results: existing UI (45 layouts), premium/category and shopping regression suites passed with staged-flow navigation updates. The full configurator suite passed at 360/390/768/1024/1440px against the isolated `/optiman/` Pages artifact, including all listed prescription/cart/checkout cases and no JavaScript errors or overflow. Boundary suite passed. Tests detected zero file-read attempts, no local/session storage and no non-GET requests. Pages package contains 19 source-identical public files; docs/README are excluded. New screenshots use synthetic review fixtures and were visually inspected. No physical-device, clinical or live Pages verification is claimed.
