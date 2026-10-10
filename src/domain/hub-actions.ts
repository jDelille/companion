/** UI feedback only. Odoo remains authoritative for eligibility and writes. */
export type ActionFeedback = {
  kind: 'success' | 'error' | 'uncertain';
  text: string;
  refreshWarning?: string;
};

const messages: Record<string, string> = {
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
  PENDING_ACTION: 'Resolve the unconfirmed action before starting another booking.',
  BACKEND_UNAVAILABLE_RETRY_SAME_ACTION: 'Odoo has not confirmed the result. Do not create another booking. Retry this same action to check its original receipt.',
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
  send: () => Promise<{enrollmentId?: unknown}>,
  refresh: () => Promise<void>,
  onAcknowledged: (feedback: ActionFeedback) => void,
): Promise<ActionFeedback> {
  let result: {enrollmentId?: unknown};
  try {
    result = await send();
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const uncertain = error instanceof TypeError || error instanceof SyntaxError ||
      ['AbortError', 'TimeoutError'].includes(error instanceof Error ? error.name : '') ||
      ['BACKEND_UNAVAILABLE_RETRY_SAME_ACTION', 'BACKEND_UNAVAILABLE', 'CONNECTION_UNAVAILABLE'].includes(code) || !code;
    return {kind: uncertain ? 'uncertain' : 'error', text: explainHubError(uncertain ? 'BACKEND_UNAVAILABLE_RETRY_SAME_ACTION' : code)};
  }
  const feedback: ActionFeedback = {
    kind: 'success',
    text: result.enrollmentId ? `Registration saved in Odoo. Receipt: ${result.enrollmentId}.` : 'Saved in Odoo.',
  };
  onAcknowledged(feedback);
  try {
    await refresh();
    return feedback;
  } catch {
    return {...feedback, refreshWarning: 'Saved successfully, but the latest screen data could not be loaded. Refresh to update the view; do not submit this booking again.'};
  }
}
