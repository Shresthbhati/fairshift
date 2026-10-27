import { createHash } from 'node:crypto';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type DetectedFile = { mime: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'pdf' | 'jpg' | 'png' | 'webp' };

const startsWith = (b: Uint8Array, offset: number, sig: number[]) => sig.every((v, i) => b[offset + i] === v);

/** The file type is decided by its first bytes, never by its name or the browser-supplied MIME type. */
export function detectFile(b: Uint8Array): DetectedFile | null {
  if (startsWith(b, 0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf' }; // %PDF-
  if (startsWith(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (startsWith(b, 0, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(b, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, 8, [0x57, 0x45, 0x42, 0x50])) return { mime: 'image/webp', ext: 'webp' }; // RIFF....WEBP
  return null;
}

export const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export type CheckedUpload =
  | { ok: true; bytes: Uint8Array; detected: DetectedFile; sha256: string }
  | { ok: false; error: 'report.errors.fileType' | 'report.errors.fileSize' | 'common.errors.invalid' };

/** Size and type checks shared by the evidence vault and incident attachments. */
export async function checkUpload(file: unknown): Promise<CheckedUpload> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'common.errors.invalid' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'report.errors.fileSize' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFile(bytes);
  if (!detected) return { ok: false, error: 'report.errors.fileType' };
  return { ok: true, bytes, detected, sha256: sha256Hex(bytes) };
}
