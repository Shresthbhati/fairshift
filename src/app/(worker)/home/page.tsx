import { cookies } from 'next/headers';
import { compareWithPayslip, type PayslipComponent } from '@/domain/pay';
import { requireUser, workerOrg } from '@/lib/auth';
import { formatDate } from '@/lib/i18n';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { loadMonth, monthBounds } from '../pay/data';
import { HomeView, type AttentionItem } from './home-view';

const LAST_SEEN_COOKIE = 'fs_last_seen'; // a page file may only export the page itself
const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export default async function HomePage() {
  const ctx = await requireUser();
  const org = workerOrg(ctx);
  const t = await getT();
  const supabase = await createClient();
  const store = await cookies();
  const since = store.get(LAST_SEEN_COOKIE)?.value ?? daysAgoIso(7);

  const [open, events, responded, slips] = await Promise.all([
    supabase.from('shifts').select('id, started_at').eq('worker_id', ctx.userId).is('ended_at', null).maybeSingle(),
    supabase
      .from('incident_events')
      .select('id, incidents(reference_code)')
      .eq('visible_to_reporter', true)
      .eq('actor_kind', 'investigator')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('wage_disputes').select('id').eq('worker_id', ctx.userId).eq('status', 'responded').limit(5),
    supabase.from('payslips').select('id, period_start, period_end, components').eq('worker_id', ctx.userId).order('period_start', { ascending: false }).limit(2),
  ]);

  const items: AttentionItem[] = [];
  const seenRefs = new Set<string>();
  for (const e of events.data ?? []) {
    const ref = (e.incidents as unknown as { reference_code: string } | null)?.reference_code;
    if (ref && !seenRefs.has(ref)) {
      seenRefs.add(ref);
      items.push({ id: `inc-${ref}`, text: t('home.attention.incident', { ref }), href: `/report/${ref}` });
    }
  }
  for (const d of responded.data ?? []) {
    items.push({ id: `dis-${d.id}`, text: t('home.attention.dispute'), href: `/pay/disputes/${d.id}` });
  }
  for (const s of slips.data ?? []) {
    const month = s.period_start.slice(0, 7);
    const b = monthBounds(month);
    if (!org || s.period_start !== b.start || s.period_end !== b.end) continue;
    const data = await loadMonth(supabase, ctx.userId, org.org_id, month);
    if (!data.result) continue;
    const rows = compareWithPayslip(data.result, { components: s.components as unknown as PayslipComponent[] });
    if (rows.some((r) => r.kind !== 'total' && r.status !== 'matches')) {
      items.push({
        id: `pay-${s.id}`,
        text: t('home.attention.difference', { month: formatDate(`${month}-01`, t.locale, 'month') }),
        href: `/pay/payslips/${s.id}`,
      });
    }
  }

  return (
    <HomeView
      name={ctx.displayName}
      hasOrg={!!org}
      staffOnly={!org && ctx.memberships.length > 0}
      open={open.data ? { id: open.data.id, startedAt: open.data.started_at } : null}
      items={items}
    />
  );
}
