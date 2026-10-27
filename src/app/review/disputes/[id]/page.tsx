import { notFound } from 'next/navigation';
import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { DisputeView } from './dispute-view';

export default async function ReviewDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const t = await getT();
  if (!hasRole(ctx, ['payroll', 'org_admin'])) return <ForbiddenState roles={`${t('common.roles.payroll')} / ${t('common.roles.org_admin')}`} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: d } = await supabase.from('wage_disputes').select('*, profiles!wage_disputes_worker_id_fkey(display_name)').eq('id', id).maybeSingle();
  if (!d) notFound();
  const [events, calc] = await Promise.all([
    supabase.from('dispute_events').select('id, to_status, body, actor_kind, created_at').eq('dispute_id', id).order('created_at'),
    d.calculation_id ? supabase.from('wage_calculations').select('engine_version, total_paise').eq('id', d.calculation_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <DisputeView
      dispute={{ id: d.id, worker: (d.profiles as unknown as { display_name: string } | null)?.display_name ?? '—', status: d.status, component: d.component_kind, paise: d.claimed_difference_paise, description: d.description, at: d.created_at }}
      snapshot={calc.data ? { engine: calc.data.engine_version, totalPaise: calc.data.total_paise } : null}
      events={(events.data ?? []).map((e) => ({ id: e.id, to: e.to_status, body: e.body, actor: e.actor_kind, at: e.created_at }))}
    />
  );
}
