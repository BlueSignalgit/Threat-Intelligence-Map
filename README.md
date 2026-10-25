# Offensive Defenders Threat Intelligence Center

A responsive, dark-themed React + TypeScript dashboard with Leaflet, Tailwind CSS, real Feodo Tracker C2 indicators, and the CISA Known Exploited Vulnerabilities catalog. No synthetic intelligence is published. Test fixtures use reserved addresses and remain outside public assets.

## Develop

Requires Node.js 22+ and Python 3.12+. Python collectors use only the standard library (no pip dependencies).

```sh
npm ci --cache /workspace/.npm-cache
python3 scripts/collect.py --geolocate
npm run dev
```

The committed `public/data/intelligence.json` is an actual collected snapshot. Development and production builds work offline with that snapshot; detailed map tiles require Internet access, while bundled Natural Earth country boundaries remain available offline. Refresh snapshot reloads published JSON, not upstream feeds. Search supports CVE, vendor, product, descriptions, IP, port, country, and malware. CVE rows expand to show required action and remediation due dates. Only indicators with resolved coordinates appear on the map. IP geolocation is approximate and is not evidence of attacker origin.

```sh
npm test
python3 -m unittest discover -s tests -v
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

For a GitHub project site, build with `VITE_BASE_PATH=/Threat-Intelligence-Map/ npm run build`. Adjust the base path if the repository is renamed. The root path is the default for development and custom-domain deployment.

## Data collection

`python3 scripts/collect.py` collects Feodo's recommended JSON list and CISA's JSON catalog, falling back to CISA's official `cisagov/kev-data` GitHub mirror. Optional `--geolocate` resolves public indicator IPs via HTTPS to ipwho.is, caching successful coordinates in `public/data/geolocation.json`, at most 100 new lookups per execution with one-second spacing. Browser IP addresses are never submitted by the collector. Geolocation failure does not discard indicators. No threat endpoint is contacted; collection only downloads intelligence from providers.

Each source records its URL, count, last success, and error state. Failed downloads retain previous good records; successful empty Feodo responses clear old indicators. Collection returns nonzero if either required feed fails, while writing source status atomically. The dashboard flags failed feeds and snapshots older than 48 hours. A recent download does not mean every upstream indicator was recently observed; inspect last-online dates and upstream status before acting.

The scheduled GitHub Action runs at minute 17 every six hours, also supports manual dispatch, and commits refreshed snapshots with the workflow token. It reports failed collection even after retaining and publishing previous records. GitHub may delay schedules and disable schedules on inactive public repositories. Enable Actions and allow workflow read/write repository permissions. No secret is required for Feodo or CISA.

## Deploy

In repository **Settings → Pages**, select **GitHub Actions** as the build source. The Pages workflow tests, builds, uploads the site, and deploys on main-branch pushes or manual dispatch. A `workflow_run` trigger deploys updated intelligence after the scheduled collection workflow: commits made with `GITHUB_TOKEN` do not trigger normal push workflows. Pages must be available for this repository/account. Deployment requires `pages: write`, `id-token: write`, and any configured github-pages environment approvals. CI runs Python tests and frontend tests/builds on pull requests and main pushes.

## Sources and integration policy

See [source verification and terms](docs/SOURCES.md). URLhaus and ThreatFox remain disabled: documentation access is verified, but no authenticated API request or permission for this application's public redistribution has been established. Their records are not fetched or bundled. Never place API keys in Vite variables, browser code, public JSON, or logs.

## Project structure

- `src/`: dashboard, typed snapshot contract, filtering and freshness checks, frontend tests.
- `scripts/collect.py`: real feed collectors, schema normalization, last-good retention, optional geolocation.
- `tests/`: isolated collector tests with network mocks.
- `public/data/`: real data and geolocation snapshots, including collection provenance.
- `.github/workflows/`: validation, scheduled collection, and Pages deployment.

Data remains subject to its upstream terms; this repository does not relicense provider data. No software license has been selected by the repository owner.
