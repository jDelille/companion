# Actual-source design preview

`design/dojang-black-red` builds on `sync/justin-ui` (PR #16). The Next app in
`companion/` is the source of truth for the redesign. Firebase staging is unchanged.

The current preview host runs those same app, component, API and SCSS files through
Vinext on Cloudflare Workers. Its separate hosting checkout contains only host
build tooling plus an exact copy of this source. It is not the earlier static UI.
`/source.json` records the GitHub commit, source hash, and copied file list.

The host builds with `NEXT_PUBLIC_DEMO_MODE=true`. It uses the repository's fictional
sample records and existing mock APIs. Demo state is temporary server memory and
may reset or vary across worker instances; it is not a persistent staging database.
No Odoo credentials, pairing keys or backend secrets belong in this preview.

To update: commit the app changes, run `node companion/tools/sync-design-preview.mjs
/absolute/path/to/the/configured/preview`, then use the Sites source/build/publish
workflow. The host pins demo mode at build time and preserves the `sites()` plugin.
Run the normal Next build as well to verify the GitHub app independently of the host.

The preview also pins `NEXT_PUBLIC_DOCUMENT_NAVIGATION=true` at build time.
All page links use the shared `AppLink`, which becomes a native anchor in that
mode: browser navigation, reload, back, and opening a new tab do not depend on
the alternate runtime's client route transitions. In the Next deployment the
flag is unset and `AppLink` retains normal Next navigation. Keep in-page buttons
and form actions as React interactions.

Mobile navigation floats outside the scrolling workspace within `100dvh`, with
safe-area insets and constant bottom scroll padding so the last row is reachable.
Only on Today, the first downward scroll movement starts collapsing it to a Home
circle, with no distance threshold. Upward travel of 20px, reaching the top, or
tapping the circle reveals it. Keep keyboard focus reachable and ignore minor
upward jitter while collapsed. Preserve the smooth surface transition.

## Shape and visual direction

Use Dojang black and red. Follow the Porchlight control shapes: circular compact
icons/avatars and oval buttons, fields, filters, and status chips. Large reading
surfaces retain ordinary soft corners. Favor open lists and spacing over nested
cards, decorative gradients, repeated helper text, or heavy outlines. Keep one
clear primary action. The mobile dock is a glass oval with circular symbols.
The kiosk welcome uses a compact frosted-glass Check in pill with a small red
arrow, without helper text underneath or a full-width action card.

The home heading is simply Today. Show an upcoming/current class only when one
exists; use one quiet line when classes have ended. Avoid welcome slogans and
repeated explanatory copy. Keep the demo notice short and put detail in the guide.

Use open rows and short fading rules for schedules, name matches, questions,
follow-ups, and receipt details. Keep glass for a primary surface or overlay.
Class names may wrap; class choices are chronological. Use circular directional
accents and a single oval composer with a circular submit action.

Follow-ups is a dedicated review list; Companion is the question and action panel.
The demo list records sample approvals only. Connected mode shows its authorized
reviewed follow-up history and does not invent a pending-work feed.

## Glass and motion

Use the supplied reference's open schedule rows, generous spacing, warm type,
and editorial serif headings. Glass belongs on the main class card, member
detail cards, review surfaces, and sheets; keep lists and ordinary text open.
The background uses stationary, faint red light on near-black. The original UFT
kiosk crest sits centered behind workspace and kiosk content, with a circular
feathered edge and low opacity. Keep it at 70% width (capped at 30rem/62svh),
with its original colors intact. Do not make the crest monochrome, invert it,
or recolor it. Keep the outline clear: fade only the outer rim (84–100% radius),
not the middle or lettering. Blend using low opacity and light edge feathering, keeping the
schedule legible. Use one restrained central red glow, not a burgundy wash.
Reuse `addons/dojo_kiosk/static/src/img/uft-logo.png`
unchanged (it contains JPEG bytes, served as `public/brand/uft-crest.jpg`). Its
Afterhours-style metallic shine glides briefly every nine seconds, pausing in
hidden tabs, off-screen, and behind dialogs/panels. Reduced motion keeps a still
crest; increased contrast hides the decoration. Never animate blur or the page
background. Content may arrive over 420ms; controls get
short press feedback. Never transform the shell or dock ancestor. Respect
reduced motion and transparency; the glass mixin provides a solid fallback.
Keep existing live-data labels accurate rather than copying invented reference
metrics or attendance claims.

The dock uses one glass surface that changes width/height over 460ms; controls
crossfade in sequence without scaling text. Check-in success draws a ring and
checkmark once only after a matching confirmed receipt. Already-recorded receipts
use a still checkmark, and unconfirmed/offline outcomes never show it. Reduced
motion shows the final still state. Preserve Done and the existing privacy reset.

## Member context and loading

Member dialogs require the selected member record. Names, initials, rank, status,
household, and registered classes must agree across the profile and its dialogs.
Bookings come from the same member IDs and rosters as kiosk check-in. An absent
source is unavailable, not a sample payment method, balance, plan, or instructor.
Profile writes and booking/billing changes are not connected in this preview;
show that boundary honestly. Check-in actions open the real kiosk flow and never
set a local success flag. Companion suggestions, drafts, approvals, replays, and
receipts are scoped by member ID.

Normal demo reads have no artificial waits. Keep the explicit slow scenarios for
rehearsal. Load the Companion panel on its first open and retain it after closing.
Demo kiosk screens do not poll the paired-device recovery endpoint. Keep native
preview navigation until soft routing is proven reliable in the hosted runtime.
