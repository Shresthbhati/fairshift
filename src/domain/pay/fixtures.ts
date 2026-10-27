// Demo rule sets and the two seeded September-2026 months (plan §I3). Used by the engine tests and scripts/seed.ts.
// Node loads this natively (type stripping), so: `import type` only, no enums, no relative runtime imports.
import type { PayslipComponent, RuleSet, ShiftInput } from './types';

const SOURCE_NOTE = 'Employer configuration – demo values, not legal advice';

const common = {
  version: 1,
  otAfterMinutes: 480,
  otMultiplierPct: 200,
  monthlyDivisorDays: 26,
  unpaidBreak: true,
  nightAllowancePaise: 0,
  nightStart: '22:00',
  nightEnd: '06:00',
  nightMinMinutes: 240,
  longShiftMinutes: 600,
  minRestMinutes: 660,
  sourceNote: SOURCE_NOTE,
};

/** Construction, daily wage. */
export const RULES_C: RuleSet = {
  ...common,
  id: 'rule-c',
  label: 'Daily wage v1',
  payBasis: 'daily',
  baseRatePaise: 70000,
};

/** Hospital, monthly salary with night allowance. */
export const RULES_H: RuleSet = {
  ...common,
  id: 'rule-h',
  label: 'Monthly salary v1',
  payBasis: 'monthly',
  baseRatePaise: 1800000,
  unpaidBreak: false,
  nightAllowancePaise: 15000,
};

/** Facility, hourly. */
export const RULES_F: RuleSet = {
  ...common,
  id: 'rule-f',
  label: 'Hourly v1',
  payBasis: 'hourly',
  baseRatePaise: 9000,
  otMultiplierPct: 150,
};

/** IST wall-clock → ISO string with an explicit +05:30 offset. */
export const at = (date: string, hhmm: string) => `${date}T${hhmm}:00+05:30`;

const sep = (n: number) => `2026-09-${String(n).padStart(2, '0')}`;

const mk = (id: string, startedAt: string, endedAt: string, breakMinutes: number): ShiftInput => ({
  id,
  startedAt,
  endedAt,
  breakMinutes,
  timeSource: 'server_clock',
});

const RAVI_DAYS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25];
const RAVI_OT_DAYS = [3, 8, 10, 15, 17, 22];

/** 22 shifts, 6 of them 10h worked → base ₹15,400 + overtime ₹2,100 = ₹17,500. */
export const ravisMonth = (): ShiftInput[] =>
  RAVI_DAYS.map((n) =>
    mk(`ravi-${n}`, at(sep(n), '08:00'), at(sep(n), RAVI_OT_DAYS.includes(n) ? '19:00' : '17:00'), 60),
  );

export const ravisPayslipComponents: PayslipComponent[] = [
  { label: 'Daily wages (22 days)', kind: 'base', amount_paise: 1540000 },
];

const MEENA_DAY_SHIFTS = [1, 2, 3, 4, 7, 8, 9, 14, 15, 16, 17, 18, 21, 22];
const MEENA_NIGHT_SHIFTS = [24, 25, 26, 27, 28, 29];

/** 14 day shifts + 6 night shifts → ₹18,000 salary + ₹4,153.86 overtime + ₹900 night allowance. */
export const meenasMonth = (): ShiftInput[] => [
  ...MEENA_DAY_SHIFTS.map((n) => mk(`meena-d${n}`, at(sep(n), '08:00'), at(sep(n), '16:00'), 30)),
  ...MEENA_NIGHT_SHIFTS.map((n) => mk(`meena-n${n}`, at(sep(n), '20:00'), at(sep(n + 1), '08:00'), 30)),
];

export const meenasPayslipComponents: PayslipComponent[] = [
  { label: 'Monthly salary', kind: 'base', amount_paise: 1800000 },
  { label: 'Overtime', kind: 'overtime', amount_paise: 415386 },
  { label: 'Night allowance (4 nights)', kind: 'allowance', amount_paise: 60000 },
];
