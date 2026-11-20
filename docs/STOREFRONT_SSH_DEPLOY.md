# Storefront deployment through GitHub Actions

The manual `Deploy Optiman storefront` workflow uses the existing server clone at `/home/optiman1/optiman-deploy/repo`. It updates only the root storefront files, `/assets`, and `/vto` listed in `scripts/deploy_storefront.py`. It preserves the backend, private files, server configuration, and the existing preview directory. A backup of replaced storefront files is stored under `/home/optiman1/optiman-deploy/backups/<commit>/` before publishing. New public files receive mode 0644 and their parent folders mode 0755.

## One-time owner setup

1. In GitHub repository **Settings → Environments**, create `production` and add the Owner as a required reviewer. Keep self-review disabled if another authorized reviewer is available. The workflow runs only when manually started from `feat/phase-03-ui-prototype`.
2. Generate a dedicated SSH deployment key on the Owner's trusted computer. Add only its public key to `/home/optiman1/.ssh/authorized_keys` with access limited to this cPanel account. Store its private key as the GitHub **environment secret** `OPTIMAN_DEPLOY_KEY`. Keep the Owner's existing Windows key and passphrase private.
3. Obtain the server's SSH host key fingerprint from the host's trusted cPanel/hosting support channel. Verify a captured `ssh-keyscan -p 1157 mail.srv1.whitednsservice.com` entry against that fingerprint. Store the verified known-hosts line as the environment secret `OPTIMAN_SSH_KNOWN_HOSTS`. Never disable host-key checking.
4. Confirm Python 3 is available in the server SSH shell and the server clone is on the feature branch. The workflow requires Git, Python 3, and a reachable HTTPS connection to `optiman.bd`. If local HTTPS checks fail because of hosting firewall rules, diagnose the network path before the first deployment. Keep the production environment approval pending until these prerequisites are confirmed.
5. Confirm `public_html/.htaccess` already disables directory listing. The deployment script leaves that file untouched. Add `Options -Indexes` through the host's trusted configuration process if needed and supported.

## First authorized deployment

1. Review the current feature branch commit and site backup policy. Open **GitHub → Actions → Deploy Optiman storefront → Run workflow**. Select `feat/phase-03-ui-prototype`, operation `deploy`, and paste the full current commit SHA.
2. Approve the pending `production` environment request in GitHub. The workflow checks the selected SHA against the current feature branch tip, connects using verified host identity, fast-forwards the server clone, rebuilds the package, stages approved files, backs up originals, publishes storefront files, and checks the homepage and public product API.
3. Check the Actions run result and `https://optiman.bd/` on desktop and mobile. Confirm `https://optiman.bd/optiman-backend/admin/` still works. The deployment script logs the commit and backup path in Actions output. No private credentials appear in that output.

## Rollback and troubleshooting

The workflow's `rollback` operation accepts the SHA used for the deployment to restore. It reads that commit's backup manifest and restores replaced files. It removes only files created by that deployment and leaves other paths alone. Choose the same feature branch and approve the production environment request. A failed deploy triggers this rollback automatically. A backup remains outside `public_html` for manual inspection.

For a local dry run on a copy of the site, use `python3 scripts/deploy_storefront.py deploy --commit <full HEAD SHA> --public <copy/public_html> --workspace <copy/optiman-deploy> --health-url '' --dry-run`. The dry run validates the archive and destination paths without writing to the copy. The script refuses symlinks, unexpected archive members, path traversal, wrong branches and mismatched commits. A permissions error or health-check failure is recorded in Actions and should be diagnosed before retrying. Browser-side shopping remains a simulation until order APIs are implemented.
