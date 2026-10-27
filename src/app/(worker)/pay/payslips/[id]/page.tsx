import { notFound } from 'next/navigation';
import { compareWithPayslip, type PayslipComponent } from '@/domain/pay';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadMonth, monthBounds } from '../../data';
import { PayslipView } from './payslip-view';

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: slip } = await supabase.from('payslips').select('*').eq('id', id).eq('worker_id', ctx.userId).maybeSingle();
  if (!slip) notFound();

  const [{ data: org }, { data: disputes }] = await Promise.all([
    supabase.from('organisations').select('name').eq('id', slip.org_id).maybeSingle(),
    supabase.from('wage_disputes').select('id, status, created_at').eq('payslip_id', slip.id).order('created_at', { ascending: false }),
  ]);

  // The comparison only makes sense for a payslip that covers exactly one calendar month.
  const month = slip.period_start.slice(0, 7);
  const b = monthBounds(month);
  const components = slip.components as unknown as PayslipComponent[];
  let rows = null;
  if (slip.period_start === b.start && slip.period_end === b.end) {
    const data = await loadMonth(supabase, ctx.userId, slip.org_id, month);
    if (data.result) rows = compareWithPayslip(data.result, { components });
  }

  return (
    <PayslipView
      month={month}
      rows={rows}
      disputes={(disputes ?? []).map((d) => ({ id: d.id, status: d.status, createdAt: d.created_at }))}
      slip={{
        id: slip.id,
        orgName: org?.name ?? '',
        periodStart: slip.period_start,
        periodEnd: slip.period_end,
        components,
        deductions: slip.deductions as unknown as { label: string; amount_paise: number }[],
        grossPaise: slip.gross_paise,
        netPaise: slip.net_paise,
        status: slip.status as 'issued' | 'paid',
        paidOn: slip.paid_on,
      }}
    />
  );
}
