export type RuleSet = {
  id: string;
  version: number;
  label: string;
  payBasis: 'hourly' | 'daily' | 'monthly';
  baseRatePaise: number;
  otAfterMinutes: number;
  otMultiplierPct: number;
  monthlyDivisorDays: number;
  unpaidBreak: boolean;
  nightAllowancePaise: number;
  nightStart: string; // 'HH:MM'
  nightEnd: string;
  nightMinMinutes: number;
  longShiftMinutes: number;
  minRestMinutes: number;
  sourceNote: string;
};

export type ShiftInput = {
  id: string;
  startedAt: string; // ISO
  endedAt: string | null;
  breakMinutes: number;
  timeSource: string;
};

export type ShiftWarning = 'long_shift' | 'short_rest';

export type ShiftLine = {
  shiftId: string;
  dateIST: string; // YYYY-MM-DD of the start, in IST
  workedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  regularPaise: number;
  overtimePaise: number;
  nightPaise: number;
  nightOverlapMinutes: number;
  warnings: ShiftWarning[];
};

export type PayResult = {
  engineVersion: string;
  ruleSetId: string;
  period: { start: string; end: string };
  lines: ShiftLine[];
  basePaise: number;
  overtimePaise: number;
  allowancePaise: number;
  totalPaise: number;
};

export type PayErrorCode = 'period_not_single_month' | 'invalid_shift';

export type PayslipComponent = {
  label: string;
  kind: 'base' | 'overtime' | 'allowance' | 'other';
  amount_paise: number;
};
