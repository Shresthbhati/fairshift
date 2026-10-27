'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/login/actions';
import { monthBounds } from '@/app/(worker)/pay/data';
import { membershipFor, requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';
import { issuePayslipSchema, rupeesToPaise } from './schemas';

/** Payroll issues a payslip for one worker and one calendar month. Gross and net are computed here, in integer paise. */
export async function issuePayslip(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = issuePayslipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'review.payslips.errors.amount' };
  const v = parsed.data;
  const ctx = await requireUser();
  const org = membershipFor(ctx, ['payroll']);
  if (!org) return { ok: false, error: 'common.errors.forbidden' };
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('memberships').select('id').eq('org_id', org.org_id).eq('user_id', v.workerId).eq('role', 'worker').eq('status', 'active').maybeSingle();
  if (!member) return { ok: false, error: 'common.errors.forbidden' };

  const components = v.components.map((c) => ({ label: c.label, kind: c.kind, amount_paise: rupeesToPaise(c.amount) as number }));
  const deductions = v.deductions.map((d) => ({ label: d.label, amount_paise: rupeesToPaise(d.amount) as number }));
  const gross = components.reduce((n, c) => n + c.amount_paise, 0);
  const net = gross - deductions.reduce((n, d) => n + d.amount_paise, 0);
  const b = monthBounds(v.month);

  const { data, error } = await supabase
    .from('payslips')
    .insert({
      worker_id: v.workerId, org_id: org.org_id, period_start: b.start, period_end: b.end,
      components: components as unknown as NonNullable<Json>, deductions: deductions as unknown as NonNullable<Json>,
      gross_paise: gross, net_paise: net, status: v.status, paid_on: v.status === 'paid' ? (v.paidOn ?? null) : null,
      created_by: ctx.userId,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.code === '23505' ? 'review.payslips.errors.duplicate' : 'common.errors.generic' };
  revalidatePath('/review/payslips');
  return { ok: true, data: { id: data.id } };
}
