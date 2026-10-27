'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/app/login/actions';
import { requireUser } from '@/lib/auth';
import { mapRpcError } from '@/lib/rpc-error';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  disputeId: z.uuid(),
  to: z.enum(['acknowledged', 'responded', 'resolved']),
  body: z.string().trim().max(2000).optional(),
});

/** Employer-side moves only. transition_dispute refuses 'resolved' until the worker has accepted. */
export async function employerTransition(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_dispute', {
    p_dispute: parsed.data.disputeId,
    p_to: parsed.data.to,
    p_body: (parsed.data.body ?? null) as string,
  });
  if (error) return { ok: false, error: mapRpcError(error) };
  revalidatePath('/review/disputes', 'layout');
  return { ok: true };
}
