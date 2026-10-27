'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/app/login/actions';
import { requireUser } from '@/lib/auth';
import { mapRpcError } from '@/lib/rpc-error';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  incidentId: z.uuid(),
  to: z.enum(['acknowledged', 'investigating', 'action_taken', 'resolved', 'closed_no_action']),
  body: z.string().trim().max(2000).optional(),
  visible: z.boolean().default(true),
});

/** Investigator step. Allowed moves and note rules are enforced by transition_incident in Postgres. */
export async function transition(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_incident', {
    p_incident: parsed.data.incidentId,
    p_to: parsed.data.to,
    p_body: (parsed.data.body ?? null) as string,
    p_visible: parsed.data.visible,
  });
  if (error) return { ok: false, error: mapRpcError(error) };
  revalidatePath('/review/incidents', 'layout');
  return { ok: true };
}
