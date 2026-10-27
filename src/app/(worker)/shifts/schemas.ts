import { z } from 'zod';

const HOUR_MS = 3_600_000;

export const startShiftSchema = z.object({ clientRequestId: z.uuid() });

export const endShiftSchema = z.object({
  shiftId: z.uuid(),
  breakMinutes: z.coerce.number().int().min(0).max(720),
});

export const manualShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endNextDay: z.boolean().default(false),
  breakMinutes: z.coerce.number().int().min(0).max(720),
  note: z.string().trim().max(500).optional(),
  clientRequestId: z.uuid(),
});

export type ManualShiftInput = z.infer<typeof manualShiftSchema>;

/**
 * Turns IST wall-clock form values into UTC ISO timestamps, or returns an i18n error key.
 * <input type="date"> + <input type="time"> carry no zone, so +05:30 is applied explicitly.
 */
export function manualShiftWindow(
  v: Pick<ManualShiftInput, 'date' | 'start' | 'end' | 'endNextDay' | 'breakMinutes'>,
  now = Date.now(),
): { startedAt: string; endedAt: string } | { error: string } {
  const startMs = Date.parse(`${v.date}T${v.start}:00+05:30`);
  const endDay = v.endNextDay ? new Date(Date.parse(`${v.date}T12:00:00+05:30`) + 24 * HOUR_MS).toISOString().slice(0, 10) : v.date;
  const endMs = Date.parse(`${endDay}T${v.end}:00+05:30`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return { error: 'common.errors.invalid' };
  if (startMs > now + 5 * 60_000) return { error: 'shifts.errors.inFuture' };
  if (endMs <= startMs) return { error: 'shifts.errors.endBeforeStart' };
  if (endMs - startMs > 24 * HOUR_MS) return { error: 'shifts.errors.tooLong' };
  if (v.breakMinutes * 60_000 >= endMs - startMs) return { error: 'shifts.errors.breakTooLong' };
  return { startedAt: new Date(startMs).toISOString(), endedAt: new Date(endMs).toISOString() };
}
