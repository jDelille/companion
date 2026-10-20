# Project guide

You run in Companion (v1), the old app. Roster (v2) is the target at `C:\Users\justi\Desktop\dojang\roster`.

- Never edit Companion. Only edit files under the Roster path.
- Port one page at a time: find the v1 code, then implement it in Roster following the Roster conventions below. Don't copy v1 code that calls Odoo directly; re-implement it through the Hub.
- If the archive spec and the v1 code disagree, say so and ask.

## Roster conventions

Rules for everything written in Roster. Based on handoffs dated 2026-10-15 to 2026-10-17; verify against the repo before acting.

- Product: Dojang Operations OS for martial-arts schools (staff portal/CRM Companion, kiosk/member experiences, AI Companion). Current focus: Roster CRM Companion frontend/integration.
- Odoo 20 is the system of record. Jodi's `dojo_*` addons hold domain logic; `dojo_companion_hub` is the guarded action gateway. WhatsMax is the communications hub. Roster owns the staff UI and AI experience.
- Hub calls use the staff member's own Odoo session via `lib/odoo-hub.ts` / `runHub`. Never bypass the Hub with direct ORM access from Roster.
- `/api/v2` routes are named for business actions. Use the domain context/capability layer and the standard write envelope/error shape from the archive.
- Hub writes must follow the idempotency, permission/capability, confirmation, and audit rules in the source docs.
- Unresolved decisions (workflow engine, message ownership, others): don't decide unilaterally. Ask the user to confirm with the project lead.
- Stack per the handoff: Next.js 15, React 19, Tailwind 3, next-auth 4, Prisma 6, next-intl (English/Arabic), Zod. Check Roster's `package.json` for what's actually installed.
- If two archive sources conflict, prefer the newer explicit decision, verify against the code, and ask.

## Kiosk work

For anything touching the kiosk (`app/(kiosk)/`, `src/components/kiosk/`, `src/domain/kiosk/`, `src/integrations/kiosk.ts`, `src/contracts/kiosk-attendance.ts`, all in Roster), read `KIOSK.md` in full before planning or editing. It is the rule set. If a task conflicts with it, stop and ask. Never edit `src/contracts/kiosk-attendance.ts`.

## Archive context (read selectively)

- `MASTER_CONTEXT.md` is a historical archive. Never read it whole.
- Read PROGRESS.md. Resume the row marked in progress if there is one. Otherwise take the first row marked todo. Skip done and skip.
- Get its line range from `MASTER_INDEX.md` and read only that range. Don't read ahead.
- Mark a row `done` (date plus one-line outcome) only after I say it's done.
- For porting questions, sections 12 and 20 are the most useful starting points.
- If `SESSION_HANDOFF.md` exists, read it at the start of a session.
- Archive notes can be stale. `KIOSK.md` and the actual repo files win.
- Never present an inference from the archive as a confirmed requirement. Say when something is only proposed or unverified.

## Working rules

- Keep replies short and practical.
- Ask for the user's go-ahead before writing code or starting a substantial implementation.
- Build only what confirmed requirements call for; surface conflicts instead of guessing.
- One screen/feature at a time; stop for approval before the next.
- Do not run or start dev servers (the user runs `npm run dev`) or use browser automation.
- Do not run claude in chrome, tell user how to quickly test
- Never commit or push; the user handles Git.
- Never print or copy secrets, credentials, tokens, or login files.
- The user may edit files concurrently: re-read a target file right before editing it.
- Use they/them for people unless told otherwise.
- After each approved task, give a concise handoff: what changed, files touched, checks actually run, remaining risks, next step. Don't claim checks were run unless they were.
- Next.js docs: before using a Next.js API, read only the single doc page for that API in Roster's `node_modules/next/dist/docs/` (search by filename or keyword first). Skip for work that touches no Next.js APIs.
- At the end of a session, when I ask, write `SESSION_HANDOFF.md` from `SESSION_HANDOFF_TEMPLATE.md`. Keep it under about 40 lines.
