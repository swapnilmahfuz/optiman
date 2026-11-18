# Optiman one-upload cPanel handoff

Use `optiman-cpanel-one-upload-7734d07.zip` from this feature branch. This handoff contains the Phase 1 backend with a narrow entry-point path adjustment for the fixed cPanel layout. It does not install itself.

**Extract once in `/home/optiman1/` using cPanel File Manager.** The archive has exactly two top-level directories:

- `optiman-private/`: PHP source, migration, offline Owner helper, guide and placeholder configuration. It stays outside the web root.
- `public_html/optiman-backend/`: API entry point, admin UI and protected image-upload directory. The archive contains no `cgi-bin`, `php.ini`, or root `public_html/index.php` entry, so those existing files are untouched.

Before extraction, back up the database and any existing `/home/optiman1/optiman-private/` or `/home/optiman1/public_html/optiman-backend/` tree. File Manager may overwrite files with the same names. Inspect the ZIP path list to confirm the two roots. Extract only at `/home/optiman1/`, not inside `public_html/`. Confirm that the extracted private folder cannot be fetched by URL and that the public upload folder rejects PHP execution.

The imported migration in `optiman1_optiman` need not be imported again. In File Manager, copy or rename the **single** private `optiman-private/config.example.php` to `optiman-private/config.php`. Set its database name to `optiman1_optiman` and user to `optiman1_optimanusr`; enter the password privately in cPanel. Keep `app_secret` unique, random, at least 32 characters. Verify `localhost:3306`. Set `upload_path` to `/home/optiman1/public_html/optiman-backend/uploads/products`. Keep `session_secure=true` for HTTPS. Do not commit or share `config.php`.

Generate the first Owner SQL **offline** using `optiman-private/tools/bootstrap-owner.php` on a trusted local PHP 8.2 computer, then import the generated one-time SQL in phpMyAdmin. The helper never contacts the server and does not contain a default password. The Owner password is visible while typed; use a private terminal and delete the generated SQL after import. The helper inserts only if the `users` table is empty. If an Owner already exists, do not run it; sign in with that account. The detailed guide is `optiman-private/README.md`.

Open `https://optiman.bd/optiman-backend/admin/` for Owner login. The API is at `https://optiman.bd/optiman-backend/index.php?path=/api/v1/products`. Verify HTTPS, login/logout, one synthetic product upload and the three WebP sizes. Remove the synthetic record through approved admin processes or use a fresh test environment. No live sales, payments, stock mutations or production readiness are claimed. The GitHub Pages demo is separate.

Rollback: restore the paired private/public file backup and the corresponding database/upload backup. Do not run destructive SQL to roll back. No server deployment occurs from this archive or repository commit.
