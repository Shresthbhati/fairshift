import { describe, expect, it } from 'vitest';
import { checkUpload, detectFile, MAX_FILE_BYTES } from './files';

const bytes = (...n: number[]) => new Uint8Array(n);

describe('detectFile', () => {
  it('recognises PDF, PNG, JPEG and WEBP by magic bytes', () => {
    expect(detectFile(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))?.mime).toBe('application/pdf');
    expect(detectFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe('image/png');
    expect(detectFile(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg');
    expect(detectFile(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))?.mime).toBe('image/webp');
  });

  it('rejects everything else, including RIFF that is not WEBP', () => {
    expect(detectFile(bytes(0x4d, 0x5a, 0x90))).toBeNull(); // Windows executable
    expect(detectFile(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull(); // WAVE
    expect(detectFile(new Uint8Array())).toBeNull();
  });
});

describe('checkUpload', () => {
  it('trusts the bytes, not the name: a PNG called .pdf is detected as PNG', async () => {
    const png = new File([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)], 'looks-like.pdf', { type: 'application/pdf' });
    const r = await checkUpload(png);
    expect(r.ok && r.detected.mime).toBe('image/png');
    expect(r.ok && r.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects a script renamed .pdf, an oversize file and a non-file', async () => {
    const script = new File(['#!/bin/sh\necho hi'], 'invoice.pdf', { type: 'application/pdf' });
    expect(await checkUpload(script)).toMatchObject({ ok: false, error: 'report.errors.fileType' });
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.pdf');
    expect(await checkUpload(big)).toMatchObject({ ok: false, error: 'report.errors.fileSize' });
    expect(await checkUpload('nope')).toMatchObject({ ok: false });
  });
});
