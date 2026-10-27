'use server';

import { createHash } from 'node:crypto';
import type { ActionResult } from '@/app/login/actions';
import { rateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase/admin';
import { trackRespondSchema, trackSchema } from '@/app/(worker)/report/schemas';

export type TrackData = {
  reference_code: string;
  category: string;
  severity: string;
  status: string;
  submitted_on: string;
  events: { kind: string; to_status: string | null; body: string | null; created_at: string }[];
};

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const NOT_FOUND = 'report.track.notFound'; // one message for a wrong reference, a wrong code, or both

async function lookup(reference: string, token: string): Promise<TrackData | null> {
  const { data } = await getAdminClient().rpc('get_incident_by_token', { p_token_hash: hash(token) });
  const row = data as unknown as TrackData | null;
  return row && row.reference_code === reference ? row : null;
}

/** Public: reference + tracking code → current status and reporter-visible updates. No sign-in, no account link. */
export async function trackIncident(input: unknown): Promise<ActionResult<TrackData>> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: NOT_FOUND };
  if (!rateLimit(`track:${parsed.data.reference}`, 30)) return { ok: false, error: 'common.errors.rateLimited' };
  const row = await lookup(parsed.data.reference, parsed.data.token);
  return row ? { ok: true, data: row } : { ok: false, error: NOT_FOUND };
}

export async function trackRespond(input: unknown): Promise<ActionResult<TrackData>> {
  const parsed = trackRespondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: NOT_FOUND };
  const { reference, token, action, body } = parsed.data;
  if (!rateLimit(`track:${reference}`, 30)) return { ok: false, error: 'common.errors.rateLimited' };
  if (!(await lookup(reference, token))) return { ok: false, error: NOT_FOUND };
  const { error } = await getAdminClient().rpc('anonymous_respond', { p_token_hash: hash(token), p_action: action, p_body: (body ?? null) as string });
  if (error) {
    if (/invalid_transition/.test(error.message)) return { ok: false, error: 'common.errors.invalidStep' };
    if (/body_required/.test(error.message)) return { ok: false, error: 'common.errors.bodyRequired' };
    return { ok: false, error: 'common.errors.generic' };
  }
  const fresh = await lookup(reference, token);
  return fresh ? { ok: true, data: fresh } : { ok: false, error: NOT_FOUND };
}
