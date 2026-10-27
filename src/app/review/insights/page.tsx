import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, membershipFor, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { InsightsView } from './insights-view';

export default async function InsightsPage() {
  const ctx = await requireUser();
  const t = await getT();
  const m = membershipFor(ctx, ['org_admin', 'investigator']);
  if (!m || !hasRole(ctx, ['org_admin', 'investigator'])) return <ForbiddenState roles={`${t('common.roles.org_admin')} / ${t('common.roles.investigator')}`} />;
  const supabase = await createClient();
  // Counts only, with groups smaller than 5 merged or dropped inside the database function.
  const { data } = await supabase.rpc('incident_insights', { p_org: m.org_id });
  return <InsightsView rows={(data ?? []).map((r) => ({ category: r.category, open: r.open_count, closed: r.closed_count, total: r.total }))} />;
}
