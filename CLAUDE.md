@AGENTS.md

# Kiosk (Dojang public check-in)

Rules for all work under the kiosk section of this app. Follow them exactly. If a task conflicts with a rule, stop and ask instead of guessing.

## Sources of truth (in priority order)
1. Paul's writeup "Odoo/Kiosk/React/Companion/Update/Saas": Build Walkthrough §14, §15, §18; adaptive vision §§21–24, §§36–39, §§48–49, §62, §§72–74.
2. Jodi's "Kiosk + AI Companion UI handoff v2" (2 Oct 2026): screens K01–K07 and required states.
3. `src/contracts/kiosk-attendance.ts`: the authority for all data shapes (sessions, roster members, check-in command, receipt, problem codes).
4. Jodi's mockup screens site: visual baseline only (type, spacing, card style). Where it conflicts with 1–3, 1–3 win.

## Scope
- Front end only: screens, components, states, accessibility, privacy reset.
- Mock data only. No Odoo calls. Jodi owns the domain contract, eligibility logic, attendance write and receipts.
- Do not build a spatial map or floor plan. It is unconfirmed.

## Contract and mock backend (already built, do not recreate)
- `src/contracts/kiosk-attendance.ts` is Jodi's contract. NEVER edit it. Import its types only. Do not create competing kiosk types elsewhere.
- Mock API routes (Next.js) answer in the contract's shape:
  - `GET /api/v2/sessions`: today's sessions (PROVISIONAL path)
  - `GET /api/v2/sessions/[sessionId]/roster`: one session's roster (PROVISIONAL path)
  - `POST /api/v2/attendance/check-ins`: the check-in command
- Mock internals live in `src/integrations/mock/` (kiosk.ts, kiosk-store.ts, kiosk-scenario.ts, kiosk-http.ts). Do not add to them unless asked.
- Screens get data ONLY through `src/integrations/kiosk.ts`, which calls the routes above. Screens never import mock files.
- Companion members (`src/integrations/mock/members.ts`, numeric ids 5xxx) are on the kiosk rosters too, so a kiosk check-in shows on their Member360 (read via `getMemberAttendance` in `src/integrations/member.ts`). Kiosk-only students (1xxx–3xxx) stay in `kiosk.ts`. Member ids must stay numeric: Jodi's `buildCheckIn` rejects anything else.

## Architecture
- One page renders the whole flow: `app/(kiosk)/kiosk/page.tsx`. No route per screen (privacy: no URL history to restore a previous attendee).
- Kiosk shell: `app/(kiosk)/layout.tsx`. No Companion navigation.
- Flow state, transitions and reset: `src/domain/kiosk/checkInFlow.ts`.
- Screens: `src/components/kiosk/screens/` (WelcomeScreen, SessionSelectScreen, IdentifyScreen, ConfirmScreen, ResultScreen).
- Shared pieces: `src/components/kiosk/` (SessionHeader, SessionRow, MemberMatch, StatusMessage, IdleWarning). DevScenarioPanel is NOT built: scenarios are switched through the API only (`PUT /api/dev/kiosk-scenario`).
- One folder per component, kebab-case folder with the component and its styles inside: `session-row/SessionRow.tsx` + `SessionRow.module.scss`, `screens/identify-screen/IdentifyScreen.tsx`. Same pattern as `src/components/primitives/`.
- Screens are mostly display: data and callbacks in, UI out. Logic lives in the flow state. No business rules in components.

## Check-in order (§14), never change this
Check In → choose live session → load that session's roster → identify → eligibility → confirm → result → privacy clear.

- Never identify a person first and guess their class.
- The selected session stays visible from identify through result.
- Changing the session or the attendee discards the previous eligibility result and returns to identify.

## Screens
- **K01 Welcome:** school name, greeting, one dominant Check In. Secondary: Classes, Events; Testing, Schedule, Staff only if enabled. Unavailable features must not look usable.
- **K02 Session:** today's sessions: name, start time, duration, capacity. Instructor/area only if available (currently not in the contract). User must explicitly pick one. States: loading, empty, unavailable, selected. A full session is shown as context, never blocked.
- **K03 Identify:** name search scoped to the selected session's roster (QR and PIN are undecided, do not build). Show minimum info per candidate (first name + last initial). States: no match, multiple matches, identified. Keep the matching step in one place so it can move server-side later.
- **K04 Eligibility:** the contract has no eligibility pre-check. Eligibility comes back as a problem code at confirm time, so K04 is merged into Confirm until Jodi adds one. Never show a reason. Dependent selection via verified guardian is later; mock as disabled.
- **K05 Confirm:** summary (student → session) + Confirm check-in / Back. Block double submit while pending.
- **K06 Result:** shown only after a confirmed server result. Separate states:
  - success (present or late; show late neutrally)
  - already checked in (`alreadyRecorded`)
  - see the front desk (roster, eligibility and attendance-review problems)
  - choose another class (session unavailable, not open, or version conflict)
  - kiosk unavailable (forbidden, capability disabled)
  - not confirmed (network failure): retry must resend the SAME command and idempotency key. Never mint a new key on retry.
  - Receipt names the selected session.
- **K07 Privacy reset:** on done or idle timeout, clear attendee, search text, suggestions and receipt; return to K01. Ignore late network responses from a previous attempt (match correlationId). Timeout value is not agreed; keep it a single config constant.

## Kiosk constraints (§21)
Unattended public mode. Large targets. No public debt or balance. No member editing. No staff/admin features or links (no Business Companion link). No rank changes. AI is optional; check-in must work with AI off. Never show success unless the (mock) server confirmed it.

## Layout (§22, §48, §49)
- Build portrait/compact first. Landscape after the full flow works in portrait.
- Screens never set their own width. The kiosk shell (`app/(kiosk)/KioskShell.module.scss`) owns one centered column, sized by `--kiosk-column-width` in `app/(kiosk)/kiosk.scss`. Every portrait screen inherits it.
- Portrait/compact: one task at a time; secondary info in a Tray or Dialog.
- Landscape/expanded: two regions: CHECK IN (left) and TODAY session list (right). Tapping a session in TODAY selects it; identify controls stay locked until a session is selected.
- Use container queries (breakpoints ~540px and ~960px), not device media queries.
- Respect safe areas: env(safe-area-inset-*) on the shell.
- Must work in both orientations without losing the selected session.

## Design language (Build §15)
Build only from: Shell, Object, Leaf, Tray, Popover, Dialog.
The Companion's Member object component expects Companion member data, which does not match the contract's RosterMember. Do not force it: ask before reusing it in the kiosk.

## Tokens (Build §18, §72): never hardcode colors or sizes in components
```scss
:root {
  --canvas: #08080a;
  --panel: #101014;
  --raised: #17171d;
  --interactive: #1e1e26;
  --line: #2a2a35;
  --text: #f6f6f8;
  --text-secondary: #a8a8b8;
  --muted: #717184;
  --brand: #e8192c;     /* actions only */
  --mastery: #d7b75c;   /* rank / testing only */
  --agent: #8a7cf6;     /* AI context only */
  --success: #26c76f;
  --warning: #f6a63b;
  --danger: #ef4053;
  --info: #4c8dff;
  --control-height: 40px;
  --touch-height: 48px;   /* minimum for any tappable element */
  --radius-control: 10px;
  --radius-card: 16px;
  --radius-leaf: 18px;
  --radius-tray: 22px;
}
```
Palette (dark vs. Jodi's light mockups) is pending confirmation. Keeping everything in variables means it can be swapped in one place.

## Motion (§73)
Allowed: morph, expand, collapse, fade, directional slide, subtle pulse. Never: shake, bouncy confirmations, continuous decorative motion. Use motion to preserve object identity (e.g. selected session card → session header). Use View Transitions where the current React/Next version supports them; do not upgrade dependencies to get them without asking.

## Known gaps: flag these, never fill them in
- Session and roster route paths are provisional.
- No instructor or area data on sessions.
- No eligibility pre-check (K04 merged into Confirm).
- Identify method: search only for now; QR/PIN undecided.
- Whether the kiosk gets a full roster or server-side search results is undecided.
- No guardian/family check-in.
- No offline queue: network failure means "not confirmed, try again."
- The 10-minute late rule in the mock is provisional.
- Question for Jodi: how each problem code is presented (provisional mapping in `src/domain/kiosk/checkInOutcome.ts`). `INVALID_COMMAND`, `IDEMPOTENCY_CONFLICT`, `MEMBER_UNAVAILABLE` → see the front desk, and `CONCURRENT_RETRY` → not confirmed, are our picks, not from the handoff.
- Check-in request timeout (15s, `CHECK_IN_TIMEOUT_SECONDS`) is provisional, like the idle timeout.
- Question for Jodi: device authorization and capability state. Nothing in the contract lets the kiosk ask "is this device authorized, is check-in enabled?" before showing Welcome, so Check In always looks operational and an unauthorized device only learns at Confirm (`FORBIDDEN` / `CAPABILITY_DISABLED`). Front-end side, still to do: treat those codes on any call as "kiosk unavailable", not "Try again".
- Palette (dark vs. light) pending.

## Working style
- Build one screen at a time, in flow order. Show the plan and file list before writing.
- Create shared components only when a screen needs them.
- Use the dev scenario switch (`/api/dev/kiosk-scenario`) to reach every state.

## Done means
- Every K01–K07 state is reachable with mock data via the scenario switch.
- Portrait and landscape both work without losing the selected session.
- Idle reset clears everything and returns to K01.
- No hardcoded colors; all touch targets ≥ 48px.
- Tested by clicking through in the browser.