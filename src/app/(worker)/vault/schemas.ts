import { z } from 'zod';

export const KINDS = ['payslip', 'attendance', 'agreement', 'photo', 'certificate', 'other'] as const;

export const uploadMetaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  kind: z.enum(KINDS),
});

export const idSchema = z.uuid();
