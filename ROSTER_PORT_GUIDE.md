# Roster port guide

How we're moving Jodi's Companion screens into Roster. Read this before porting the next screen. Last updated 2026-10-17.

## Paths
- **Source (read only, never edit):** this repo, `C:\Users\justi\Desktop\dojang\companion`. Jodi's screens are in `app/(companion)/hub/*.tsx`. `hub/page.tsx` shows which Hub operation and payload each screen sends (search for `act('<op>'` or `<ScreenName`).
- **Target (edit here only):** Roster at `C:\Users\justi\Desktop\dojang\roster`, branch `odoo20-integration`. The user runs `npm run dev` (localhost:3000).
- **Odoo addon source (for payload rules and errors):** `C:\Users\justi\Desktop\dojang\staging\odoo-image\context\addons\dojo_companion_hub\models\` (`service.py` dispatch around line 463; `instructor.py`; others per feature). Error codes come from `HubProblem("CODE")`; Odoo `ValidationError`/`UserError` become `BUSINESS_RULE_REVIEW_REQUIRED` (`service.py:546`).
- Note: the archive (section 12) names `companion-pr43` as the source. The user said to use this repo instead.

## Recipe for one screen
1. Read Jodi's screen file plus its call in `hub/page.tsx` for the exact operation names and payload keys.
2. Check whether Roster already has a page or component for the same job (`app/(dashboard)/dashboard/*`, `components/*`). Prefer extending it, or wiring an existing disabled button, over a new page. Use Roster's UI kit.
3. Add `/api/v2` routes, named for the business action, using the helpers in `lib/domain/hub-routes.ts`:
   - `hubRead(op, cap, map?)` for GET (query params become payload strings)
   - `hubPreview(op, cap, map?)` for POST `{payload}` reads
   - `hubWrite(op, cap, map?)` for POST envelope writes (`expectedVersion` is copied into the payload)
   - `map` such as `{ id: 'memberId' }` copies a numeric route param into the payload. Only use a key name that matches Jodi's payload.
   - Operation names must be in the allowlist in `lib/odoo-hub.ts` (all 81 already are).
4. Write `components/hub/<screen>.tsx`. Copy the pattern from `member-booking.tsx` and `instructor-timesheets.tsx`:
   - wrap the screen in `<HubGate capability="...">`
   - read with `useHubRead(path)`
   - write with `useHubActions(refresh)`: `act(scope, path, payload, { expectedVersion })`, `retry`, `pendingIn(scope)`
   - always show a "Review before saving" step, then "Confirm … in Odoo"
   - show results with `<Feedback>` (it includes the same-key retry)
   - `useHubRead` keeps the previous error while reloading, so hide errors while `loading`
5. Add `page.tsx`. Add a nav link only for a new top-level page: `components/dashboard/nav.ts` plus the `nav` key in both `messages/en.json` and `messages/ar.json`. Screen text stays English inline.
6. Run `npx tsc --noEmit` in Roster. Give the user the URL, how to reach it and test steps, then stop and wait for their OK.

## Screens done
| # | Screen | Where in Roster | Routes (`/api/v2/…`) | Notes |
|---|---|---|---|---|
| 1 | Attendance review | Classes → Attendance review | `sessions`, `sessions/[id]/attendance` | earlier session; committed; needs click-test |
| 2 | Member management | Member page → "Manage in Odoo →" (`/dashboard/contacts/[id]/manage`) | `members/[id]/*`, `refunds/[id]/*`, `classes/upcoming` | earlier session; committed; needs click-test |
| 3 | Member booking | Member page header **Book** button → `/dashboard/contacts/[id]/book` | `members/[id]/bookings` (op `book`) | tested OK; committed |
| 4 | Instructor & timesheets | Panel at the bottom of Classes → Instructor Focus (`/dashboard/instructor`) | `instructor/timesheets`, `instructor/clock`, `timesheets/[id]/correction` | tested OK; uncommitted |
| 5 | Reports & rosters | Reports → Operations reports (`/dashboard/operations`) | `reports/operations`, `sessions/[id]/roster` | tested OK; uncommitted. Print rule `.hub-printable` in `app/globals.css` is reusable |
| 6 | New student (+ row 18 directory entry) | Members header **New student** button → `/dashboard/contacts/new` | `students/intake` (GET `?query=`), `students/intake/preview`, `students` (op `create_student`) | tested OK; uncommitted; `members.newStudent` label in en/ar |
| 7 | Sales/CRM + trials | CRM → **Sales** (`/dashboard/sales`), lead page `/dashboard/sales/leads/[id]`; Leads list contact name links there | `leads` (GET+POST create), `leads/[id]/{details,owner,notes,stage-proposal,next-action,trial}`, `tasks`, `tasks/[id]/completion`, `trials/[id]/{cancellation,outcome,conversion,conversion/preview}` | tested OK; uncommitted. Shared parts in `components/hub/crm-parts.tsx` |
| 8 | Course rosters | Classes → **Course rosters** (`/dashboard/courses`) | `courses` (GET `?templateId=`, always sent), `courses/[id]/assignment/preview`, `courses/[id]/assignment` | tested OK; uncommitted; `nav.courses` in en/ar. Capacity-conflict path untested |
| 9 | Archived students | Members header **Archived** button → `/dashboard/contacts/archived` | `members/archived` (GET `?query=`, always sent), `members/[id]/restore` | tested OK; uncommitted; `members.archived` in en/ar. Archiving itself is on screen 2 |
| 10 | Belt testing | People → **Belt testing** (`/dashboard/testing`) | `testing/eligibility`, `testing/tests` (create), `testing/tests/[id]{,/results,/promotions,/promotions/preview}`, `testing/promotions` (history), `promotions/[id]/reversal` | tested OK; uncommitted; `nav.testing` in en/ar. Conflict and fail/withdrew paths untested |
| 11 | Messaging & consent | Engage → **Messaging & consent** (`/dashboard/messaging`) | `messaging/broadcasts` (GET+POST), `messaging/broadcasts/{preview,[id]/approval,[id]/cancellation}`, `messaging/automations` (GET), `messaging/automations/state` (id in body, e.g. `ir.cron:12`), `members/[id]/consent` (GET+POST) | tested OK; uncommitted; `nav.messaging` in en/ar. Student picker uses `classes/upcoming`. Owner-only pause/resume untested (manager login) |
| 12 | School setup | Platform → **School setup** (`/dashboard/setup`) | `school/setup` (GET, op `setup_checklist`) | tested OK; read only; `nav.setup` in en/ar. Checklist list shared with member onboarding: `components/hub/checklist-items.tsx` |
| 13 | AI settings | Platform → **AI settings** (`/dashboard/ai-settings`) | `ai/settings` (GET, op `ai_settings`), `ai/activation` (POST, op `enable_ai`; `expectedSiteVersion`/`expectedConfigVersion` in payload) | tested read-only; `nav.aiSettings` in en/ar. Shows "No AI provider configured" locally: Odoo needs `DOJANG_OPENAI_API_KEY` on the container or system param `openai.api_key` (separate from Roster's own `OPENAI_API_KEY`). Activation needs an owner login; untested |
| 14 | Inbox / parent messages | Engage → **Inbox** (`/dashboard/inbox`, replaces the template Prisma inbox; Roster does not use Prisma) | `parent-messages` (GET, op `context`), `parent-messages/[id]/{match,draft,reply}` (ops `resolve`, `draft`, `approve_reply`; `expectedRevision` in payload); booking reuses `members/[id]/bookings` and `members/[id]/class-change` | tested OK; approve-and-queue untested (no outbound provider). Old `?conversation=` links now land here and are ignored |
| 15 | Member directory filter | covered by existing Members page (`/dashboard/contacts`) search + state filter | none | that page reads Odoo via ORM; logged in Open questions |
| 17 | Member page Hub summary | Member 360 tabs: Timeline (Recorded staff actions), Family (household + verified guardians), Messages (parent messages), Documents (register), new **Safety** tab | existing `members/[id]` (op `member_workspace`) | tested OK; panels in `components/hub/member-hub-records.tsx` (`FamilyRecords` moved there from screen 2); `member360.tabs.safety` in en/ar. Safety (medical) comes from the Hub, managers/owners only. Panels need the staff Odoo sign-in (Settings) |
| 19 | Follow-ups | Engage → **Follow-ups** (`/dashboard/follow-ups`) | none new: reuses `/api/companion/context` (kiosk staff gateway, not the Hub) | tested OK; port of Jodi's connected page (`ConnectedWorkflowView historyOnly`): read-only list of saved follow-ups; composer already in the Companion panel (member page). `nav.followUps` in en/ar. Sample-mode `FollowUpQueue` not ported (preview only) |
| — | Health + readiness (Jodi #9/#14) | `/api/health` (public), `/api/integration/readiness` (signed-in staff) | none new | built 2026-10-17, untested. Readiness probes staff gateway members + companion `context`/`readiness`; reports counts and flags only; kiosk read `not_checked` (Roster has no kiosk gateway key). Set `DOJANG_RELEASE_SHA` on deploy |

## Kiosk (#16) progress
- 2026-10-17: coworker's `kiosk-odoo` branch (danielkim, eefb7b2: v1 gateway copied, `/api/kiosk/*` routes, data switch `NEXT_PUBLIC_KIOSK_SOURCE=odoo`) applied to the working tree as uncommitted changes (not merged; `kiosk-port` was already merged). On top: `/kiosk/pair` matches v1 `/integration/pair` (`?key=` auto-connect, 32-char minimum), kiosk role only; `DOJANG_STAFF_PAIR_KEY` made optional in `lib/kiosk/server/odoo-gateway.ts`.
- Env (copy from Companion `.env.local`): `DOJANG_INTEGRATION_MODE`, `DOJANG_ODOO_URL`, `DOJANG_COOKIE_SECRET`, `DOJANG_KIOSK_GATEWAY_KEY`, `DOJANG_KIOSK_PAIR_KEY`; set `DOJANG_PUBLIC_ORIGIN=http://localhost:3000` (Roster's own origin) and `NEXT_PUBLIC_KIOSK_SOURCE=odoo`.
- Tested 2026-10-17: pairing and a live check-in on local class #12 (Demo Student) work.
- `KIOSK.md` still says mock-only; the user chose to connect the kiosk. Update `KIOSK.md` (ask first).

## PR audit (2026-10-17)
Checked every merged PR in Jodi's repo (`Jodi1time/dojo-odoo19`; descriptions in `dojang/jodi-handoff/jodi-pr-descriptions/`) against Roster. Every Hub operation Jodi's screens call has a Roster route; `link_guardian`/`provision` are allowlisted in v1 but no v1 screen calls them.
- Ported: all non-kiosk features (screens 1–15, 17, 19, health/readiness).
- Kiosk only, still open (#16/#20): #24 schedule questions, #28 public mode + class time/location, #34 parent check-in, #41 roster grid.
- Nothing for Roster: #4, #12, #15 (Odoo/WhatsMax/infra), #16, #18, #27, #42 (design merges), #40 (bundle of #32–#38).
- #43 merged 2026-10-17 00:32 UTC (the jodi-handoff README says not merged; stale). Style pass; only functional change is the member directory status filter (= #15). `companion-pr43` folder does NOT contain #43 (same commit as this repo).
- Open, not merged: #39 Twilio test sending for broadcasts; #44 (draft) `dojo_school_app` Odoo module serving Paul's HTML app with per-role homes. Re-check both before porting anything.

## Local test setup (local Odoo only, never staging)
- Odoo at `http://127.0.0.1:8074`, database `dojang_demo_hub1`, container `dojang-hub-odoo`. Hub login `hub-manager@example.invalid` (role: manager). The user reset its password and knows it. Never print or store it.
- Auto mode blocks Claude from running `docker exec` writes. Write the script to the scratchpad and give the user a `! MSYS_NO_PATHCONV=1 docker exec -i dojang-hub-odoo /opt/odoo/odoo-bin shell --config=/etc/odoo/odoo.conf -d dojang_demo_hub1 --no-http < <script>` line to run.
- Data added on 2026-10-17:
  - class #11 "Demo session" (2026-10-18, 6–7 PM Arizona), with one member booked
  - instructor profile #1 linked to hub-manager (employee #1)
  - kiosk config #1 staff PIN set by the user (it's the instructor clock PIN too)
  - company 1 `attendance_validation = 'manual_validation'`. The default `no_validation` approves shifts at once, so "Correct this timesheet" never shows.
  - belt ranks White/Yellow/Orange/Green/Blue (thresholds 0/2/4/6/8) for company 1; there were none, so Belt testing showed no checkboxes
  - class #12 "Demo session" (2026-10-17 6:39 PM–12:44 AM Arizona), linked to the kiosk, 3 test students booked
  - guardian binding #2 "Demo Guardian (local)" (SMS 5550101, allow reply) for Demo Student, and parent message #2 (`event_ref` local-demo-1)
- The booking and replacement lists only show open classes that haven't ended. Local demo classes go stale, so add a future class when the lists are empty.

## Open questions (for the user / project lead)
- **Ask Jodi (2026-10-17):** who owns outbound messages? Broadcasts (#11) queue SMS/email inside Odoo (`create_broadcast` / `approve_broadcast`), but the handoff names WhatsMax as the communications hub. Ported as Jodi built it for now (no provider connected locally, so nothing sends). Should broadcasts go through WhatsMax instead, and should consent live in Odoo or WhatsMax?
- **Ask Jodi (2026-10-17):** who owns AI drafting? AI settings (#13) turns on OpenAI drafting inside the Odoo worker (`ai_settings` / `enable_ai`), but the handoff says Roster owns the AI experience. Ported as Jodi built it for now.
- Roster's Members page (`/dashboard/contacts`, `lib/academy.ts` `loadMembers`) and the Leads/Pipeline pages read Odoo through the ORM with the server key, not the Hub. Move to the Hub (`context` gives grant-scoped members but no phone/email/paging) or retire? Ask Jodi/Paul. #15 counted as covered by the existing page.
- **Ask Jodi (2026-10-17):** follow-ups (#19) and the Companion panel's prepare/approve use the kiosk staff gateway (`/kiosk/v2/staff/companion-workflow`, server key), not the Hub, as in v1. The Hub has no follow-up operation. Add one to `dojo_companion_hub`, or is the gateway acceptable here?
- With Odoo's default auto-approve setting, timesheet correction never appears. Should schools use manual approval?
- Roster shows the bookings-worded `BUSINESS_RULE_REVIEW_REQUIRED` text on every screen (for timesheets it's usually an overlapping shift). The user said that's fine for now.
- Section 20 (`V1_VS_ROSTER.md`) hasn't been read yet. Read it once to check the remaining list isn't missing Companion features outside `hub/`.

## Next
- Read section 20 (range in `MASTER_INDEX.md`), then report any gaps (still not done).
- #19 Follow-ups done. Kiosk #16/#20 skipped until the coworker's work is checked.
