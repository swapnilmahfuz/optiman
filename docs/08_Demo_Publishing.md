# Public frontend demo — GitHub Pages

Scope: explicit authorization in chat to publish the existing frontend demo from `feat/phase-03-ui-prototype`. No merge, production-domain deployment or backend authorization. This guide supplements the locked requirements.

Expected URL: https://swapnilmahfuz.github.io/optiman/

## Workflow

`.github/workflows/frontend-pages.yml` runs on pushes to `feat/phase-03-ui-prototype`, or manual dispatch on that branch. It does not deploy other branches. `scripts/package_preview.py` stages exactly `preview/index.html`, `preview/styles.css`, `preview/app.js`, `preview/configurator.js`, and local `preview/assets/*.webp`. It rejects symlinked/outside-source files. `preview/README.md`, docs, evidence, scripts, workflow files, `.git`, credentials and unrelated files are not uploaded. Only that isolated staging directory becomes the Pages artifact.

No application files, designs, rules or integrations are changed. Relative assets and hash navigation work beneath `/optiman/`. Existing labels disclose synthetic prices, simulated checkout and unavailable real operations. The configurator accepts synthetic demo measurements in browser memory and retains only a demo filename; no file content or medical data is uploaded or persisted. Form fields are client-only demonstration fields; use fictional information.

## One-time GitHub settings

1. Open the repository → **Settings → Pages**. Under **Build and deployment**, choose **GitHub Actions** as the source. If Pages is unavailable for the repository's visibility/plan, stop; do not change visibility automatically.
2. Under **Settings → Actions → General**, ensure Actions and the official `actions/checkout`, `configure-pages`, `upload-pages-artifact`, and `deploy-pages` actions are allowed.
3. If the **github-pages** environment has deployment-branch restrictions, allow `feat/phase-03-ui-prototype`. Retain any required reviewers and approve that environment deployment when requested.
4. Open **Actions → Publish frontend demo to GitHub Pages**. The workflow push starts a run. If it failed before Pages was enabled, choose **Re-run all jobs** after changing the settings. There is no need to merge into main.
5. If **Run workflow** is available, select `feat/phase-03-ui-prototype`. GitHub may not display manual dispatch for a workflow that exists only on a non-default branch. In that case, use the existing push-triggered run and re-run it; future pushes to the feature branch also trigger deployment.
6. Wait for both package and deploy jobs to succeed. Open the URL in the deployment environment and verify the demo in a private browser window.

## Updating the demo

Commit approved frontend changes to `feat/phase-03-ui-prototype` and push. Each push to that branch triggers deployment. Review the Actions run and deployment URL before claiming the public site updated. No main-branch merge or production-domain configuration is required.

If future approved frontend assets need a new file type, explicitly update the packaging allowlist. Do not replace the isolated artifact path with repository root or upload `preview/` indiscriminately.

To withdraw the demo, unpublish the Pages site in Settings → Pages and disable the workflow. To revert a visual update, revert the frontend commit on the feature branch and push, then verify the new successful deployment.

## Local package and subpath verification

Run `python scripts/package_preview.py /tmp/optiman` into a new directory, then serve `/tmp` locally on port 4174. On Windows use any new staging parent folder with an `optiman` child and serve that parent.

The existing browser suites accept a base URL:

```sh
PREVIEW_URL=http://127.0.0.1:4174/optiman/ node checks/ui.cjs
PREVIEW_URL=http://127.0.0.1:4174/optiman/ node checks/premium.cjs
PREVIEW_URL=http://127.0.0.1:4174/optiman/ node checks/shopping.cjs
```

No installation is needed for the website. These optional local verification tools use the review environment's already installed Playwright and Chromium. The GitHub workflow itself uses syntax checking and static packaging without installing application dependencies.

## Current deployment limitation

This environment's network proxy returns HTTP 403 for GitHub API and Pages-host checks. A successful git push does not establish a successful Actions run or public deployment. Check the Actions status manually using the steps above. Live deployment and repository visibility are unverified from this environment.

Actual local result: all three suites passed against the staged `/optiman/` site, including 45 route/layout checks and shopping/category regressions at five widths. At that deployment-setup stage, all 18 staged files match their original frontend bytes. README and docs requests return 404. Workflow YAML parsed successfully and branch/artifact path assertions passed. Evidence: `evidence/pages-validation.json`. No live deployment success is claimed.
