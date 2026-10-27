import type { PayErrorCode, PayResult, RuleSet, ShiftInput, ShiftLine, ShiftWarning } from './types';

export const ENGINE_VERSION = '1.0.0';

const IST_OFFSET_MIN = 330; // UTC+05:30, no DST
const MIN_MS = 60_000;
const DAY_MIN = 1440;

export class PayError extends Error {
  readonly code: PayErrorCode;
  readonly shiftId?: string;
  constructor(code: PayErrorCode, shiftId?: string) {
    super(shiftId ? `${code}: ${shiftId}` : code);
    this.name = 'PayError';
    this.code = code;
    this.shiftId = shiftId;
  }
}

/** Exact half-up integer division for non-negative integers. Every division in the engine goes through this. */
export function roundDiv(num: number, den: number): number {
  return Math.floor((2 * num + den) / (2 * den));
}

const toEpochMin = (iso: string) => Math.round(Date.parse(iso) / MIN_MS);

const istDate = (epochMin: number) =>
  new Date((epochMin + IST_OFFSET_MIN) * MIN_MS).toISOString().slice(0, 10);

const istMidnight = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / MIN_MS - IST_OFFSET_MIN;
};

const hmToMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Minutes of [startMin, endMin] that fall inside the night window, summed over the
 * windows that start on each IST calendar day from (start date - 1) to end date.
 * Breaks are not subtracted (documented simplification).
 */
function nightOverlap(startMin: number, endMin: number, rules: RuleSet): number {
  const ns = hmToMin(rules.nightStart);
  const ne = hmToMin(rules.nightEnd);
  const crossesMidnight = ne <= ns;
  const lastDay = istMidnight(istDate(endMin));
  let total = 0;
  for (let day = istMidnight(istDate(startMin)) - DAY_MIN; day <= lastDay; day += DAY_MIN) {
    const windowStart = day + ns;
    const windowEnd = day + (crossesMidnight ? DAY_MIN : 0) + ne;
    total += Math.max(0, Math.min(endMin, windowEnd) - Math.max(startMin, windowStart));
  }
  return total;
}

function assertSingleMonth(start: string, end: string) {
  const ok = /^\d{4}-\d{2}-01$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end);
  if (ok) {
    const [y, m] = start.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (end === `${start.slice(0, 8)}${String(last).padStart(2, '0')}`) return;
  }
  throw new PayError('period_not_single_month');
}

export function calculatePay(
  rules: RuleSet,
  shifts: ShiftInput[],
  periodStart: string,
  periodEnd: string,
): PayResult {
  assertSingleMonth(periodStart, periodEnd);

  const closed = shifts.filter((s) => s.endedAt !== null);
  for (const s of closed) {
    const startMs = Date.parse(s.startedAt);
    const endMs = Date.parse(s.endedAt as string);
    const durationMs = endMs - startMs;
    if (
      !Number.isFinite(durationMs) ||
      durationMs <= 0 ||
      durationMs > DAY_MIN * MIN_MS ||
      s.breakMinutes < 0 ||
      s.breakMinutes * MIN_MS >= durationMs
    ) {
      throw new PayError('invalid_shift', s.id);
    }
  }

  const sorted = [...closed].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const monthly = rules.payBasis === 'monthly';
  const base = rules.baseRatePaise;
  const pct = rules.otMultiplierPct;
  const stdDay = rules.otAfterMinutes;

  let prevEnd: number | null = null;
  const lines: ShiftLine[] = sorted.map((s) => {
    const startMin = toEpochMin(s.startedAt);
    const endMin = toEpochMin(s.endedAt as string);
    const duration = endMin - startMin;
    const worked = rules.unpaidBreak ? duration - s.breakMinutes : duration;
    const regular = Math.min(worked, stdDay);
    const ot = Math.max(0, worked - stdDay);

    let regularPaise = 0;
    let overtimePaise = 0;
    if (rules.payBasis === 'hourly') {
      regularPaise = roundDiv(regular * base, 60);
      overtimePaise = roundDiv(ot * base * pct, 6000);
    } else if (rules.payBasis === 'daily') {
      regularPaise = roundDiv(regular * base, stdDay);
      overtimePaise = roundDiv(ot * base * pct, stdDay * 100);
    } else {
      overtimePaise = roundDiv(ot * base * pct, rules.monthlyDivisorDays * stdDay * 100);
    }

    const overlap = nightOverlap(startMin, endMin, rules);
    const nightPaise = overlap >= rules.nightMinMinutes ? rules.nightAllowancePaise : 0;

    const warnings: ShiftWarning[] = [];
    if (worked > rules.longShiftMinutes) warnings.push('long_shift');
    if (prevEnd !== null && startMin - prevEnd < rules.minRestMinutes) warnings.push('short_rest');
    prevEnd = endMin;

    return {
      shiftId: s.id,
      dateIST: istDate(startMin),
      workedMinutes: worked,
      regularMinutes: regular,
      overtimeMinutes: ot,
      regularPaise,
      overtimePaise,
      nightPaise,
      nightOverlapMinutes: overlap,
      warnings,
    };
  });

  const basePaise = monthly ? base : lines.reduce((n, l) => n + l.regularPaise, 0);
  const overtimePaise = lines.reduce((n, l) => n + l.overtimePaise, 0);
  const allowancePaise = lines.reduce((n, l) => n + l.nightPaise, 0);

  return {
    engineVersion: ENGINE_VERSION,
    ruleSetId: rules.id,
    period: { start: periodStart, end: periodEnd },
    lines,
    basePaise,
    overtimePaise,
    allowancePaise,
    totalPaise: basePaise + overtimePaise + allowancePaise,
  };
}
