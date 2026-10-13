/** UI feedback only. Odoo remains authoritative for eligibility and writes. */
export type ActionFeedback = {
  kind: 'success' | 'error' | 'uncertain';
  text: string;
  refreshWarning?: string;
  intake?: {memberId: string; memberNumber: string};
  checkout?: {url: string; invoiceId: string; invoiceNumber: string; amount: number; currency: string};
};

const messages: Record<string, string> = {
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
  send: () => Promise<{enrollmentId?: unknown; memberId?: string; after?: string; before?: string; reversal?: boolean; memberNumber?: string; cancelledBookingIds?: unknown[]; bookingsCreated?: number; bookingsCancelled?: number; checkoutUrl?: string; invoiceId?: string; invoiceNumber?: string; amount?: number; currency?: string; state?: string}>,
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
      result.state==='attendance_recorded' ? `Attendance saved in Odoo: ${result.before} → ${result.after}.${result.reversal?' The original check-in record and receipt are kept; no class credit was refunded.':''}` :
      result.state==='archived' ? `Student archived in Odoo. ${Array.isArray(result.cancelledBookingIds)?result.cancelledBookingIds.length:0} future bookings were cancelled; attendance history is kept. Restore from Archived students.` :
      result.state==='restored' ? 'Student restored in Odoo. Previously cancelled bookings were not re-created.' :
      result.state==='photo_updated' ? 'Photo saved in Odoo.' :
      result.state==='photo_removed' ? 'Photo removed in Odoo.' :
      result.state==='course_roster_updated' ? `Course roster updated in Odoo: ${result.bookingsCreated ?? 0} bookings created, ${result.bookingsCancelled ?? 0} cancelled.` :
      result.state==='clocked_in' ? 'Clock-in confirmed in Odoo.' :
      result.state==='clocked_out' ? 'Clock-out confirmed in Odoo.' :
      result.state==='timesheet_corrected' ? 'Timesheet correction confirmed in Odoo. Payroll has not been approved.' :
      result.enrollmentId ? `Registration saved in Odoo. Receipt: ${result.enrollmentId}.` : 'Saved in Odoo.',
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
