import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { DisputesView } from './disputes-view';

export default async function DisputesPage() {
  const ctx = await requireUser();
  const t = await getT();
  if (!hasRole(ctx, ['payroll', 'org_admin'])) return <ForbiddenState roles={`${t('common.roles.payroll')} / ${t('common.roles.org_admin')}`} />;
  const supabase = await createClient();
  const { data } = await supabase
    .from('wage_disputes')
    .select('id, component_kind, claimed_difference_paise, status, created_at, profiles!wage_disputes_worker_id_fkey(display_name)')
    .order('created_at', { ascending: false });
  return (
    <DisputesView
      rows={(data ?? []).map((d) => ({
        id: d.id, worker: (d.profiles as unknown as { display_name: string } | null)?.display_name ?? '—',
        component: d.component_kind, paise: d.claimed_difference_paise, status: d.status, at: d.created_at,
      }))}
    />
  );
}
