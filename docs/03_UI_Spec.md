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
