'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/app/login/actions';
import { manualShiftWindow } from '@/app/(worker)/shifts/schemas';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const confirmSchema = z.object({ shiftId: z.uuid() });
const editSchema = z.object({
  shiftId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endNextDay: z.boolean().default(false),
  breakMinutes: z.coerce.number().int().min(0).max(720),
});

/** Supervisor confirms a recorded shift. Only supervisors pass the shifts_supervisor_update policy. */
export async function confirmShift(input: unknown): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('shifts').update({ status: 'confirmed' }).eq('id', parsed.data.shiftId).eq('status', 'recorded').select('id');
  if (error || !data?.length) return { ok: false, error: 'common.errors.forbidden' };
  revalidatePath('/review/attendance');
  return { ok: true };
}

/** Allowed for supervisors, but every change is written to audit_events with old and new values, visible to the worker. */
export async function editShift(input: unknown): Promise<ActionResult> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  const v = parsed.data;
  const window = manualShiftWindow(v, Number.MAX_SAFE_INTEGER); // past shifts only: no future-start check
  if ('error' in window) return { ok: false, error: window.error };
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shifts')
    .update({ started_at: window.startedAt, ended_at: window.endedAt, break_minutes: v.breakMinutes })
    .eq('id', v.shiftId)
    .select('id');
  if (error || !data?.length) return { ok: false, error: 'common.errors.forbidden' };
  revalidatePath('/review/attendance');
  return { ok: true };
}
