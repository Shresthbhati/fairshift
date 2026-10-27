'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/login/actions';
import { requireUser, workerOrg } from '@/lib/auth';
import { checkUpload } from '@/lib/files';
import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { idSchema, uploadMetaSchema } from './schemas';

/** Private upload: the type comes from the file's own bytes, the path never contains the user's filename. */
export async function uploadEvidence(form: FormData): Promise<ActionResult> {
  const meta = uploadMetaSchema.safeParse({ title: form.get('title'), kind: form.get('kind') });
  if (!meta.success) return { ok: false, error: 'vault.errors.title' };
  const ctx = await requireUser();
  if (!rateLimit(`upload:${ctx.userId}`, 20)) return { ok: false, error: 'common.errors.rateLimited' };
  const checked = await checkUpload(form.get('file'));
  if (!checked.ok) return checked;

  const supabase = await createClient();
  const path = `${ctx.userId}/${randomUUID()}.${checked.detected.ext}`;
  const up = await supabase.storage.from('evidence').upload(path, checked.bytes, { contentType: checked.detected.mime });
  if (up.error) return { ok: false, error: 'common.errors.generic' };
  const row = await supabase.from('evidence_documents').insert({
    owner_id: ctx.userId,
    org_id: workerOrg(ctx)?.org_id ?? null,
    kind: meta.data.kind,
    title: meta.data.title,
    storage_path: path,
    mime_type: checked.detected.mime,
    size_bytes: checked.bytes.byteLength,
    sha256: checked.sha256,
  });
  if (row.error) {
    await supabase.storage.from('evidence').remove([path]);
    return { ok: false, error: 'common.errors.generic' };
  }
  revalidatePath('/vault');
  return { ok: true };
}

/** A signed link that works for 60 seconds. Only the owner's session passes the storage policy. */
export async function downloadUrl(id: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { data: doc } = await supabase.from('evidence_documents').select('storage_path').eq('id', parsed.data).is('deleted_at', null).maybeSingle();
  if (!doc) return { ok: false, error: 'common.errors.notFound' };
  const signed = await supabase.storage.from('evidence').createSignedUrl(doc.storage_path, 60, { download: true });
  if (signed.error || !signed.data) return { ok: false, error: 'common.errors.generic' };
  return { ok: true, data: { url: signed.data.signedUrl } };
}

/** Soft delete: the document disappears from the vault. Hard delete is on the roadmap. */
export async function deleteEvidence(id: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'common.errors.invalid' };
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from('evidence_documents').update({ deleted_at: new Date().toISOString() }).eq('id', parsed.data);
  if (error) return { ok: false, error: 'common.errors.generic' };
  revalidatePath('/vault');
  return { ok: true };
}
