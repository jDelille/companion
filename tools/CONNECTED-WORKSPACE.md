# Connected workspace acceptance

This update requires the matching Companion frontend and `dojo_companion_hub` Python code in the running Odoo workers. It does not change grants, payment providers, customer channels, or existing member records during deployment.

## Staff walkthrough

1. Open a paired staff workspace and choose a member. Check the identity at the top of the record.
2. Open Billing before individual sign-in. The screen must request the staff account and retain the exact member selection.
3. Sign in to Hub using an existing authorized account. Return to the selected member and open Timeline, Attendance, Progress, Membership, Billing, Messages, Family, Documents, and Safety. Each section reads native records within that account's scope. Instructors must not receive billing, family, document, or safety data.
4. Use the action links to review an existing booking, contact change, checkout, rank award, or invoice checkout. Review the exact record before confirming. A missing invoice is not a zero balance; preparing a checkout link is not a payment.
5. Open Sales. Switch between board and list, then filter by configured stage, owner, interest tag, and priority. The summary covers only the loaded search results, at most 100 leads.
6. Open one lead. Expand the evidence calculation; every point must have its recorded fact and available weight. Priority comes from assigned ownership and due tasks. Neither stage nor score establishes trial attendance or a conversion probability.
7. Add an internal note and confirm it. Reload the lead: the note must remain in native Odoo history and must not notify customers.
8. Review the suggested next action, enter context and a due date, and confirm. The result is a native internal task for follow-up, trial, reactivation, or conversion review. Preparing or completing a task does not perform that business action.
9. If a save loses its response, resolve the unconfirmed result with the original action. Navigation and competing writes stay locked. Retry must reuse the original receipt key and produce one native result.

## Remaining acceptance boundaries

- Sales stages are the school's configured native stages. Preparation tasks do not activate campaigns, book trial sessions, create memberships, or alter subscriptions.
- Documents show exact-member attachment metadata and optional waiver status. Download, upload, and signing flows are separate work.
- Public kiosk schedule Ask is read-only. New-family enrollment, waitlists, testing eligibility, and other kiosk write journeys remain separate work.
- Actual customer delivery, payment settlement/refunds, additional operational surfaces, and external-device integrations still require their configured services and acceptance checks.

The automated connected rehearsal exercises synthetic data in an isolated Odoo database. Its passing result is not evidence that the update is deployed or that production providers are configured.
