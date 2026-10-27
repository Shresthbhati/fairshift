import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';

type Db = SupabaseClient<Database>;

export const EXPORT_CATEGORIES = ['shifts', 'payslips', 'disputes', 'incidents', 'documents'] as const;
export type ExportCategory = (typeof EXPORT_CATEGORIES)[number];

export const EXPORT_DISCLAIMER =
  'Compiled by the worker using FairShift. Items marked self-reported were entered by the worker and have not been verified by FairShift or by an employer.';

export function parseCategories(v: string | null | undefined): ExportCategory[] {
  const wanted = (v ?? '').split(',');
  return EXPORT_CATEGORIES.filter((c) => wanted.includes(c));
}

/** How many records each category holds, for the preview step before anything is exported. */
export async function countRecords(supabase: Db, userId: string): Promise<Record<ExportCategory, number>> {
  const head = { count: 'exact' as const, head: true };
  const [shifts, payslips, disputes, incidents, documents] = await Promise.all([
    supabase.from('shifts').select('id', head).eq('worker_id', userId),
    supabase.from('payslips').select('id', head).eq('worker_id', userId),
    supabase.from('wage_disputes').select('id', head).eq('worker_id', userId),
    supabase.from('incident_reporters').select('incident_id', head).eq('reporter_id', userId),
    supabase.from('evidence_documents').select('id', head).eq('owner_id', userId).is('deleted_at', null),
  ]);
  return {
    shifts: shifts.count ?? 0,
    payslips: payslips.count ?? 0,
    disputes: disputes.count ?? 0,
    incidents: incidents.count ?? 0,
    documents: documents.count ?? 0,
  };
}

/** The person's own records, read through their own RLS session. Anonymous reports are not linked to anyone, so never appear. */
export async function collectRecords(supabase: Db, userId: string, categories: ExportCategory[]) {
  const out: Partial<Record<ExportCategory, unknown[]>> = {};
  for (const c of categories) {
    if (c === 'shifts') {
      out.shifts = (await supabase.from('shifts').select('id, started_at, ended_at, break_minutes, time_source, source, status, note').eq('worker_id', userId).order('started_at')).data ?? [];
    } else if (c === 'payslips') {
      out.payslips = (await supabase.from('payslips').select('id, period_start, period_end, components, deductions, gross_paise, net_paise, status, paid_on').eq('worker_id', userId).order('period_start')).data ?? [];
    } else if (c === 'disputes') {
      out.disputes = (await supabase.from('wage_disputes').select('id, payslip_id, component_kind, claimed_difference_paise, description, status, created_at').eq('worker_id', userId).order('created_at')).data ?? [];
    } else if (c === 'incidents') {
      const { data } = await supabase.from('incident_reporters').select('incidents(reference_code, mode, category, severity, status, description, location_text, submitted_on)').eq('reporter_id', userId);
      out.incidents = (data ?? []).map((r) => r.incidents).filter(Boolean);
    } else {
      out.documents = (await supabase.from('evidence_documents').select('id, kind, title, mime_type, size_bytes, sha256, provenance, verification, created_at').eq('owner_id', userId).is('deleted_at', null).order('created_at')).data ?? [];
    }
  }
  return out;
}
