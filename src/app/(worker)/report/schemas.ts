import { z } from 'zod';

export const CATEGORIES = ['physical_hazard', 'unsafe_equipment', 'harassment', 'wages', 'excessive_hours', 'discrimination', 'other'] as const;
export const SEVERITIES = ['low', 'medium', 'high', 'urgent'] as const;

const body = {
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  description: z.string().trim().min(10).max(4000),
  location: z.string().trim().max(200).optional(),
};

export const submitNamedSchema = z.object({ mode: z.enum(['identified', 'confidential']), ...body });
export const submitAnonymousSchema = z.object(body);

export const respondSchema = z.object({
  incidentId: z.uuid(),
  action: z.enum(['comment', 'confirm', 'reopen', 'escalate']),
  body: z.string().trim().max(2000).optional(),
});

export const REFERENCE_RE = /^FS-[A-Z0-9]{8}$/;
export const trackSchema = z.object({
  reference: z.string().trim().toUpperCase().regex(REFERENCE_RE),
  token: z.string().trim().min(20).max(200),
});
export const trackRespondSchema = trackSchema.extend({
  action: z.enum(['comment', 'confirm', 'reopen', 'escalate']),
  body: z.string().trim().max(2000).optional(),
});
