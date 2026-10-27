// Fails when en and hi message files differ, or when a banned phrase appears in any message.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'messages');
const BANNED = [/\btheft\b/i, /\bfraud\b/i, /\billegal\b/i, /\bguaranteed?\b/i, /100% anonymous/i, /safety score/i];

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out[key] = v;
      else Object.assign(out, flatten(v, key));
    }
  }
  return out;
}

function load(locale: string) {
  const dir = path.join(root, locale);
  const all: Record<string, string> = {};
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
    Object.assign(all, flatten(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), f.replace('.json', '')));
  }
  return all;
}

const en = load('en');
const hi = load('hi');
const problems: string[] = [];

for (const k of Object.keys(en)) if (!(k in hi)) problems.push(`missing in hi: ${k}`);
for (const k of Object.keys(hi)) if (!(k in en)) problems.push(`missing in en: ${k}`);
for (const [locale, msgs] of [['en', en], ['hi', hi]] as const) {
  for (const [k, v] of Object.entries(msgs)) {
    if (BANNED.some((re) => re.test(v))) problems.push(`banned phrase in ${locale}:${k}`);
    if (locale === 'hi' && v.trim() === '') problems.push(`empty hi string: ${k}`);
  }
  // placeholders must match between languages
}
for (const k of Object.keys(en)) {
  if (!(k in hi)) continue;
  const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  if (ph(en[k]) !== ph(hi[k])) problems.push(`placeholder mismatch: ${k}`);
}

if (problems.length) {
  console.error(`i18n check failed (${problems.length}):\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`i18n ok: ${Object.keys(en).length} keys in en and hi`);
