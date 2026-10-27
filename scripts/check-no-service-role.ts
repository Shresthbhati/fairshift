// Fails if the service-role key or getAdminClient() is referenced outside the allow-list (plan §H5),
// if admin.ts loses its server-only guard, or if a NEXT_PUBLIC_ variable looks like a secret.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const norm = (p: string) => path.relative(ROOT, p).split(path.sep).join('/');

const ALLOWED = new Set([
  'scripts/seed.ts',
  'scripts/check-no-service-role.ts',
  'tests/integration/helpers.ts',
  'src/lib/supabase/admin.ts',
  'src/app/(worker)/report/new/actions.ts',
  'src/app/track/actions.ts',
]);
const NEEDLES = ['SUPABASE_SERVICE_ROLE_KEY', 'getAdminClient'];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return ['node_modules', '.next', '.git'].includes(e.name) ? [] : walk(full);
    return /\.(ts|tsx|mjs|js|json)$/.test(e.name) ? [full] : [];
  });
}

const problems: string[] = [];
for (const dir of ['src', 'scripts', 'tests']) {
  if (!fs.existsSync(path.join(ROOT, dir))) continue;
  for (const file of walk(path.join(ROOT, dir))) {
    const rel = norm(file);
    if (ALLOWED.has(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const n of NEEDLES) if (text.includes(n)) problems.push(`${rel} references ${n}`);
  }
}

const admin = path.join(ROOT, 'src/lib/supabase/admin.ts');
if (!fs.existsSync(admin) || !fs.readFileSync(admin, 'utf8').startsWith("import 'server-only'")) {
  problems.push("src/lib/supabase/admin.ts must start with import 'server-only'");
}

for (const f of ['.env.example', '.env.local']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (/^NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET)/.test(line)) problems.push(`${f}: secret behind NEXT_PUBLIC_ → ${line.split('=')[0]}`);
  }
}

if (problems.length) {
  console.error('service-role check failed:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log('service-role check ok');
