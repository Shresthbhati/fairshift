import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReportsView } from './reports-view';

export default async function ReportPage() {
  const ctx = await requireUser();
  const supabase = await createClient();
  // Only reports this person filed under their own name (named or confidential). Anonymous ones have no link to anyone.
  const { data } = await supabase
    .from('incident_reporters')
    .select('incidents(reference_code, category, status, mode, submitted_on)')
    .eq('reporter_id', ctx.userId);
  const reports = (data ?? [])
    .map((r) => r.incidents as unknown as { reference_code: string; category: string; status: string; mode: string; submitted_on: string } | null)
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => b.submitted_on.localeCompare(a.submitted_on))
    .map((r) => ({ ref: r.reference_code, category: r.category, status: r.status, mode: r.mode, date: r.submitted_on }));
  return <ReportsView reports={reports} />;
}
