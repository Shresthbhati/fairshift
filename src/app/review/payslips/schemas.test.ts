import { describe, expect, it } from 'vitest';
import { issuePayslipSchema, rupeesToPaise } from './schemas';

describe('rupeesToPaise', () => {
  it('parses whole and decimal rupees exactly', () => {
    expect(rupeesToPaise('1500')).toBe(150000);
    expect(rupeesToPaise('1500.5')).toBe(150050);
    expect(rupeesToPaise('1500.50')).toBe(150050);
    expect(rupeesToPaise('0.07')).toBe(7);
  });
  it('rejects anything else', () => {
    for (const bad of ['', '1,500', '-5', '1.234', 'abc', '12.']) expect(rupeesToPaise(bad)).toBeNull();
  });
});

describe('issuePayslipSchema', () => {
  const ok = {
    workerId: '8c1f4b0e-6a2d-4b1e-9d57-2f0c1a3b4c5d',
    month: '2026-09',
    components: [{ label: 'Daily wages', kind: 'base', amount: '15400' }],
    deductions: [],
    status: 'issued',
  };
  it('accepts a valid payslip', () => expect(issuePayslipSchema.safeParse(ok).success).toBe(true));
  it('rejects no pay lines and a bad month', () => {
    expect(issuePayslipSchema.safeParse({ ...ok, components: [] }).success).toBe(false);
    expect(issuePayslipSchema.safeParse({ ...ok, month: '2026-13' }).success).toBe(false);
  });
  it('rejects a non-numeric amount', () => {
    expect(issuePayslipSchema.safeParse({ ...ok, components: [{ label: 'x', kind: 'base', amount: 'lots' }] }).success).toBe(false);
  });
});
