import { describe, expect, it } from 'vitest';
import { calculatePay } from './calculate';
import { compareWithPayslip } from './compare';
import { RULES_C, RULES_H, meenasMonth, meenasPayslipComponents, ravisMonth, ravisPayslipComponents } from './fixtures';

const rowOf = (rows: ReturnType<typeof compareWithPayslip>, kind: string) => rows.find((r) => r.kind === kind)!;

describe('payslip comparison', () => {
  it("T14 Ravi: overtime missing from the payslip", () => {
    const result = calculatePay(RULES_C, ravisMonth(), '2026-09-01', '2026-09-30');
    const rows = compareWithPayslip(result, { components: ravisPayslipComponents });
    expect(rowOf(rows, 'overtime')).toMatchObject({ differencePaise: 210000, status: 'estimate_higher' });
    expect(rowOf(rows, 'base')).toMatchObject({ differencePaise: 0, status: 'matches' });
    expect(rowOf(rows, 'total')).toMatchObject({ differencePaise: 210000, status: 'estimate_higher' });
  });

  it('T15 Meena: night allowance short on the payslip', () => {
    const result = calculatePay(RULES_H, meenasMonth(), '2026-09-01', '2026-09-30');
    const rows = compareWithPayslip(result, { components: meenasPayslipComponents });
    expect(rowOf(rows, 'allowance')).toMatchObject({ differencePaise: 30000, status: 'estimate_higher' });
    expect(rowOf(rows, 'base')).toMatchObject({ differencePaise: 0, status: 'matches' });
    expect(rowOf(rows, 'overtime')).toMatchObject({ differencePaise: 0, status: 'matches' });
    expect(rowOf(rows, 'total')).toMatchObject({ differencePaise: 30000, status: 'estimate_higher' });
  });

  it('treats differences under ₹1 as matching and flags a lower estimate', () => {
    const base = { basePaise: 1000, overtimePaise: 0, allowancePaise: 0, totalPaise: 1000 };
    expect(rowOf(compareWithPayslip(base, { components: [{ label: 'x', kind: 'base', amount_paise: 1050 }] }), 'base').status).toBe('matches');
    expect(rowOf(compareWithPayslip(base, { components: [{ label: 'x', kind: 'base', amount_paise: 1500 }] }), 'base').status).toBe('estimate_lower');
  });
});
