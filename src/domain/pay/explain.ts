import type { RuleSet, ShiftLine } from './types';

const defaultMoney = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

export const formatMinutes = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

/**
 * Returns an i18n key plus string params for one shift line, e.g.
 * pay.explain.daily → "On {date} you worked {hours}. {regHours} at your daily rate = {regAmount}. …".
 * The caller passes a locale-aware money formatter.
 */
export function explainLine(
  line: ShiftLine,
  rules: Pick<RuleSet, 'payBasis' | 'otMultiplierPct'>,
  fmtMoney: (paise: number) => string = defaultMoney,
): { key: string; params: Record<string, string> } {
  return {
    key: `pay.explain.${rules.payBasis}`,
    params: {
      date: line.dateIST,
      hours: formatMinutes(line.workedMinutes),
      regHours: formatMinutes(line.regularMinutes),
      regAmount: fmtMoney(line.regularPaise),
      otHours: formatMinutes(line.overtimeMinutes),
      otAmount: fmtMoney(line.overtimePaise),
      pct: String(rules.otMultiplierPct),
      nightAmount: fmtMoney(line.nightPaise),
    },
  };
}
