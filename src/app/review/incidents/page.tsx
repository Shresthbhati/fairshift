import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { queueOrder } from '@/domain/incidents/transitions';
import { QueueView } from './queue-view';

export default async function IncidentsPage() {
  const ctx = await requireUser();
  const t = await getT();
  if (!hasRole(ctx, ['investigator'])) return <ForbiddenState roles={t('common.roles.investigator')} />;
  const supabase = await createClient();
  const { data } = await supabase.from('incidents').select('id, reference_code, category, severity, status, mode, submitted_on');
  return <QueueView rows={queueOrder(data ?? []).map((r) => ({ id: r.id, ref: r.reference_code, category: r.category, severity: r.severity, status: r.status, mode: r.mode, date: r.submitted_on }))} />;
}
