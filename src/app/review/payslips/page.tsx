import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, membershipFor, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { PayslipsView } from './payslips-view';

const name = (p: unknown) => (p as { display_name: string } | null)?.display_name ?? '—';

export default async function ReviewPayslipsPage() {
  const ctx = await requireUser();
  const t = await getT();
  if (!hasRole(ctx, ['payroll', 'org_admin'])) return <ForbiddenState roles={`${t('common.roles.payroll')} / ${t('common.roles.org_admin')}`} />;
  const supabase = await createClient();
  const org = membershipFor(ctx, ['payroll', 'org_admin']);
  const canIssue = !!membershipFor(ctx, ['payroll']);
  const [slips, workers] = await Promise.all([
    supabase.from('payslips').select('id, period_start, gross_paise, net_paise, status, profiles!payslips_worker_id_fkey(display_name)').order('period_start', { ascending: false }),
    org
      ? supabase.from('memberships').select('user_id, profiles!memberships_user_id_fkey(display_name)').eq('org_id', org.org_id).eq('role', 'worker').eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ]);
  return (
    <PayslipsView
      canIssue={canIssue}
      workers={(workers.data ?? []).map((w) => ({ id: w.user_id, name: name(w.profiles) }))}
      slips={(slips.data ?? []).map((s) => ({ id: s.id, worker: name(s.profiles), month: s.period_start, gross: s.gross_paise, net: s.net_paise, status: s.status }))}
    />
  );
}
