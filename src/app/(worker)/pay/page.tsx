import { requireUser, workerOrg } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadMonth, parseMonth, shiftMonth } from './data';
import { PayView } from './pay-view';

export default async function PayPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = parseMonth((await searchParams).month);
  const ctx = await requireUser();
  const org = workerOrg(ctx);
  const supabase = await createClient();
  const data = await loadMonth(supabase, ctx.userId, org?.org_id ?? null, month);
  const r = data.rules;
  return (
    <PayView
      month={month}
      prev={shiftMonth(month, -1)}
      next={shiftMonth(month, 1)}
      orgName={org?.org.name ?? null}
      rules={r && { label: r.label, version: r.version, sourceNote: r.sourceNote, payBasis: r.payBasis, otMultiplierPct: r.otMultiplierPct, longShiftMinutes: r.longShiftMinutes, minRestMinutes: r.minRestMinutes }}
      result={data.result}
      invalidShift={data.invalidShiftId !== null}
      payslips={data.payslips.map((p) => ({ id: p.id, periodStart: p.period_start, periodEnd: p.period_end, status: p.status, netPaise: p.net_paise, paidOn: p.paid_on }))}
    />
  );
}
