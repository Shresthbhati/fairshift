import { describe, expect, it } from 'vitest';
import { PayError, calculatePay, roundDiv } from './calculate';
import { RULES_C, RULES_F, RULES_H, at, meenasMonth, ravisMonth } from './fixtures';
import type { ShiftInput } from './types';

const P = { start: '2026-09-01', end: '2026-09-30' };
const shift = (id: string, start: string, end: string, breakMinutes = 0): ShiftInput => ({
  id,
  startedAt: start,
  endedAt: end,
  breakMinutes,
  timeSource: 'server_clock',
});
const day = (id: string, date: string, from: string, to: string, brk: number) =>
  shift(id, at(date, from), at(date, to), brk);
const run = (rules: typeof RULES_C, shifts: ShiftInput[]) => calculatePay(rules, shifts, P.start, P.end);

describe('pay engine vectors', () => {
  it('T1 construction 8h day, no overtime', () => {
    const { lines } = run(RULES_C, [day('a', '2026-09-01', '08:00', '17:00', 60)]);
    expect(lines[0]).toMatchObject({ workedMinutes: 480, regularPaise: 70000, overtimePaise: 0 });
  });

  it('T2 construction 10h worked -> 2h overtime', () => {
    const { lines } = run(RULES_C, [day('a', '2026-09-01', '08:00', '19:00', 60)]);
    expect(lines[0]).toMatchObject({ workedMinutes: 600, regularPaise: 70000, overtimePaise: 35000 });
  });

  it('T3 construction 9h worked -> 1h overtime', () => {
    const { lines } = run(RULES_C, [day('a', '2026-09-01', '08:00', '18:00', 60)]);
    expect(lines[0]).toMatchObject({ workedMinutes: 540, regularPaise: 70000, overtimePaise: 17500 });
  });

  it('T4 construction half day is pro-rata', () => {
    const { lines } = run(RULES_C, [day('a', '2026-09-01', '08:00', '12:00', 0)]);
    expect(lines[0]).toMatchObject({ workedMinutes: 240, regularPaise: 35000, overtimePaise: 0 });
  });

  it('T5 hospital night shift: overtime, allowance, long-shift warning', () => {
    const { lines, basePaise, totalPaise } = run(RULES_H, [
      shift('n', at('2026-09-24', '20:00'), at('2026-09-25', '08:00'), 30),
    ]);
    expect(lines[0]).toMatchObject({
      workedMinutes: 720,
      regularPaise: 0,
      overtimePaise: 69231,
      nightPaise: 15000,
      nightOverlapMinutes: 480,
      warnings: ['long_shift'],
    });
    expect(basePaise).toBe(1800000);
    expect(totalPaise).toBe(1800000 + 69231 + 15000);
  });

  it('T6 hospital day shift: no overtime, no night allowance', () => {
    const { lines } = run(RULES_H, [day('d', '2026-09-01', '08:00', '16:00', 30)]);
    expect(lines[0]).toMatchObject({ workedMinutes: 480, overtimePaise: 0, nightPaise: 0, nightOverlapMinutes: 0 });
  });

  it('T7 hourly facility shift at 150%', () => {
    const { lines } = run(RULES_F, [day('f', '2026-09-01', '09:00', '19:30', 30)]);
    expect(lines[0]).toMatchObject({ workedMinutes: 600, regularPaise: 72000, overtimePaise: 27000 });
  });

  it('T8 short rest between consecutive shifts is flagged on the second shift', () => {
    const { lines } = run(RULES_C, [
      day('a', '2026-09-03', '14:00', '22:00', 0),
      day('b', '2026-09-04', '06:00', '14:00', 0),
    ]);
    expect(lines[0].warnings).toEqual([]);
    expect(lines[1].warnings).toEqual(['short_rest']);
  });

  it("T9 Meena's September", () => {
    const r = run(RULES_H, meenasMonth());
    expect(r.basePaise).toBe(1800000);
    expect(r.overtimePaise).toBe(415386);
    expect(r.allowancePaise).toBe(90000);
    expect(r.totalPaise).toBe(2305386);
    expect(r.lines.filter((l) => l.warnings.includes('long_shift'))).toHaveLength(6);
    expect(r.lines.some((l) => l.warnings.includes('short_rest'))).toBe(false);
  });

  it("T10 Ravi's September", () => {
    const r = run(RULES_C, ravisMonth());
    expect(r.lines).toHaveLength(22);
    expect(r.basePaise).toBe(1540000);
    expect(r.overtimePaise).toBe(210000);
    expect(r.allowancePaise).toBe(0);
    expect(r.totalPaise).toBe(1750000);
  });

  it('T11 invalid shifts throw invalid_shift', () => {
    const bad = [
      shift('x', at('2026-09-01', '10:00'), at('2026-09-01', '10:00')), // end == start
      shift('y', at('2026-09-01', '10:00'), at('2026-09-01', '09:00')), // end before start
      shift('z', at('2026-09-01', '08:00'), at('2026-09-02', '09:00')), // 25h
      shift('w', at('2026-09-01', '08:00'), at('2026-09-01', '09:00'), 60), // break swallows shift
    ];
    for (const s of bad) {
      expect(() => run(RULES_C, [s])).toThrow(PayError);
      try {
        run(RULES_C, [s]);
      } catch (e) {
        expect((e as PayError).code).toBe('invalid_shift');
        expect((e as PayError).shiftId).toBe(s.id);
      }
    }
  });

  it('T12 roundDiv is exact half-up', () => {
    expect(roundDiv(5, 2)).toBe(3);
    expect(roundDiv(4, 2)).toBe(2);
    expect(roundDiv(7, 3)).toBe(2);
    expect(roundDiv(0, 7)).toBe(0);
  });

  it('T13 period must be exactly one calendar month', () => {
    for (const [s, e] of [
      ['2026-09-15', '2026-10-14'],
      ['2026-09-01', '2026-09-29'],
      ['2026-09-01', '2026-10-31'],
    ]) {
      try {
        calculatePay(RULES_H, [], s, e);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(PayError);
        expect((err as PayError).code).toBe('period_not_single_month');
      }
    }
    expect(calculatePay(RULES_H, [], '2026-02-01', '2026-02-28').totalPaise).toBe(1800000);
  });

  it('skips open shifts', () => {
    const open: ShiftInput = { id: 'o', startedAt: at('2026-09-01', '08:00'), endedAt: null, breakMinutes: 0, timeSource: 'server_clock' };
    expect(run(RULES_C, [open]).lines).toHaveLength(0);
  });
});
