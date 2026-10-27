'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/login/actions';
import { compareWithPayslip, ENGINE_VERSION, type PayslipComponent } from '@/domain/pay';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';
import { loadMonth, monthBounds } from '../../data';
import { submitDisputeSchema } from './schemas';

/**
 * Raises a payslip question. The estimate and the claimed difference are recomputed here on the server
 * (nothing numeric is trusted from the browser), and a snapshot of the calculation is stored first so
 * both sides can later look at exactly the same numbers.
 */
export async function submitDispute(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = submitDisputeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'pay.disputes.errors.tooShort' };
  const v = parsed.data;
  const ctx = await requireUser();
  const supabase = await createClient();

  const again = await supabase.from('wage_disputes').select('id').eq('client_request_id', v.clientRequestId).maybeSingle();
  if (again.data) return { ok: true, data: { id: again.data.id } }; // retry of the same submission

  const { data: slip } = await supabase.from('payslips').select('*').eq('id', v.payslipId).eq('worker_id', ctx.userId).maybeSingle();
  if (!slip) return { ok: false, error: 'common.errors.notFound' };

  const month = slip.period_start.slice(0, 7);
  const b = monthBounds(month);
  if (slip.period_start !== b.start || slip.period_end !== b.end) return { ok: false, error: 'common.errors.invalid' };
  const data = await loadMonth(supabase, ctx.userId, slip.org_id, month);
  if (!data.result || !data.rules) return { ok: false, error: 'pay.noRule' };

  const rows = compareWithPayslip(data.result, { components: slip.components as unknown as PayslipComponent[] });
  const row = rows.find((r) => r.kind === v.componentKind);
  const claimed = row ? row.differencePaise : data.result.totalPaise - slip.gross_paise;

  const snapshot = await supabase
    .from('wage_calculations')
    .insert({
      worker_id: ctx.userId,
      org_id: slip.org_id,
      rule_set_id: data.rules.id,
      engine_version: ENGINE_VERSION,
      period_start: slip.period_start,
      period_end: slip.period_end,
      inputs: { rules: data.rules, shifts: data.shifts } as unknown as NonNullable<Json>,
      result: data.result as unknown as NonNullable<Json>,
      total_paise: data.result.totalPaise,
    })
    .select('id')
    .single();
  if (snapshot.error) return { ok: false, error: 'common.errors.generic' };

  const created = await supabase
    .from('wage_disputes')
    .insert({
      worker_id: ctx.userId,
      org_id: slip.org_id,
      payslip_id: slip.id,
      calculation_id: snapshot.data.id,
      component_kind: v.componentKind,
      claimed_difference_paise: claimed,
      description: v.description,
      client_request_id: v.clientRequestId,
    })
    .select('id')
    .single();
  if (created.error) {
    if (created.error.code === '23505') {
      const dup = await supabase.from('wage_disputes').select('id').eq('client_request_id', v.clientRequestId).maybeSingle();
      if (dup.data) return { ok: true, data: { id: dup.data.id } };
    }
    return { ok: false, error: 'common.errors.generic' };
  }
  revalidatePath(`/pay/payslips/${slip.id}`);
  revalidatePath('/home');
  return { ok: true, data: { id: created.data.id } };
}
