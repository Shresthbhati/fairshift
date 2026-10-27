import { requireUser, workerOrg } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { monthBounds, parseMonth, shiftMonth } from '../pay/data';
import { ShiftsView } from './shifts-view';

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = parseMonth((await searchParams).month);
  const ctx = await requireUser();
  const supabase = await createClient();
  const b = monthBounds(month);
  const [list, open] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, started_at, ended_at, break_minutes, source, time_source, status')
      .eq('worker_id', ctx.userId)
      .gte('started_at', b.fromIso)
      .lt('started_at', b.toIso)
      .order('started_at', { ascending: false }),
    supabase.from('shifts').select('id, started_at').eq('worker_id', ctx.userId).is('ended_at', null).maybeSingle(),
  ]);
  return (
    <ShiftsView
      month={month}
      prev={shiftMonth(month, -1)}
      next={shiftMonth(month, 1)}
      canRecord={!!workerOrg(ctx)}
      open={open.data ? { id: open.data.id, startedAt: open.data.started_at } : null}
      rows={(list.data ?? []).map((s) => ({
        id: s.id,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        breakMinutes: s.break_minutes,
        source: s.source,
        timeSource: s.time_source,
        status: s.status,
      }))}
    />
  );
}
