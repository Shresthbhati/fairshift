import type { PayResult, PayslipComponent } from './types';

export type CompareKind = 'base' | 'overtime' | 'allowance' | 'total';
export type CompareStatus = 'matches' | 'estimate_higher' | 'estimate_lower';

export type CompareRow = {
  kind: CompareKind;
  estimatePaise: number;
  issuedPaise: number;
  differencePaise: number; // estimate - issued
  status: CompareStatus;
};

/** Differences under ₹1 are treated as matching (rounding noise). */
export const MATCH_TOLERANCE_PAISE = 100;

const statusOf = (diff: number): CompareStatus =>
  Math.abs(diff) < MATCH_TOLERANCE_PAISE ? 'matches' : diff > 0 ? 'estimate_higher' : 'estimate_lower';

/**
 * Data only. Wording lives in i18n (pay.compare.estimateHigher / estimateLower / matches).
 * `other` components count toward the issued total but have no estimate row of their own.
 */
export function compareWithPayslip(
  result: Pick<PayResult, 'basePaise' | 'overtimePaise' | 'allowancePaise' | 'totalPaise'>,
  payslip: { components: PayslipComponent[] },
): CompareRow[] {
  const sum = (kind: PayslipComponent['kind']) =>
    payslip.components.filter((c) => c.kind === kind).reduce((n, c) => n + c.amount_paise, 0);
  const issuedTotal = payslip.components.reduce((n, c) => n + c.amount_paise, 0);

  const row = (kind: CompareKind, estimatePaise: number, issuedPaise: number): CompareRow => {
    const differencePaise = estimatePaise - issuedPaise;
    return { kind, estimatePaise, issuedPaise, differencePaise, status: statusOf(differencePaise) };
  };

  return [
    row('base', result.basePaise, sum('base')),
    row('overtime', result.overtimePaise, sum('overtime')),
    row('allowance', result.allowancePaise, sum('allowance')),
    row('total', result.totalPaise, issuedTotal),
  ];
}
