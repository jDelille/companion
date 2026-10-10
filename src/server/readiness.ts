import { authorized, configFrom, fail, handle, mintCookie, type Fetcher } from './odoo-gateway';
import { validWorkflowData, workflowCall } from './companion-workflow';

const headers = {'cache-control':'private, no-store', vary:'Cookie'};
export function releaseInfo(env: NodeJS.ProcessEnv) {
  const revision = env.DOJANG_RELEASE_SHA || env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA || '';
  return {revision: /^[a-f0-9]{40}$/.test(revision) ? revision : null,
    mode: env.DOJANG_INTEGRATION_MODE === 'odoo-test' && env.NEXT_PUBLIC_DEMO_MODE !== 'true' ? 'odoo-test'
      : env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'demo' : 'unconfigured'};
}

/** Public liveness is deliberately not a backend or production readiness claim. */
export function liveness(env: NodeJS.ProcessEnv) {
  return Response.json({service:'dojang-companion', status:'reachable', ...releaseInfo(env),
    backend:'not_checked', readiness:'/api/integration/readiness', requires:'paired_staff_session'}, {headers});
}

export async function readiness(request: Request, env: NodeJS.ProcessEnv, fetcher: Fetcher = fetch) {
  let c;
  try { c = configFrom(env); } catch { return fail('CAPABILITY_DISABLED'); }
  if (!authorized(c, 'staff', request.headers.get('cookie') || '')) return fail('FORBIDDEN', undefined, 403);
  // Probe both role credentials, but expose only counts and capability booleans.
  const probe = (operation: 'sessions' | 'members', role: 'kiosk' | 'staff') => handle(
    new Request(c.origin, {headers:{cookie:`dojang_${role}_test=${mintCookie(c,role)}`}}), c, operation, undefined, fetcher);
  try {
    const [sessions, members, context, capabilities] = await Promise.all([
      probe('sessions','kiosk'), probe('members','staff'),
      workflowCall(c,'context',{},fetcher), workflowCall(c,'readiness',{},fetcher),
    ]);
    if (!sessions.ok || !members.ok || !validWorkflowData(context)) throw new Error('Backend unavailable');
    const expectedBooleans = ['followUpEnabled','aiEnabled','aiCredentialConfigured','ebGymInstalled'];
    if (capabilities.schema !== 'dojang-readiness-v1' || expectedBooleans.some(k=>typeof capabilities[k] !== 'boolean')) throw new Error('Invalid capabilities');
    const sessionRows: unknown = await sessions.json();
    const memberRows: unknown = await members.json();
    if (!Array.isArray(sessionRows) || !Array.isArray(memberRows)) throw new Error('Invalid reads');
    const hasFixtures = sessionRows.length > 0 && memberRows.length > 0;
    const usable = hasFixtures && capabilities.followUpEnabled;
    return Response.json({service:'dojang-companion', ...releaseInfo(env),
      status:usable ? 'connected_test_ready' : 'connected_test_incomplete',
      backend:'verified_read_round_trip',
      checks:{kioskRead:true,staffRead:true,companionRead:true,sessionCount:sessionRows.length,memberCount:memberRows.length},
      capabilities:{internalFollowUp:capabilities.followUpEnabled,
        ai:capabilities.aiEnabled && capabilities.aiCredentialConfigured ? 'configured_not_exercised' : 'not_configured',
        ebGym:capabilities.ebGymInstalled ? 'installed_not_integration_verified' : 'not_installed',
        externalMessaging:'not_implemented',makeupBooking:'not_implemented',identity:'paired_test_device'},
      productionReady:false, checkedAt:new Date().toISOString()}, {status:usable ? 200 : 503,headers});
  } catch { return fail('CAPABILITY_DISABLED'); }
}
