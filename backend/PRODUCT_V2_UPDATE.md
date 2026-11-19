# Product Management V2 • cPanel update

Use this package on the existing Optiman Phase 1 installation. The update uses the current database, Owner credentials, private configuration and login sessions.

1. Choose a quiet maintenance window. Ask staff to finish catalog edits. Back up the database, `/home/optiman1/optiman-private/` and `/home/optiman1/public_html/optiman-backend/` including uploads. Keep the backups outside the public website.
2. In **cPanel → File Manager**, open **/home/optiman1/**. Upload **optiman-product-v2-update.zip** there. Select **Extract**, set the destination to **/home/optiman1/** and allow the listed Optiman files to be replaced. The archive contains only the V2 catalog code, migrations, admin assets and this private guide. The existing config, installer lock, upload directory, website root, authentication and sessions stay in place.
3. Open **https://optiman.bd/optiman-backend/admin/**, refresh the page and sign in as the existing **Owner**. Select **Apply Product Management V2** once. Keep the tab open until the product list appears. The updater uses the existing database grants, including ALTER, INDEX, INSERT and UPDATE. A delayed response can be retried from the same page. The version marker is written after all steps succeed.
4. Verify **Categories** contains Eyeglasses, Sunglasses and Blue-Light Glasses (plus your existing categories). Edit an existing product to inspect its default color, price, photos and location balances. To test a new item privately, save it as **Draft**, add a second color with a different SKU and price, upload a photo, record a stock adjustment, and check **Stock movement history**. Use **Active · publish** when ready. Public product details are available at `https://optiman.bd/optiman-backend/index.php?path=/api/v1/products/ID`, replacing ID with the product ID.
5. For a site with no locations, expand **Inventory locations** and add a branch or warehouse first. A branch location uses its branch code. Enter a signed quantity and reason to change stock. Positive quantities receive units, negative quantities remove available units.
6. **Optional destructive action** — only to discard demo data, expand **Reset demo catalog**, type **RESET DEMO CATALOG**, and confirm the browser prompt. This deletes all products, variants, managed product photos, balances and movement history. The reset retains users, sessions, category definitions, branches, locations and audit records. Migration never runs the reset.

### Migration and recovery

The Owner workflow applies `002_variant_foundation` if needed, followed by `003_variant_catalog`. Existing single-color products receive one default variant. Existing image rows, reservations and movements keep their IDs and are associated with that variant. A matching legacy SKU is used when available. A collision receives a unique generated variant SKU. Pre-existing foundation variants are retained. A published parent with an inactive foundation default moves to Draft for Owner review. Active products require an active default variant. To deactivate the default color, first choose another active default or move the product to Draft.

MySQL/MariaDB schema changes commit in steps. Catalog traffic is gated until migration completes. If interrupted, sign back in and apply the update again. For permissions errors ask the hosting administrator to check the database grants and PHP error log privately. Restoring the pre-update database, backend files and uploads together during the maintenance window rolls back the update. Preserve unrelated website files.

### API integration

Use the existing `index.php?path=/api/v1/…` routes. Owner mutations require the authenticated session and its current `X-CSRF-Token`. Public products include active `variants`, `default_variant_id` and sellable `available` units. Existing parent price, color, image gallery and Try-On fields represent the default. Draft/inactive parents stay private. The static storefront/POS/VTO demos continue to use their own demo data.

| Action | Method and path (after /api/v1) |
| --- | --- |
| Browse / read | GET /products or /products/{id} |
| List / save parent | GET or POST /admin/products, GET or PUT /admin/products/{id} |
| Create / edit color | POST /admin/products/{id}/variants, PUT /admin/products/{id}/variants/{variant} |
| Category management | GET or POST /admin/categories, PUT /admin/categories/{id} |
| Upload / manage gallery | GET or POST /admin/products/{id}/variants/{variant}/images. PUT /order with image_ids, PUT /{image}/primary, POST /{image}/replace (multipart image), DELETE /{image} |
| Branch / warehouse location | GET or POST /admin/locations |
| Balances | GET /admin/inventory with optional variant_id and location_id query fields |
| Stock adjustment | POST /admin/variants/{variant}/adjustments with location_id, signed quantity, reason and a UUID request_id. Retry with the same payload and UUID |
| Movement history | GET /admin/variants/{variant}/movements with optional before cursor |
| Versioned update | Owner GET or POST /admin/catalog-update |
| Optional demo reset | Owner POST /admin/demo-reset with exact confirmation phrase |

On parent creation supply sku, name, status, category_ids, audience_ids, optional description/frame_style/material, and default_variant. A variant accepts sku, color_name, optional color_hex, price, status, optional relative tryon_asset and is_default. Save subsequent colors individually. Deactivation preserves stock and history. Existing product gallery routes target the default variant. Each color uses the existing image-count limit (five by default) and 1.8 MB maximum per upload. Replacing a photo preserves its ordering and primary status. New renditions are verified and saved before the previous files are removed.
