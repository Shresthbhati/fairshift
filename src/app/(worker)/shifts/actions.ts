'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/login/actions';
import { requireUser, workerOrg } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { endShiftSchema, manualShiftSchema, manualShiftWindow, startShiftSchema } from './schemas';

const refresh = () => {
  revalidatePath('/shifts');
  revalidatePath('/home');
  revalidatePath('/pay');
};

/** Start time is taken from the server clock, never from the browser. A repeated client_request_id is ignored. */
export async function startShift(input: unknown): Promise<ActionResult> {
  const parsed = startShiftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  const ctx = await requireUser();
  const org = workerOrg(ctx);
  if (!org) return { ok: false, error: 'common.errors.noOrg' };
  const supabase = await createClient();
  const { error } = await supabase.from('shifts').upsert(
    {
      worker_id: ctx.userId,
      org_id: org.org_id,
      started_at: new Date().toISOString(),
      status: 'open',
      time_source: 'server_clock',
      source: 'worker',
      client_request_id: parsed.data.clientRequestId,
    },
    { onConflict: 'client_request_id', ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.code === '23505' ? 'shifts.errors.alreadyOpen' : 'common.errors.generic' };
  refresh();
  return { ok: true };
}

export async function endShift(input: unknown): Promise<ActionResult> {
  const parsed = endShiftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: shift } = await supabase
    .from('shifts')
    .select('id, started_at, ended_at')
    .eq('id', parsed.data.shiftId)
    .eq('worker_id', ctx.userId)
    .maybeSingle();
  if (!shift) return { ok: false, error: 'common.errors.notFound' };
  if (shift.ended_at) return { ok: true }; // already ended: a double tap or retry is harmless

  const now = new Date();
  const duration = now.getTime() - Date.parse(shift.started_at);
  if (duration > 24 * 3_600_000) return { ok: false, error: 'shifts.errors.tooLong' };
  if (parsed.data.breakMinutes * 60_000 >= duration) return { ok: false, error: 'shifts.errors.breakTooLong' };

  const { error } = await supabase
    .from('shifts')
    .update({ ended_at: now.toISOString(), break_minutes: parsed.data.breakMinutes, status: 'recorded' })
    .eq('id', shift.id)
    .is('ended_at', null);
  if (error) return { ok: false, error: 'common.errors.generic' };
  refresh();
  return { ok: true };
}

export async function addManualShift(input: unknown): Promise<ActionResult> {
  const parsed = manualShiftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  const window = manualShiftWindow(parsed.data);
  if ('error' in window) return { ok: false, error: window.error };
  const ctx = await requireUser();
  const org = workerOrg(ctx);
  if (!org) return { ok: false, error: 'common.errors.noOrg' };
  const supabase = await createClient();
  const { error } = await supabase.from('shifts').upsert(
    {
      worker_id: ctx.userId,
      org_id: org.org_id,
      started_at: window.startedAt,
      ended_at: window.endedAt,
      break_minutes: parsed.data.breakMinutes,
      note: parsed.data.note || null,
      status: 'recorded',
      time_source: 'manual_entry',
      source: 'worker',
      client_request_id: parsed.data.clientRequestId,
    },
    { onConflict: 'client_request_id', ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: 'common.errors.generic' };
  refresh();
  return { ok: true };
}
