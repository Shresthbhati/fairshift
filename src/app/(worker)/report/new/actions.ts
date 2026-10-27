'use server';

import { createHash, randomBytes } from 'node:crypto';
import type { ActionResult } from '@/app/login/actions';
import { membershipFor, requireUser, type Ctx } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { mapRpcError } from '@/lib/rpc-error';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { submitAnonymousSchema, submitNamedSchema } from '../schemas';

const ANY_ROLE = ['worker', 'supervisor', 'payroll', 'investigator', 'org_admin'] as const;
const orgOf = (ctx: Ctx) => membershipFor(ctx, ['worker']) ?? membershipFor(ctx, [...ANY_ROLE]);

// Nothing in this file logs request bodies, descriptions or tokens (privacy rule).

/** Named or confidential: written by the submit_incident function, which records the reporter in a separate table. */
export async function submitNamed(input: unknown): Promise<ActionResult<{ id: string; reference: string }>> {
  const parsed = submitNamedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  const ctx = await requireUser();
  const org = orgOf(ctx);
  if (!org) return { ok: false, error: 'common.errors.noOrg' };
  if (!rateLimit(`incident:${ctx.userId}`, 5)) return { ok: false, error: 'common.errors.rateLimited' };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_incident', {
    p_org: org.org_id,
    p_mode: v.mode,
    p_category: v.category,
    p_severity: v.severity,
    p_description: v.description,
    p_location: (v.location ?? null) as string,
  });
  const row = data?.[0];
  if (error || !row) return { ok: false, error: mapRpcError(error) };
  return { ok: true, data: { id: row.id, reference: row.reference_code } };
}

/**
 * Anonymous: the signed-in user is only used to prove they belong to the organisation. The report is then written
 * with the service-role client and a hash of a fresh random token, so no row anywhere links it to this user.
 * The token goes back to the browser once and is never stored in readable form.
 */
export async function submitAnonymous(input: unknown): Promise<ActionResult<{ reference: string; token: string }>> {
  const parsed = submitAnonymousSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  const ctx = await requireUser();
  const org = orgOf(ctx); // read through the user's own RLS-scoped session
  if (!org) return { ok: false, error: 'common.errors.noOrg' };
  if (!rateLimit(`incident:${ctx.userId}`, 5)) return { ok: false, error: 'common.errors.rateLimited' };
  const v = parsed.data;
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await getAdminClient().rpc('submit_anonymous_incident', {
    p_org: org.org_id,
    p_category: v.category,
    p_severity: v.severity,
    p_description: v.description,
    p_location: (v.location ?? null) as string,
    p_token_hash: tokenHash,
  });
  if (error || !data) return { ok: false, error: 'common.errors.generic' };
  return { ok: true, data: { reference: data, token } };
}
