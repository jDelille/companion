# Session Handoff

Date: 2026-10-19
Session length / focus: Paul's ask "MCP/API integrations for Do For Me with 3rd-party providers; test email/SMS/voice was sent" → Companion Do For Me UI first (Roster paused)

## Current goal
- Build Do For Me in **Companion** (user OK'd Companion edits for this, overriding CLAUDE.md "never edit Companion"). Jodi's spec (2026-10-19): Do For Me IS the right Companion rail restyled — tabs **Plan / Work / Evidence / History**, "Ask the agent" at bottom, **no second panel**. "+ Do For Me" on a member and "Do For Me" on a suggestion card open/focus the rail aimed at that member/suggestion (pass `memberId` on click; companion routes accept member + class). Proposed change review (field changes + **Apply**) goes in the **main center area**; rail shows evidence. Nothing saves until approval; each approval → Odoo receipt. Don't use `src/components/ai/do-for-me-panel/DoForMePanel.tsx`.
- User is about to share more mockup pics. Wait for them before the redo.

## Current state (Companion `C:\Users\justi\Desktop\dojang\companion`, branch `restore-vnext-look`, uncommitted)
* Slide-over fix (KEEP): Jodi #43 sync had hidden the rail. `src/components/shell/AdaptiveShell.tsx` (nav "Companion" button via `ConnectedNavigation` onCompanion/triggerRef, backdrop click-outside, `closeCompanion`, listens `dojang:do-for-me` → opens), `ConnectedNavigation.tsx` (`styles.companionLink`), `Shell.module.scss` (end: open rule z-index 41, `.companionLink`, `.companionClose`). User confirmed "I see it now".
* Built then superseded by Jodi's spec (REDO): `DoForMePanel.tsx` + `.module.scss` (separate panel; revert to Jodi's 8-line placeholder, delete the scss), `SuggestedCard.tsx` (review Modal removed, `onDoForMe` prop), `CompanionRail.tsx` (`doForMe {page, suggestion}` state, renders DoForMePanel, listens `dojang:do-for-me`), `people/member-360/identity/Identity.tsx` ("Do For Me" button dispatches `dojang:do-for-me`; rename to "+ Do For Me", pass memberId in event detail).
* Rail pieces: `src/components/shell/rail/companion-rail/` — `useCompanion.ts` (context per pathname via `viewFromPath`, `approve` w/ idempotent retry, `request`, receipts), MemberIntel, SuggestedCard, TaskItem, ReceiptHistory, AgentComposer, TodayBrief. `viewFromPath` gets memberId only from `/people/<id>`.

## Proposed redo plan (shown to user, not yet approved)
1. Rail header "✦ Do For Me" + tabs: Plan (intel, suggested, TodayBrief), Work (task list + agent answers), Evidence (explanation, risk, `context.records`), History (receipts).
2. Center review card (title, preview field changes, Apply/Cancel, status) in AdaptiveShell main area; rail switches to Evidence.
3. Lift `useCompanion` into a shared provider in the shell so rail + center review share status/approve/receipts. Allow memberId override from the button event.

## Integration facts (for Paul's ask)
* Jodi's repo `Jodi1time/dojo-odoo19` (fetched read-only into `refs/jodi/heads/*`): latest #43 (Oct 16). Done+tested: Companion rail ask→prepare→approve→Odoo receipt; OpenAI drafting (follow-up wording only); approve-then-save actions: intake, attendance, trials, belt testing, refunds, waivers, messaging; WhatsMax inbound sync.
* Built not live: Twilio SMS PR #39 (test creds only, sender +15005550006; **Paul's Twilio account suspended**); WhatsMax outbound (needs one controlled test; `accepted` ≠ delivered).
* Not built: Google Workspace MCP, ADK, ElevenLabs voice (via Twilio), delivery status. `ai_mcp` (~48 tools) not in release, untested on Odoo 20, shared key + self-chosen role (incl. admin) → needs per-user access first. Email = Odoo mail templates (needs mail server). Voice addons (`connect`, `dojo_ai_caller`) fail install on Odoo 20 (httpx).
* N8N (`docs/n8n/`): agents call Odoo `/api/v1/ai/confirm` + `/execute` with OpenAI; N8N doesn't hit providers.
* Local OpenAI: `ai_assistant/models/openai_conversation.py` reads env `DOJANG_OPENAI_API_KEY`, else system param `openai.api_key`. User has a key from Paul; set via Settings → Technical → System Parameters (user enters it). Enabling AI for site needs an **owner** login. Local Hub login `hub-manager@example.invalid` (manager) at `http://127.0.0.1:8074`, db `dojang_demo_hub1`.

## Checks
* Run: `npx tsc --noEmit` clean; eslint on changed files (only pre-existing `children` unused warning); sass compiles.
* Not run: browser click-test of DoForMePanel / member button (being redone anyway).

## Roster (paused)
* `C:\Users\justi\Desktop\dojang\roster` branch `odoo20-integration`, uncommitted: Prisma/next-auth fully removed (deps trimmed to clsx, lucide-react, next, next-intl, react, react-dom, tailwind-merge, zod); ~165 removed files backed up in old scratchpad `roster-removed/`. User to `rm -rf .next && npm run build && npm run dev`. Next: step 5 deploy files (apphosting.yaml, docker-compose, deploy/*.service still reference DATABASE_URL/NEXTAUTH/Redis/workers).

## Next step
1. Look at user's new mockup pics, finalize the redo plan, get go-ahead, implement in Companion.
2. Message to Paul: Do For Me UI in progress on Jodi's approve-then-save actions; real SMS/voice tests blocked until Twilio reactivated / WhatsMax outbound test approved.

## Context to read next time
* `CLAUDE.md`, this file, memory `do-for-me-vision`; `c:\Users\justi\Desktop\do-for-me-panel.png` (mockup: Do For Me header, PLAN/WORK/HISTORY tabs, Member intelligence, Suggested card w/ Explain + Do For Me, Ask the agent).
