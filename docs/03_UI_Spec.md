# 03 — UI Specification | OPTIMAN V4.0

## Visual identity (LOCKED)
- Dark Brown #2B1D17, Mocha #4A3328, Warm Cream #F7F1E7, Sand #E6D7C4, Caramel #B58B64.
- Spacious modern editorial eyewear storefront, cream surfaces, restrained dark-brown navigation/CTAs, large high-quality product images.
- Responsive: mobile-first 360px+, tablet and desktop. Touch targets ~44px, accessible focus and contrast, no hover-only actions.
- Avoid clutter, intrusive popups, giant prescription forms, excessive animation or repeated CTAs.

## Navigation (LOCKED concept)
Desktop: compact logo, search, category nav, account/cart. Mobile: compact header, search/cart always accessible, simple menu or category drawer. Category structure GOXO-inspired, visually original.

## Required customer screens
1. Homepage: hero, category tiles, featured collections, minimal trust/footer.
2. Collection: responsive product grid, quick filters, sort, variant previews, stock state.
3. Product: large gallery, frame size/material, price, color/SKU, 'Frame only' vs 'With lenses' tab, optional AR button.
4. Lens step: only show necessary fields; category then available lens option then price. Consultation branch is obvious and frictionless.
5. Cart: editable items, clear line-item frame/lens prices.
6. Checkout: minimal contact/delivery/payment fields; full totals; no cart stock guarantee; clear payment pending states.
7. Order tracking/prescription status; returns request.

## Lens selector UX
- Progressive disclosure: choose frame-only / with lenses; choose category; choose lens; optionally prescription upload/manual values; price breakdown.
- Use modern segmented tabs, cards and selects, not dense tables on mobile.
- FIXED_PRICE -> continue. CONSULT_WHATSAPP -> explanatory message + configured WhatsApp action. UNAVAILABLE -> explanatory disabled option.
- Owner-admin price matrix is separate from customer-facing form.

## POS UX
Desktop-first efficient cashier workflow, branch/register always visible, keyboard barcode input, large finalize action, status confirmation, 80mm print preview, clear offline banner.

## Admin UX
Products/variants, categories, lens rules and price matrix, WhatsApp config, branches, stock/transfer, orders, prescription review, reports, AR assets and entitlement. Require confirmation for destructive or price-changing actions.

## Accessibility / performance
Responsive image sizes, lazy loading, semantic form labels, keyboard navigation, empty/error/loading states, no AR camera prompt until user clicks Try On. Optimize for moderate shared hosting.

## Phase 03 review implementation — 2026-11-17
Architecture direction and the proposed UI baseline were approved in chat. User authorization is limited to a frontend visual prototype. The implementation in `preview/` uses the locked palette and original responsive layouts, synthetic catalog data and in-memory interactions. It does not satisfy backend, privacy-storage, stock or production acceptance criteria. Review routes, mock boundaries and evidence are documented in `preview/README.md`. Locked requirements above remain unchanged.

## Phase 03 image review — 2026-11-17
User-supplied AI-generated demonstration photographs replace illustrations. Hero headline: “See Better. Look Sharper.” Supporting text: “Eyewear for your everyday life — style, comfort and clear vision.” Primary action: “Explore Collection”. Desktop splits cream copy from the full two-model campaign image; mobile/tablet stack them. Text stays outside the image. Product photography is contained and shared across all views, with no invented alternate gallery angles. Existing synthetic catalog and business rules remain unchanged. Asset mapping and review details: `preview/README.md`.

## Phase 03.2 — premium storefront refinement / 2026-11-17
Explicit user instruction supersedes the previous split-hero design: full-width lifestyle image with cream headline/CTA overlay and subtle brown gradient. Mobile uses a dedicated focal crop prioritizing visible eyewear. Discovery uses six photographic category tiles; featured holders follow natural image dimensions. Refine header, type scale, product hierarchy and controls while preserving all rules, routes, prices and mock-only boundaries. No new product claims or backend work.

## Phase 03.3 — clean category navigation / 2026-11-17
Homepage discovery supersedes photographic tiles with six ordered text links and subtle separators: six columns from 1024px, three at tablet widths, two on mobile. Minimum 44px touch targets, visible keyboard focus and compact transition to featured frames. Remove the category-only image disclosure; preserve hero, top navigation, product data and business flows.

## Phase 03.4 — premium category pills / 2026-11-17
Homepage discovery now uses “EXPLORE THE COLLECTION” / “Find your frame.” and compact rounded links, in order: All Eyewear, Sunglasses, Optical Frames, Day-Night, Polarized, Sale. Cream/sand inactive pills; brown/cream active pill derived from the current route, with All Eyewear the allowed homepage default. Wrap on mobile; no arrows, images or redundant exploration link. Existing top navigation, hero, featured products and shopping rules are preserved.
