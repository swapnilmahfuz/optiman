# 04 — Technical Requirements | OPTIMAN V4.0

## Deployment constraints (LOCKED preference)
Local Windows prototype first; future dedicated Optiman cPanel shared hosting; PHP >=8.2, MySQL/MariaDB InnoDB; new domain. No mandatory VPS, Redis, Docker, always-on Node server or external AI GPU.

## Framework recommendation (PROPOSED, not locked)
Single PHP monolith with server-rendered pages and lightweight JS. Laravel 12 can run on PHP 8.2 when its extensions and deployment conditions are met; Laravel 13 requires PHP >=8.3. Choose supported version after target hosting compatibility check. Keep application outside public document root and expose only public assets/index. Build frontend assets locally.

## Single database / modules
Storefront, POS, admin share one backend and one transactional MySQL database. Central inventory service enforces location-specific stock. MySQL InnoDB transactions with locking/conditional updates, immutable ledger, idempotency records and unique constraints. No browser-only inventory mutations.

## Online payment race policy
No stock held in cart or during payment initiation. Gateway verification must be server-side and idempotent. Allocation after verified payment can fail if last unit sold; record paid-unallocated exception and initiate refund/alternate offer. COD order acceptance allocates atomically. Never mark payment successful from browser redirect alone.

## Prescription privacy
Private non-web-readable storage; server-side file type/size validation, controlled access, audit and deletion/retention policy. Do not put full prescription values in WhatsApp prefilled message by default. HTTPS and CSRF protection.

## POS peripherals
USB scanner typically keyboard wedge; test target scanner. 80mm thermal auto-cut printer requires real hardware validation: browser print dialog may not reliably command cut; optional local print bridge only if required and explicitly approved.

## AR module
Separate client-side 2D overlay with face landmarks for initial prototype. Asset per variant, calibration, camera permission. Model type abstraction permits future GLB; 3D generator NOT in webapp.

## Reliability and hosting gates
Verify PHP extensions, InnoDB, document root, cron if needed, resource limits, HTTPS, backups/restore, upload limits and gateway callbacks. Low daily volume does not eliminate simultaneous checkout race testing. Scheduled reconciliation can use cron if available, otherwise an explicitly designed admin-triggered process for demo only.

## Acceptance
Tests for last-unit concurrency, repeated webhook, stock transfer, returns, unauthorized branch, POS timeout, payment allocation conflict, prescription privacy, responsive UX and AR-off flow.

## Master prompt amendment — 2026-11-17
Static JS demo engine uses one versioned localStorage operational document, immutable movement records, command idempotency keys, clone/validate/commit semantics and Web Locks when available to serialize same-origin commands. No persistence of Rx values, filenames, file content, customer names or addresses. Browser persistence is not secure, cannot sync devices, and is not a production transaction server. Production constraints remain PHP 8.2+/MySQL/cPanel. Any eligible location replaces warehouse-first. Code128-B implementation includes checksum/stop/quiet zones; hardware untested.
