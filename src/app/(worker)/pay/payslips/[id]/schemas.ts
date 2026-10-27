import { z } from 'zod';

export const submitDisputeSchema = z.object({
  payslipId: z.uuid(),
  componentKind: z.enum(['base', 'overtime', 'allowance', 'other', 'total']),
  description: z.string().trim().min(10).max(2000),
  clientRequestId: z.uuid(),
});
