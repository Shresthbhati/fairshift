import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { AttendanceView } from './attendance-view';

const DAY = 86_400_000;
const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** Monday of the week containing `d` (a YYYY-MM-DD IST date). */
const mondayOf = (d: string) => addDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const ctx = await requireUser();
  const t = await getT();
  if (!hasRole(ctx, ['supervisor', 'payroll', 'org_admin'])) return <ForbiddenState roles={`${t('common.roles.supervisor')}`} />;
  const q = (await searchParams).week;
  const week = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(q ?? '') ? (q as string) : istToday());
  const supabase = await createClient();
  const { data } = await supabase
    .from('shifts')
    .select('id, started_at, ended_at, break_minutes, status, source, profiles!shifts_worker_id_fkey(display_name)')
    .gte('started_at', `${week}T00:00:00+05:30`)
    .lt('started_at', `${addDays(week, 7)}T00:00:00+05:30`)
    .order('started_at');
  return (
    <AttendanceView
      week={week}
      prev={addDays(week, -7)}
      next={addDays(week, 7)}
      canEdit={hasRole(ctx, ['supervisor'])}
      rows={(data ?? []).map((s) => ({
        id: s.id, worker: (s.profiles as unknown as { display_name: string } | null)?.display_name ?? '—',
        startedAt: s.started_at, endedAt: s.ended_at, breakMinutes: s.break_minutes, status: s.status,
      }))}
    />
  );
}
