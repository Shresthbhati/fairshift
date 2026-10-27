'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/app/login/actions';
import { requireUser } from '@/lib/auth';
import { checkUpload } from '@/lib/files';
import { rateLimit } from '@/lib/rate-limit';
import { mapRpcError } from '@/lib/rpc-error';
import { createClient } from '@/lib/supabase/server';
import { respondSchema } from '../schemas';

/** Reporter replies: comment, confirm resolved, reopen, escalate. The state machine lives in the database. */
export async function respond(input: unknown): Promise<ActionResult> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('reporter_respond', {
    p_incident: parsed.data.incidentId,
    p_action: parsed.data.action,
    p_body: (parsed.data.body ?? null) as string,
  });
  if (error) return { ok: false, error: mapRpcError(error) };
  revalidatePath('/report', 'layout');
  return { ok: true };
}

/** Adds a file to a named or confidential report. Anonymous reports take no files (files could identify the sender). */
export async function uploadIncidentFile(form: FormData): Promise<ActionResult> {
  const incidentId = z.uuid().safeParse(form.get('incidentId'));
  if (!incidentId.success) return { ok: false, error: 'common.errors.invalid' };
  const ctx = await requireUser();
  if (!rateLimit(`upload:${ctx.userId}`, 20)) return { ok: false, error: 'common.errors.rateLimited' };
  const checked = await checkUpload(form.get('file'));
  if (!checked.ok) return checked;

  const supabase = await createClient();
  const { data: inc } = await supabase.from('incidents').select('id, mode').eq('id', incidentId.data).maybeSingle();
  const { data: mine } = await supabase.from('incident_reporters').select('reporter_id').eq('incident_id', incidentId.data).maybeSingle();
  if (!inc || inc.mode === 'anonymous' || mine?.reporter_id !== ctx.userId) return { ok: false, error: 'common.errors.forbidden' };

  // The path never contains the user's filename.
  const path = `${inc.id}/${randomUUID()}.${checked.detected.ext}`;
  const up = await supabase.storage.from('incident-files').upload(path, checked.bytes, { contentType: checked.detected.mime });
  if (up.error) return { ok: false, error: 'report.errors.uploadFailed' };
  const row = await supabase.from('incident_attachments').insert({
    incident_id: inc.id, storage_path: path, mime_type: checked.detected.mime, size_bytes: checked.bytes.byteLength, sha256: checked.sha256,
  });
  if (row.error) return { ok: false, error: 'report.errors.uploadFailed' };
  revalidatePath('/report', 'layout');
  return { ok: true };
}

/** 60-second signed link to one attachment. Storage and table policies decide who may ask (reporter or investigator). */
export async function attachmentUrl(attachmentId: unknown): Promise<ActionResult<{ url: string }>> {
  const id = z.uuid().safeParse(attachmentId);
  if (!id.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { data: a } = await supabase.from('incident_attachments').select('storage_path').eq('id', id.data).maybeSingle();
  if (!a) return { ok: false, error: 'common.errors.notFound' };
  const signed = await supabase.storage.from('incident-files').createSignedUrl(a.storage_path, 60);
  if (signed.error || !signed.data) return { ok: false, error: 'common.errors.generic' };
  return { ok: true, data: { url: signed.data.signedUrl } };
}

/** Marks Home's "needs your attention" updates as seen. */
export async function markSeen(): Promise<void> {
  (await cookies()).set('fs_last_seen', new Date().toISOString(), { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}
