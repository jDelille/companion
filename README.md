# Dojang Roster Companion

The current meeting decisions, setup, limits, verification and deployment handoff are in [ROSTER-COMPANION-INTEGRATION.md](../docs/ROSTER-COMPANION-INTEGRATION.md).

This directory combines Justin's frontend at `jDelille/companion@324976ccd089c03bc8a4bce8472e0ba794381385` with the verified Odoo gateway, staff roster, member reads, internal follow-up approval and encrypted kiosk recovery.

## Local checks

```sh
npm ci
npm run test:odoo-integration
npm run lint
npm run build
```

For the complete disposable Odoo/Postgres/browser rehearsal, run `tools/run_rehearsal.sh` from the repository root after following the runtime setup in the handoff. For an interactive local demo use `tools/start_demo.sh`.

## Connected test setup

Use the environment variable names in `../delivery/frontend/.env.integration.example`. Configure the real values locally or through the deployment's secret manager. Connected mode requires `DOJANG_INTEGRATION_MODE=odoo-test` and `NEXT_PUBLIC_DEMO_MODE=false`. Pair separate kiosk and staff browser profiles at `/integration/pair`.

Use `companion` as the frontend root when deploying this repository. Supply a reachable Odoo HTTPS origin; a deployed app cannot connect to Odoo on a developer's localhost. The intended Firebase/GKE hosting and current separate Vercel site have not been reconciled or redeployed by this handoff.

## Current action boundary

The connected workspace reads real Odoo attendance and saves internal reviewed follow-ups. It does not yet send messages, make calls, book makeups or provide full individual IAM. The public kiosk concierge is demo-only and refuses simulated actions in connected mode. The attendance tab labels its latest-check-in-only backend limit.
