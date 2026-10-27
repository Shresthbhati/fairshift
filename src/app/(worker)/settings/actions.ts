'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/app/login/actions';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const nameSchema = z.object({ name: z.string().trim().min(1).max(80) });
const joinSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,40}$/) });

export async function updateName(input: unknown): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'auth.signup.nameRequired' };
  const ctx = await requireUser();
  const { error } = await (await createClient()).from('profiles').update({ display_name: parsed.data.name }).eq('id', ctx.userId);
  if (error) return { ok: false, error: 'common.errors.generic' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Joins an employer as a worker with its code. join_org gives a generic error for any unknown code. */
export async function joinOrg(input: unknown): Promise<ActionResult<{ org: string }>> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'auth.settings.joinInvalid' };
  await requireUser();
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc('join_org', { p_code: parsed.data.code });
  if (error || !orgId) return { ok: false, error: 'auth.settings.joinInvalid' };
  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).maybeSingle();
  revalidatePath('/', 'layout');
  return { ok: true, data: { org: org?.name ?? '' } };
}
