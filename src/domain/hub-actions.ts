/** UI feedback only. Odoo remains authoritative for eligibility and writes. */
export type ActionFeedback = {
  kind: 'success' | 'error' | 'uncertain';
  text: string;
  refreshWarning?: string;
  intake?: {memberId: string; memberNumber: string};
  testing?: {testId: string};
  checkout?: {url: string; invoiceId: string; invoiceNumber: string; amount: number; currency: string};
};

const messages: Record<string, string> = {
  TRIAL_STUDENT_REVIEW_REQUIRED: 'Only a student in lead or trial status can take a trial. This student already has a membership status.',
  SIGNATURE_INVALID: 'The signature image could not be read. Clear it and sign again.',
  SIGNATURE_EMPTY: 'Please sign in the box before saving.',
  SIGNATURE_AGREEMENT_REQUIRED: 'The signer must confirm they read and agree to the waiver.',
  WAIVER_TEXT_CHANGED: 'The waiver text changed. Show the signer the current version.',
  SIGNER_NOT_AUTHORIZED: 'Only the adult student or a household guardian can sign.',
  WAIVER_ALREADY_SIGNED: 'This student already has a signed waiver in Odoo.',
  REFUND_NOT_SETTLED: 'Only a paid invoice can be refunded here.',
  REFUND_ALREADY_OPEN: 'This invoice already has a refund in progress or completed.',
  REFUND_ALREADY_CREDITED: 'This invoice already has a credit note in Odoo. Review it in accounting.',
  REFUND_REVIEW_CHANGED: 'The invoice changed. Review the refund again.',
  REFUND_NOT_PENDING: 'This refund is no longer awaiting approval.',
  REFUND_PAYMENT_NOT_ALLOWED: 'A refund payment can only be recorded for an approved desk-payment refund.',
  REFUND_JOURNAL_REQUIRED: 'No cash or bank journal is available to record the refund.',
  REFUND_UNAVAILABLE: 'That refund is not available.',
  CONSENT_UNCHANGED: 'That consent decision is already recorded.',
  CONTACT_UNAVAILABLE: 'That contact is not the student or a household guardian.',
  CONTACT_ADDRESS_REQUIRED: 'This contact has no address for that channel in Odoo.',
  BROADCAST_REVIEW_CHANGED: 'The audience or consent changed. Preview the broadcast again.',
  BROADCAST_NO_RECIPIENTS: 'No consented recipients remain for this broadcast.',
  BROADCAST_NOT_PENDING: 'This broadcast is no longer awaiting approval.',
  BROADCAST_NOT_CANCELLABLE: 'This broadcast can no longer be cancelled.',
  BROADCAST_UNAVAILABLE: 'That broadcast is not available.',
  AUDIENCE_TOO_LARGE: 'This audience has more than 500 students. Choose a smaller audience.',
  AUTOMATION_UNAVAILABLE: 'That automation is not managed here.',
  AUTOMATION_UNCHANGED: 'That automation is already in that state.',
  GUARDIAN_NOT_IN_HOUSEHOLD: 'That parent is not a guardian in this student’s household in Odoo.',
  GUARDIAN_PHONE_REQUIRED: 'Add the parent’s phone number in Odoo before setting a kiosk PIN.',
  GUARDIAN_PIN_TOO_SIMPLE: 'Choose a PIN that is not a repeated digit or a simple sequence.',
  GUARDIAN_PIN_NOT_SET: 'This parent has no active kiosk PIN.',
  TEST_UNAVAILABLE: 'That belt test is not available in this school.',
  TEST_NOT_EDITABLE: 'This belt test is completed or cancelled and can no longer be changed here.',
  ROSTER_DUPLICATE: 'A student is already on this testing roster.',
  ROSTER_CHANGED: 'The testing roster changed. Reload it and review again.',
  TARGET_RANK_NOT_HIGHER: 'The testing rank must be higher than the student’s current belt.',
  INVALID_RANK: 'That belt rank is not active in this school.',
  RESULTS_UNCHANGED: 'No results changed.',
  PROMOTED_RESULT_LOCKED: 'A promoted result cannot be changed. Reverse the promotion first.',
  PROMOTION_REVIEW_REQUIRED: 'Some selected students cannot be promoted. Review the conflicts.',
  PROMOTION_REVIEW_CHANGED: 'The promotion review changed. Preview it again before confirming.',
  PROMOTION_UNAVAILABLE: 'That belt award is not available.',
  REVERSAL_NOT_LATEST: 'Only the student’s latest belt award can be reversed.',
  TRIAL_ALREADY_OPEN: 'This lead or student already has an open trial. Cancel or complete it first.',
  TRIAL_REVIEW_REQUIRED: 'This trial can no longer be changed that way. Refresh to see its current status.',
  TRIAL_NOT_ATTENDED: 'Only an attended, unconverted trial can be converted to a membership.',
  TRIAL_UNAVAILABLE: 'That trial is no longer available in this school. Refresh the lead.',
  PLAN_UNAVAILABLE: 'That membership plan is not available in this school.',
  INVALID_START_DATE: 'Choose a start date from today up to 60 days ahead.',
  MEMBERSHIP_ALREADY_OPEN: 'This student already has an active, paused or pending membership. Nothing new was created.',
  CONVERSION_SETUP_REQUIRED: 'Odoo is missing the subscription stage or price list needed to start this plan. An administrator must configure it.',
  CONVERSION_REVIEW_CHANGED: 'The trial, student or lead changed after the conversion preview. Preview the conversion again.',
  ATTENDANCE_REVIEW_REQUIRED: 'Attendance is already recorded for this class. Review it in Attendance review.',
  ATTENDANCE_WINDOW_CLOSED: 'Attendance can be recorded from 15 minutes before a class starts until 31 days after it ends.',
  ATTENDANCE_UNCHANGED: 'That student already has this attendance status. Nothing was changed.',
  NOT_ON_ROSTER: 'This student is not registered for that class. Book them first or review the roster.',
  REVERSAL_REQUIRES_MANAGER: 'Reversing a recorded check-in requires a manager or owner.',
  CORRECTION_REQUIRES_MANAGER: 'Changing an attendance record that already exists requires a manager or owner.',
  MEMBERSHIP_REVIEW_REQUIRED: 'This student has an active, paused or pending membership. End or transfer it in the membership workflow before archiving.',
  PRIMARY_GUARDIAN_REVIEW_REQUIRED: 'This student is the primary guardian of a household with other members. Assign another primary guardian in Odoo before archiving.',
  PORTAL_ACCESS_REVIEW_REQUIRED: 'This student has an active portal login. An administrator must review that account in Odoo before archiving.',
  PHOTO_TOO_LARGE: 'That photo is too large. Choose an image under 300 KB after resizing.',
  PHOTO_TYPE_UNSUPPORTED: 'Use a JPEG, PNG or WebP photo.',
  PHOTO_DIMENSIONS: 'Use a photo between 64 and 4096 pixels on each side.',
  PHOTO_INVALID: 'That file could not be read as an image. Nothing was saved.',
  COURSE_UNAVAILABLE: 'That course is no longer available in this school. Refresh and choose again.',
  COURSE_ROSTER_CHANGED: 'The course roster changed since you chose these students. Refresh the roster and review again.',
  CAPACITY_REVIEW_REQUIRED: 'One or more upcoming classes would exceed capacity. Nothing was changed; adjust the selection or class capacity first.',
  ASSIGNMENT_REVIEW_CHANGED: 'Bookings or preferences changed after review. Review the assignment again before confirming.',
  INTAKE_FIELDS_REQUIRED: 'Required intake fields are missing or invalid. Choose Review new student to see exactly what needs attention.',
  INTAKE_REVIEW_CHANGED: 'The intake changed after review. Review the current fields again before creating a student.',
  INTAKE_DETAILS_UNAVAILABLE: 'The intake review could not be verified. Nothing is confirmed; reload the options and review again.',
  INTAKE_SCOPE_REVIEW_REQUIRED: 'This school has more records than the bounded intake check can inspect. Ask an administrator to review the native record before creating it.',
  DUPLICATE_STUDENT_REVIEW_REQUIRED: 'A student with this name and birth date already exists in this school, including archived records. Nothing new was created. Choose Review new student to open the existing profile.',
  GUARDIAN_DUPLICATE_REVIEW_REQUIRED: 'That guardian contact already appears in this school. Nothing new was created. Choose Review new student to use the matching household; an archived or unlinked contact needs administrator review in Odoo.',
  GUARDIAN_UNAVAILABLE: 'The selected guardian or household is no longer available in this school. Refresh and select the exact verified relationship again.',
  HUB_NOT_CONFIGURED: 'The hub connection has not been configured on this deployment.',
  SIGN_IN_REQUIRED: 'Sign in with your Odoo account.',
  SIGN_IN_FAILED_OR_MFA_REQUIRED: 'Sign-in failed. Check your credentials. This hub login does not yet support accounts requiring MFA.',
  NO_SITE_ACCESS: 'This account has not been granted access to this site.',
  PROVIDER_NOT_CONFIGURED: 'Messaging is not configured. Your draft remains saved.',
  GUARDIAN_REVIEW_REQUIRED: 'A manager must verify this sender’s guardian authority before continuing.',
  VERSION_CONFLICT: 'This record changed. Refresh and review it again.',
  BUSINESS_RULE_REVIEW_REQUIRED: 'Odoo could not approve this change. Review the subscription, credits, class roster and available places.',
  ENROLLMENT_REVIEW_REQUIRED: 'The original registration cannot be replaced. Its class may have started, attendance may already be recorded, or the registration may no longer be active. Review the original record. A separate future booking must still meet Odoo eligibility rules.',
  SESSION_NOT_OPEN: 'This class is no longer open for booking. Refresh and choose an available future class.',
  SESSION_FULL: 'This class is full. Choose another available class.',
  MEMBER_DETAILS_UNAVAILABLE: 'This member’s details could not be verified. Refresh before continuing.',
  SHARED_CONTACT_REVIEW_REQUIRED: 'This contact is shared or outside this company. Ask an administrator to review it in Odoo; no member was changed.',
  INVALID_COMMAND: 'This action is unavailable or its fields are invalid. Confirm that the matching frontend and Odoo update are deployed.',
  INVOICE_UNAVAILABLE: 'This posted invoice is not linked to this member within your school.',
  PAYMENT_SETUP_REQUIRED: 'Online invoice payment must be enabled in Odoo by your administrator.',
  PAYMENT_PROVIDER_UNAVAILABLE: 'No published payment provider is available for this invoice’s currency, amount and customer.',
  INVOICE_NOT_PAYABLE: 'This invoice has no payable balance. Refresh billing to see its current status.',
  PAYMENT_PENDING_OR_SETTLED: 'A payment may already be processing or completed. Refresh the invoice before starting another payment.',
  PAYMENT_URL_NOT_CONFIGURED: 'The secure Odoo invoice checkout address has not been configured.',
  PAYMENT_RESPONSE_INVALID: 'The checkout address could not be verified. No payment was submitted. Refresh and review the invoice.',
  AI_CONFIGURATION_REQUIRED: 'The running Odoo worker needs its private OpenAI key and supported model configured before activation.',
  AI_CHECK_FAILED: 'The live drafting check failed. AI settings were not changed; template drafts remain available.',
  LEAD_UNAVAILABLE: 'This lead is unavailable with your current access. No other record was selected.',
  TASK_UNAVAILABLE: 'This task is unavailable with your current access.',
  CRM_SETUP_REQUIRED: 'An administrator must configure an intake stage in Odoo first.',
  AUTOMATED_TASK_REVIEW_REQUIRED: 'This activity belongs to an automated workflow. Review it in Odoo before completing it.',
  CRM_DETAILS_UNAVAILABLE: 'CRM records could not be verified. Refresh before continuing.',
  NOT_CHECKED_IN: 'No eligible check-in was found for this member and class.',
  INSTRUCTOR_PROFILE_REQUIRED: 'Your account needs an active instructor profile linked to its employee record at this school.',
  INSTRUCTOR_DETAILS_UNAVAILABLE: 'Instructor records could not be verified. Refresh before continuing.',
  PIN_INCORRECT: 'The instructor PIN is incorrect. No shift was changed.',
  PIN_LOCKED: 'Too many incorrect PIN attempts. Wait for the configured lockout to expire or contact your administrator.',
  ALREADY_CLOCKED_IN: 'You are already clocked in. Refresh to see the existing shift.',
  SHIFT_CHANGED: 'The active shift changed. Refresh and review it before clocking out.',
  SHIFT_UNAVAILABLE: 'This shift is unavailable with your current school access.',
  TIMESHEET_REVIEW_REQUIRED: 'Only closed draft shifts can be corrected here. Use the native HR workflow for validated or open shifts.',
  INVALID_SHIFT_TIMES: 'Use a closed shift of up to 24 hours, with clock-out after clock-in and neither time in the future.',
  PENDING_ACTION: 'Resolve the unconfirmed action before starting another change.',
  BACKEND_UNAVAILABLE_RETRY_SAME_ACTION: 'Odoo has not confirmed the result. Do not submit a new action. Retry this same action to check its original receipt.',
};

export function explainHubError(code: string): string {
  return messages[code] || code.replaceAll('_', ' ').toLowerCase();
}

export function replacementBlockReason(original: {startsAt: string; future: boolean} | undefined, now: number): string | null {
  if (!original || !Number.isFinite(Date.parse(original.startsAt))) {
    return 'The original class could not be verified. Refresh or ask staff to review it before replacing the registration.';
  }
  if (!original.future || Date.parse(original.startsAt) <= now) {
    return 'The original class has already started and cannot be replaced. Keep its attendance history and use Add a class registration for an eligible future makeup class.';
  }
  return null;
}

/** Do not turn an acknowledged write into a failure when its follow-up read fails. */
export async function runHubAction(
  send: () => Promise<{plan?: string; membershipState?: string; startDate?: string; enrollmentId?: unknown; memberId?: string; after?: string; before?: string; reversal?: boolean; memberNumber?: string; cancelledBookingIds?: unknown[]; testId?: string; signedBy?: string; pdfStored?: boolean; creditNote?: string; payment?: string; recipients?: number; queued?: number; provider?: string; count?: number; changes?: unknown[]; promotions?: unknown[]; bookingsCreated?: number; bookingsCancelled?: number; checkoutUrl?: string; invoiceId?: string; invoiceNumber?: string; amount?: number; currency?: string; state?: string}>,
  refresh: () => Promise<void>,
  onAcknowledged: (feedback: ActionFeedback) => void,
): Promise<ActionFeedback> {
  let result: Awaited<ReturnType<typeof send>>;
  try {
    result = await send();
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const uncertain = error instanceof TypeError || error instanceof SyntaxError ||
      ['AbortError', 'TimeoutError'].includes(error instanceof Error ? error.name : '') ||
      ['BACKEND_UNAVAILABLE_RETRY_SAME_ACTION', 'BACKEND_UNAVAILABLE', 'CONNECTION_UNAVAILABLE', 'CONCURRENT_RETRY'].includes(code) || !code;
    return {kind: uncertain ? 'uncertain' : 'error', text: explainHubError(uncertain ? 'BACKEND_UNAVAILABLE_RETRY_SAME_ACTION' : code)};
  }
  const feedback: ActionFeedback = {
    kind: 'success',
    text: result.checkoutUrl ? 'Secure invoice checkout is ready. Payment has not been submitted.' :
      result.state==='ai_enabled' ? 'Live AI drafting passed the connection check and is enabled for this school.' :
      result.state==='student_created' ? `Student profile created in Odoo. Member number: ${result.memberNumber}. No membership, trial booking, portal access or message was created.` :
      result.state==='trial_reserved' ? 'Trial reserved in Odoo. The class registration is saved; the CRM stage was not changed and no message was sent.' :
      result.state==='trial_cancelled' ? 'Trial cancelled in Odoo. The class registration was cancelled and no message was sent.' :
      result.state==='trial_attended' ? 'Trial attendance saved in Odoo. The CRM stage was not changed and no offer was sent.' :
      result.state==='trial_no_show' ? 'No-show saved in Odoo. No automatic follow-up was scheduled.' :
      result.state==='trial_converted' ? `Converted in Odoo: ${result.plan} membership ${result.membershipState==='active'?'started today':`ready to start on ${result.startDate}`}. No payment, portal invitation or message.` :
      result.state==='attendance_recorded' ? `Attendance saved in Odoo: ${result.before} → ${result.after}.${result.reversal?' The original check-in record and receipt are kept; no class credit was refunded.':''}` :
      result.state==='waiver_signed' ? `Waiver signed by ${result.signedBy} and stored in Odoo${result.pdfStored ? ' with the signed PDF' : '. The signature is saved; the PDF could not be generated here'}. No message was sent.` :
      result.state==='refund_requested' ? 'Refund request saved for owner approval. No credit note was posted and no money was returned.' :
      result.state==='refund_approved' ? `Refund approved: credit note ${result.creditNote} posted in Odoo. Money has not been returned yet.` :
      result.state==='refund_payment_recorded' ? `Refund payment ${result.payment} recorded by staff in Odoo.` :
      result.state==='refund_cancelled' ? 'Refund request cancelled. No accounting entry was created.' :
      result.state==='consent_recorded' ? 'Consent saved in Odoo with its source and evidence. No message was sent.' :
      result.state==='broadcast_awaiting_approval' ? `Broadcast saved for approval with ${result.recipients ?? 0} recipients. Nothing is queued or sent yet.` :
      result.state==='broadcast_approved' ? `Broadcast approved: ${result.queued ?? 0} messages queued${result.provider==='not_configured'?'. No provider is connected, so nothing is sent':' for the provider. They count as sent only when the provider confirms'}.` :
      result.state==='broadcast_cancelled' ? 'Broadcast cancelled. Nothing was sent.' :
      result.state==='automation_paused' ? 'Automation paused in Odoo. It will not run until resumed.' :
      result.state==='automation_resumed' ? 'Automation resumed in Odoo.' :
      result.state==='guardian_pin_set' ? 'Kiosk PIN saved in Odoo as a secure hash. It was not sent anywhere; give it to the parent in person.' :
      result.state==='guardian_pin_revoked' ? 'Kiosk PIN turned off in Odoo. The parent can no longer check in at the kiosk with it.' :
      result.state==='testing_roster_saved' ? `Testing roster saved in Odoo with ${result.count ?? 0} students. No rank, invoice or message was created.` :
      result.state==='test_results_saved' ? `Test results saved in Odoo (${Array.isArray(result.changes)?result.changes.length:0} changed). No belt was awarded yet.` :
      result.state==='promotions_awarded' ? `Promotions saved in Odoo: ${Array.isArray(result.promotions)?result.promotions.length:0} belt awards. No message or invoice.` :
      result.state==='promotion_reversed' ? `Promotion reversed in Odoo: ${result.before} → ${result.after}. The award is kept in history with your reason.` :
      result.state==='archived' ? `Student archived in Odoo. ${Array.isArray(result.cancelledBookingIds)?result.cancelledBookingIds.length:0} future bookings were cancelled; attendance history is kept. Restore from Archived students.` :
      result.state==='restored' ? 'Student restored in Odoo. Previously cancelled bookings were not re-created.' :
      result.state==='photo_updated' ? 'Photo saved in Odoo.' :
      result.state==='photo_removed' ? 'Photo removed in Odoo.' :
      result.state==='course_roster_updated' ? `Course roster updated in Odoo: ${result.bookingsCreated ?? 0} bookings created, ${result.bookingsCancelled ?? 0} cancelled.` :
      result.state==='clocked_in' ? 'Clock-in confirmed in Odoo.' :
      result.state==='clocked_out' ? 'Clock-out confirmed in Odoo.' :
      result.state==='timesheet_corrected' ? 'Timesheet correction confirmed in Odoo. Payroll has not been approved.' :
      result.enrollmentId ? `Registration saved in Odoo. Receipt: ${result.enrollmentId}.` : 'Saved in Odoo.',
    ...(result.state==='testing_roster_saved' && result.testId ? {testing:{testId:result.testId}} : {}),
    ...(result.state==='student_created' && result.memberId && result.memberNumber ? {intake:{memberId:result.memberId,memberNumber:result.memberNumber}} : {}),
    ...(result.checkoutUrl && result.invoiceId && result.invoiceNumber && typeof result.amount==='number' && result.currency ?
      {checkout:{url:result.checkoutUrl,invoiceId:result.invoiceId,invoiceNumber:result.invoiceNumber,amount:result.amount,currency:result.currency}} : {}),
  };
  onAcknowledged(feedback);
  try {
    await refresh();
    return feedback;
  } catch {
    return {...feedback, refreshWarning: 'Saved successfully, but the latest screen data could not be loaded. Refresh to update the view; do not repeat this action.'};
  }
}
