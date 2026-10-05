@AGENTS.md
Kiosk (Dojang public check-in)

Rules for all work under the kiosk section of this app. Follow them exactly; if a task conflicts with a rule, stop and ask instead of guessing.

Sources of truth (in priority order)
Paul's writeup "Odoo/Kiosk/React/Companion/Update/Saas" — Build Walkthrough §14, §15, §18; adaptive vision §§21–24, §§36–39, §§48–49, §62, §§72–74.
Jodi's "Kiosk + AI Companion UI handoff v2" (2 Oct 2026) — screens K01–K07 and required states.
Jodi's mockup screens site — visual baseline only (type, spacing, card style). Where it conflicts with 1 or 2, 1 and 2 win.
Scope
Front end only: screens, components, states, accessibility, privacy reset.
Mock data only. No Odoo calls, no real API integration. Jodi owns the domain contract, eligibility logic, attendance write and receipts.
Put draft request/response types in one file (types/kiosk.ts) and mark them DRAFT — they will be replaced by Jodi's contract.
Do not build a spatial map or floor plan. It is unconfirmed.
Check-in order (§14) — never change this

Check In → choose live session → load that session's roster → identify → eligibility → confirm → result → privacy clear.

Never identify a person first and guess their class.
The selected session stays visible from identify through result.
Changing the session or the attendee discards the previous eligibility result and returns to identify.
Screens
K01 Welcome: school name, greeting, one dominant Check In. Secondary: Classes, Events; Testing, Schedule, Staff only if enabled. Unavailable features must not look usable.
K02 Session: today's sessions — name, start time, instructor/area, capacity. User must explicitly pick one.
K03 Identify: QR, PIN, search — scoped to the selected session's roster. Show minimum info per candidate (first name + last initial). States: no match, multiple matches, identified.
K04 Eligibility: attendee + class; allowed or "Please see the front desk". Never show a reason (no debt, no flags). Dependent selection only via verified guardian (later; mock as disabled).
K05 Confirm: summary + Confirm check-in / Back. Block double submit while pending.
K06 Result: shown only after a confirmed result. Separate states: success, already checked in, rejected (neutral front-desk message), not confirmed (network). Receipt names the selected session.
K07 Privacy reset: on done or idle timeout, clear attendee, search text, suggestions and receipt; return to K01. Timeout value is not agreed — keep it a single config constant.
Kiosk constraints (§21)

Unattended public mode. Large targets. No public debt or balance. No member editing. No staff/admin features or links (no Business Companion link). No rank changes. AI is optional — check-in must work with AI off. Never show success unless the (mock) server confirmed it.

Layout (§22, §48, §49)
Portrait/compact: one task at a time; secondary info in a Tray or Dialog.
Landscape/expanded: two regions — CHECK IN (left) and TODAY session list (right). Tapping a session in TODAY selects it; identify controls stay locked until a session is selected.
Use container queries (breakpoints ~540px and ~960px), not device media queries.
Respect safe areas: env(safe-area-inset-*) on the shell.
Must work in both orientations without losing the selected session.
Design language (Build §15)

Build only from: Shell, Object, Leaf, Tray, Popover, Dialog. Reuse the existing Member object component; the kiosk shows a minimal variant of it.

Tokens (Build §18, §72) — never hardcode colors or sizes in components
scss
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

Palette (dark vs. Jodi's light mockups) is pending confirmation — keeping everything in variables means it can be swapped in one place.

Motion (§73)

Allowed: morph, expand, collapse, fade, directional slide, subtle pulse. Never: shake, bouncy confirmations, continuous decorative motion. Use motion to preserve object identity (e.g. selected session card → session header). Use View Transitions where the current React/Next version supports them; do not upgrade dependencies to get them without asking.

Mock data must include
3–4 sessions today with capacity (e.g. 21/24).
A roster per session.
Two members with the same first name.
One member already checked in.
One member not eligible.
A switch to simulate network failure / slow response.
Done means
Every K01–K07 state is reachable with mock data.
Portrait and landscape both work without losing the selected session.
Idle reset clears everything and returns to K01.
No hardcoded colors; all touch targets ≥ 48px.
Tested by clicking through in the browser.