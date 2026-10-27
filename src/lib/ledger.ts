import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LedgerEntry } from '@/components/fs/LedgerRow';
import { formatDate, formatMoney, type Locale, type Params } from './i18n';
import type { Database } from './supabase/database.types';

type Translate = (key: string, params?: Params) => string;
const CAP = 200; // newest rows per source; plenty for a demo-scale ledger

/**
 * The Fairness Ledger: shifts, edits by others (from the audit trail), payslips, wage questions and the
 * worker's own named or confidential reports, merged and sorted newest first. Each row says who recorded it.
 */
export async function buildLedger(
  supabase: SupabaseClient<Database>,
  userId: string,
  t: Translate,
  locale: Locale,
  offset = 0,
  limit = 50,
): Promise<{ entries: LedgerEntry[]; hasMore: boolean }> {
  const time = (iso: string) => formatDate(iso, locale, 'time');
  const range = (a: string, b: string | null) => `${formatDate(a, locale, 'date')}, ${time(a)}–${b ? time(b) : '…'}`;

  const [shifts, audit, slips, disputes, events, reports] = await Promise.all([
    supabase.from('shifts').select('id, started_at, ended_at, source').eq('worker_id', userId).order('started_at', { ascending: false }).limit(CAP),
    supabase.from('audit_events').select('id, at, actor_id, changed').eq('subject_worker_id', userId).eq('table_name', 'shifts').eq('action', 'update').order('at', { ascending: false }).limit(CAP),
    supabase.from('payslips').select('id, period_start, net_paise, created_at').eq('worker_id', userId).limit(CAP),
    supabase.from('wage_disputes').select('id, component_kind, status, created_at').eq('worker_id', userId).limit(CAP),
    supabase.from('dispute_events').select('id, dispute_id, to_status, actor_kind, created_at').eq('actor_kind', 'employer').limit(CAP),
    supabase.from('incident_reporters').select('incidents(id, reference_code, category, status, submitted_on)').eq('reporter_id', userId).limit(CAP),
  ]);

  const out: LedgerEntry[] = [];
  for (const s of shifts.data ?? []) {
    out.push({ id: `s-${s.id}`, at: s.started_at, source: s.source === 'employer' ? 'employer' : 'you', title: t('ledger.entries.shift', { range: range(s.started_at, s.ended_at) }) });
  }
  for (const a of audit.data ?? []) {
    if (!a.actor_id || a.actor_id === userId) continue; // only edits made by someone else
    const n = (a.changed as { new?: { started_at?: string; ended_at?: string | null } } | null)?.new;
    if (n?.started_at) out.push({ id: `a-${a.id}`, at: a.at, source: 'employer', title: t('ledger.entries.shiftEdited', { range: range(n.started_at, n.ended_at ?? null) }) });
  }
  for (const p of slips.data ?? []) {
    out.push({ id: `p-${p.id}`, at: p.created_at, source: 'employer', href: `/pay/payslips/${p.id}`, title: t('ledger.entries.payslip', { month: formatDate(p.period_start, locale, 'month'), net: formatMoney(p.net_paise, locale) }) });
  }
  const owned = new Set((disputes.data ?? []).map((d) => d.id));
  for (const d of disputes.data ?? []) {
    out.push({ id: `d-${d.id}`, at: d.created_at, source: 'you', href: `/pay/disputes/${d.id}`, status: { kind: 'dispute', value: d.status }, title: t('ledger.entries.dispute', { part: t(`pay.compare.${d.component_kind}`) }) });
  }
  for (const e of events.data ?? []) {
    if (!owned.has(e.dispute_id) || !e.to_status) continue;
    out.push({ id: `de-${e.id}`, at: e.created_at, source: 'employer', href: `/pay/disputes/${e.dispute_id}`, status: { kind: 'dispute', value: e.to_status }, title: t('ledger.entries.disputeUpdate') });
  }
  const mine = new Map<string, string>();
  for (const r of reports.data ?? []) {
    const i = r.incidents as unknown as { id: string; reference_code: string; category: string; status: string; submitted_on: string } | null;
    if (!i) continue;
    mine.set(i.id, i.reference_code);
    out.push({ id: `i-${i.id}`, at: i.submitted_on, source: 'you', href: `/report/${i.reference_code}`, status: { kind: 'incident', value: i.status }, title: t('ledger.entries.incident', { ref: i.reference_code, category: t(`report.category.${i.category}`) }) });
  }
  if (mine.size) {
    const upd = await supabase.from('incident_events').select('id, incident_id, to_status, created_at').in('incident_id', [...mine.keys()]).eq('visible_to_reporter', true).eq('actor_kind', 'investigator').limit(CAP);
    for (const e of upd.data ?? []) {
      const ref = mine.get(e.incident_id) as string;
      out.push({ id: `ie-${e.id}`, at: e.created_at, source: 'employer', href: `/report/${ref}`, status: e.to_status ? { kind: 'incident', value: e.to_status } : undefined, title: t('ledger.entries.incidentUpdate', { ref }) });
    }
  }

  out.sort((a, b) => b.at.localeCompare(a.at));
  return { entries: out.slice(offset, offset + limit), hasMore: out.length > offset + limit };
}
