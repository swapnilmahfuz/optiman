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
- Prescription dialog explains future steps. There is deliberately no medical file upload or measurement collection. Never enter sensitive data.
- WhatsApp opens an internal message preview with synthetic product context. No number is configured and nothing is sent. No prescription measurements are included.
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

The hero uses the full 2:1 composition at every reviewed width, retaining both models' faces and glasses. All copy and actions are HTML outside the image. Mobile and tablet stack the panels; desktop uses a cream text panel and large photograph.

The frontend is structured for later extraction into PHP templates: shell in `index.html`, components and synthetic data in `app.js`, responsive styles in `styles.css`. This makes no claim of verified PHP/MySQL or live hosting compatibility.

## Checks and evidence

- Syntax: `node --check preview/app.js`.
- Browser regression: start the static server on port 4173, then `node checks/ui.cjs` from the repository root, using an already installed Playwright and Chromium. Set `CHROMIUM_PATH` when necessary. This optional review tool is not an application dependency.
- Checked 360, 390, 768 and 1440px: eight routes plus expanded lens selection = 36 layout checks, plus the behavioral cases listed in `evidence/results.json`.
- Screenshots are under `evidence/`; they show synthetic prepopulated review state.
- Automated checks cover Chromium only. Physical touch, screen readers, Windows, PHP, MySQL, payments, scanner, printer and AR have not been verified. Accessibility attributes and keyboard focus styles are included but no accessibility certification is claimed.

## Task scope / rollback

1. Responsive shell and catalog: expected original navigation and browse screens; verify route widths and search/sort. Roll back by reverting the frontend commit.
2. Product, lens, cart and checkout preview: expected explicit rule branches and safe in-memory interactions; verify blocked combinations and simulation messages. Same rollback; refresh clears state.
3. POS/admin and evidence: expected disabled real finalization, read-only rules and viewport evidence; verify offline block and route layouts. Same rollback.

Backend implementation must wait for separate authorization after UI review. Do not merge automatically or deploy.


## Image integration review — 2026-11-17
Expected behavior: local AI photographs replace SVG illustrations on all surfaces, without changing shopping rules. Verify image decoding, mapping, full hero framing, gallery containment, four responsive widths and existing interactions. Rollback: revert the image-integration commit; no migrations or persistent data are involved. Backend, deployment and merge remain unauthorized.

Latest result: 36 layout checks passed at 360/390/768/1440px, including image decoding, square product image proportions and uncropped 2:1 hero framing. Existing interaction regression and all four gallery mappings passed with no JavaScript errors. Desktop/mobile screenshots were visually reviewed. This remains Chromium-based review, not physical-device or Windows verification.
