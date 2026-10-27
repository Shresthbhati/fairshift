import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculatePay, PayError, type PayResult, type RuleSet, type ShiftInput } from '@/domain/pay';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;
type RuleRow = Database['public']['Tables']['wage_rule_sets']['Row'];
export type PayslipRow = Database['public']['Tables']['payslips']['Row'];

/* ── month helpers (all IST) ─────────────────────────────────────────────── */

export const currentMonthIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);

export const parseMonth = (v?: string) => (v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : currentMonthIST());

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(last).padStart(2, '0')}`,
    fromIso: `${month}-01T00:00:00+05:30`,
    toIso: `${shiftMonth(month, 1)}-01T00:00:00+05:30`,
  };
}

/* ── mapping ─────────────────────────────────────────────────────────────── */

export function toRuleSet(r: RuleRow): RuleSet {
  return {
    id: r.id,
    version: r.version,
    label: r.label,
    payBasis: r.pay_basis,
    baseRatePaise: r.base_rate_paise,
    otAfterMinutes: r.ot_after_minutes,
    otMultiplierPct: r.ot_multiplier_pct,
    monthlyDivisorDays: r.monthly_divisor_days,
    unpaidBreak: r.unpaid_break,
    nightAllowancePaise: r.night_allowance_paise,
    nightStart: r.night_start.slice(0, 5),
    nightEnd: r.night_end.slice(0, 5),
    nightMinMinutes: r.night_min_minutes,
    longShiftMinutes: r.long_shift_minutes,
    minRestMinutes: r.min_rest_minutes,
    sourceNote: r.source_note,
  };
}

/** The rule set in force at the start of the month: latest version with effective_from <= that date. */
export async function loadRuleSet(supabase: Db, orgId: string, monthStart: string): Promise<RuleSet | null> {
  const { data } = await supabase
    .from('wage_rule_sets')
    .select('*')
    .eq('org_id', orgId)
    .lte('effective_from', monthStart)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRuleSet(data) : null;
}

export type MonthData = {
  month: string;
  bounds: ReturnType<typeof monthBounds>;
  rules: RuleSet | null;
  shifts: ShiftInput[];
  result: PayResult | null;
  /** Set when the engine rejected a shift (e.g. a break longer than the shift). */
  invalidShiftId: string | null;
  payslips: PayslipRow[];
};

/** Everything the pay pages need for one month. Nothing is stored: the estimate is recomputed on every view. */
export async function loadMonth(supabase: Db, userId: string, orgId: string | null, month: string): Promise<MonthData> {
  const bounds = monthBounds(month);
  const payslipsQ = supabase
    .from('payslips')
    .select('*')
    .eq('worker_id', userId)
    .gte('period_end', bounds.start)
    .lte('period_start', bounds.end)
    .order('period_start');
  if (!orgId) {
    const { data } = await payslipsQ;
    return { month, bounds, rules: null, shifts: [], result: null, invalidShiftId: null, payslips: data ?? [] };
  }
  const [rules, shiftRes, payslipRes] = await Promise.all([
    loadRuleSet(supabase, orgId, bounds.start),
    supabase
      .from('shifts')
      .select('id, started_at, ended_at, break_minutes, time_source')
      .eq('worker_id', userId)
      .eq('org_id', orgId)
      .gte('started_at', bounds.fromIso)
      .lt('started_at', bounds.toIso)
      .order('started_at'),
    payslipsQ,
  ]);
  const shifts: ShiftInput[] = (shiftRes.data ?? []).map((s) => ({
    id: s.id,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    breakMinutes: s.break_minutes,
    timeSource: s.time_source,
  }));
  let result: PayResult | null = null;
  let invalidShiftId: string | null = null;
  if (rules) {
    try {
      result = calculatePay(rules, shifts, bounds.start, bounds.end);
    } catch (e) {
      if (e instanceof PayError) invalidShiftId = e.shiftId ?? 'unknown';
      else throw e;
    }
  }
  return { month, bounds, rules, shifts, result, invalidShiftId, payslips: payslipRes.data ?? [] };
}
