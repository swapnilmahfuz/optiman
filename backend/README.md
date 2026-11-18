# Optiman backend Phase 1: cPanel installation and recovery

This package is for a separately approved deployment. It does not deploy itself or replace the GitHub Pages demo. You need a cPanel account with HTTPS and PHP 8.2, MariaDB, PDO MySQL, GD/WebP, fileinfo, mbstring and OpenSSL. Verify those capabilities on the actual host; supplied specifications have not been independently tested here. Never upload credentials, database backups or this guide's private application folders into a public web directory.

## 1. Prepare and back up

1. Before changing an existing site, make a complete private backup of its files, database and uploads; record how to restore it. Agree a maintenance window and document root with the host. Do not use an existing live database for an initial test.
2. In cPanel File Manager, upload and extract `optiman-backend.zip` into a private folder under your account home, **outside** `public_html`. Keep `src/`, `migrations/`, `tools/`, configuration, logs and backups private. Only `public/` contents belong under the web document root.
3. Preferred: set the site's document root to the extracted `optiman-backend/public` folder in cPanel Domains, if your host permits it. Do not point a domain at the package root. If the domain must use `public_html`, follow the fallback section below and verify every path before continuing.
4. The application needs a writable upload folder at the configured location. Restrict it to images; check its `.htaccess` and host policy prevent PHP or other executable content from running. A server that ignores these rules requires equivalent host-level protection before deployment. Never grant world-writable permissions.

### If the document root must remain `public_html`

Keep the entire private application under `~/optiman-private/`: it must contain `src/`, `config.php`, `migrations/`, `tools/` and the guide. Copy **only the contents** of the package `public/` folder into `~/public_html/`; do not overwrite an unrelated site. The entry point prioritizes `~/optiman-private` when present. Set `upload_path` in the private config to the full filesystem path of `~/public_html/uploads/products`, replacing `~` with the account's actual home path shown in File Manager. Create the directory, set safe permissions and confirm the upload execution protection copied with the public files. This fallback does not require a public installer or source code inside `public_html`.

## 2. Create the database

1. In cPanel **MySQL Databases**, create a new database and a dedicated database user with a strong unique password. cPanel often adds an account prefix: record the full database and username.
2. Add the user to that database with the privileges required to create/import tables. For normal running use a separate least-privilege user limited to the application's required SELECT/INSERT/UPDATE/DELETE operations; do not use a server administrator account. Verify exact grants with your host.
3. Open **phpMyAdmin**, select the new, empty database, choose Import and import `migrations/001_foundation.sql` from your local package. Confirm success and check `schema_migrations` contains the migration. Do not import into an unrelated or existing production database.
4. MariaDB DDL can commit partway through an import. If interrupted, stop, inspect each table and constraint and compare against the SQL before retrying; `CREATE TABLE IF NOT EXISTS` does not repair a partially created incompatible table. Restore the backup or use a clean database when necessary. Do not silently drop or overwrite existing data.

## 3. Private configuration

1. Copy `config.example.php` to `config.php` inside the **private application root**, never in `public_html`. Set the full database name, restricted runtime username/password, host and port. The stated `localhost:3306` must be verified with the host. Replace all placeholders.
2. Generate a unique random secret of at least 32 characters using a password manager. Set `app_secret`. Keep it private and unchanged across ordinary restarts; changing it may invalidate security state. Keep `session_secure` true on HTTPS. The example uses a 30-minute idle expiry, a 1,800,000-byte application upload limit, five images and an 8-megapixel decoded-pixel ceiling; keep these within host limits.
3. Set `upload_path` to the absolute path of the protected writable public image directory. When editing PHP string values, escape single quotes and backslashes correctly; a password manager can generate a strong alphanumeric value to avoid syntax mistakes. Do not email the config or commit it to Git.
4. Confirm config, migrations, backups and `src` cannot be downloaded by URL. Test this with an HTTP request; the result must not disclose their contents. Confirm server errors are logged privately and displayed as generic messages.

## 4. First Owner: no web installer

On a trusted local computer with PHP 8.2 and mbstring, run the included helper from the extracted package. It is CLI-only and does not connect to the server:

```text
php tools/bootstrap-owner.php /path/to/private/new-owner-bootstrap.sql
```

On Windows use a private path such as `C:\Users\YourName\Documents\new-owner-bootstrap.sql`. Choose a path that does not already exist. Enter the name, email and a unique 12–72-byte password twice. **The password is visible while typed**: work privately and do not record the screen. The generated SQL contains a password hash, not the plaintext password; treat the file as confidential. Import it once through phpMyAdmin into the new migrated database and confirm exactly one row was inserted. It deliberately inserts only when the users table is empty; it cannot create additional Owners on an initialized installation. Delete the SQL file immediately after importing, including any uploaded copies, and keep the password in a password manager. No default credentials or permanent installer are provided.

## 5. First smoke test

1. Open `https://YOUR-DOMAIN/admin/` over HTTPS, sign in using the first Owner and sign out. Test an incorrect password, idle expiration and CSRF/authorization using a separate test account. Only an Owner may change the global catalog and authorized accounts; a manager's data must be restricted to their assigned branch.
2. Create a test product with a unique SKU and an explicit status, category and audience. Upload a JPEG/PNG/WebP under 1,800,000 bytes; reject a larger or invalid file. Verify three generated square WebP images at 320, 640 and 1000 pixels, correct orientation/aspect, warm padding, primary selection, reordering and deletion. Product photos do not become transparent try-on overlays. Consistent padding cannot ensure identical subject scale; future manual crop/position tools may be needed.
3. Open `https://YOUR-DOMAIN/index.php/api/v1/products` to test the public catalog list, then `https://YOUR-DOMAIN/index.php/api/v1/products/ID` for an active product, and confirm inactive products and private account data are absent. Test authorization with a manager assigned to another branch. Do not create real sales, payments or reservations during this phase.
4. Confirm all URLs, cookies, image access and error responses from a real device on HTTPS, and inspect host logs. The explicit `/index.php/api/v1/` endpoint does not need Apache rewrite. If PHP PATH_INFO is unavailable, the public API also supports `index.php?path=/api/v1/products`. The admin interface uses the query-path fallback and does not require PATH_INFO or Apache rewrite. This repository does not prove the target host or a live deployment was tested.

## Branch setup for assignments

The migration intentionally creates no fictional branches. Before assigning a Branch Manager, use phpMyAdmin's **Insert** view to add a real row to `branches` (name, unique code, address and `is_active=1`), then add an `inventory_locations` row with the same branch ID, a unique code, `type=branch` and `is_active=1`. A central warehouse is a separate location with `type=warehouse` and an empty branch ID. Use the real business details supplied by the owner. Location creation and stock adjustments are not exposed by this phase's interface. The Owner can then select the branch in user management; a Branch Manager cannot access another branch or the warehouse.

## 6. Backup and rollback

Back up the database using phpMyAdmin Export and privately copy uploaded images, private config and application files together. Verify the backup restores on an isolated test database. Protect and retain credentials separately. Before an upgrade, repeat the backup. To roll back application code, restore the prior files/config and compatible database/uploads from the same snapshot; do not blindly run destructive SQL or overwrite newer data. Diagnose interrupted migrations before retrying. If an image/database operation is interrupted, reconcile private backups, rows and stored image files before cleanup.

## Limits

This phase supplies catalog and inventory foundations only; it does not provide live sale deductions, reservations, orders, real payments, real prescription storage or a production-ready end-to-end storefront. The existing public static demo retains synthetic data. Test physical devices, configured hosting limits, uploaded-image safety, access controls and restoration on the target server before using real data.

## Local development

Install PHP 8.2 with pdo_mysql, GD/WebP, fileinfo and mbstring and a compatible local MariaDB server. Create a fresh database, import the migration and bootstrap the first owner exactly as above. Copy `config.example.php` to `config.php` in the backend directory, supply local database credentials and a random `app_secret`, and set `session_secure` to `false` **only for HTTP localhost**. From the repository root run:

```text
php -S 127.0.0.1:8080 -t backend/public
```

Open `http://127.0.0.1:8080/admin/` and `http://127.0.0.1:8080/index.php/api/v1/products`. Re-enable secure cookies for HTTPS. Do not expose the development server to the internet.

The CLI bootstrap helper was tested with PHP 8.2 and an isolated MariaDB 11.4.13 database: initial import created one Owner, a second import created none, and the stored hash verified the test password. The temporary database was removed without changing existing test data.

## Automated tests

Run `backend/tests/auth-integration.php` and `backend/tests/catalog-integration.php` with PHP 8.2 against a **disposable** MariaDB database after importing migration 001; configure `TEST_DB_DSN`, `TEST_DB_USER` and `TEST_DB_PASS`. These tests create synthetic records. `backend/tests/image_http.py` tests a running isolated HTTP instance and a dedicated empty synthetic product; its header lists required environment variables. Never point these tests at production. Test fixtures and test-only dependencies are excluded from the deployment ZIP.

Tests exercised PHP 8.2, MariaDB 11.4, GD/WebP, authentication/CSRF, rate limits, account and branch scope, catalog CRUD, upload validation/output/ordering/deletion and the existing VTO/POS demo. Admin responsive interaction checks used mocked API responses; the API and upload flows were separately tested against MariaDB over HTTP. Live cPanel, HTTPS cookie behavior, camera hardware and production load remain unverified. Login throttling is per direct IP; shared networks and reverse proxies need host-specific protection and trusted-proxy configuration before production use. Configure PHP error logging to a private location and confirm server restrictions on uploads.
