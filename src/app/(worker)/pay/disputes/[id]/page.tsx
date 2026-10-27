import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DisputeView } from './dispute-view';

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: d } = await supabase.from('wage_disputes').select('*').eq('id', id).eq('worker_id', ctx.userId).maybeSingle();
  if (!d) notFound();
  const [events, slip] = await Promise.all([
    supabase.from('dispute_events').select('id, from_status, to_status, body, actor_kind, created_at').eq('dispute_id', id).order('created_at'),
    supabase.from('payslips').select('id, period_start, period_end').eq('id', d.payslip_id).maybeSingle(),
  ]);
  return (
    <DisputeView
      dispute={{
        id: d.id,
        status: d.status,
        componentKind: d.component_kind,
        claimedPaise: d.claimed_difference_paise,
        description: d.description,
        createdAt: d.created_at,
        payslipId: d.payslip_id,
        periodStart: slip.data?.period_start ?? null,
        periodEnd: slip.data?.period_end ?? null,
      }}
      events={(events.data ?? []).map((e) => ({ id: e.id, to: e.to_status, body: e.body, actor: e.actor_kind, at: e.created_at }))}
    />
  );
}
