import { z } from 'zod';

/** "1500", "1500.5" or "1500.50" → integer paise, without floating point. Returns null for anything else. */
export function rupeesToPaise(input: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number(((m[2] ?? '') + '00').slice(0, 2));
}

const amount = z.string().trim().refine((v) => rupeesToPaise(v) !== null);

export const issuePayslipSchema = z.object({
  workerId: z.uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  components: z
    .array(z.object({ label: z.string().trim().min(1).max(80), kind: z.enum(['base', 'overtime', 'allowance', 'other']), amount }))
    .min(1)
    .max(10),
  deductions: z.array(z.object({ label: z.string().trim().min(1).max(80), amount })).max(10),
  status: z.enum(['issued', 'paid']),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
