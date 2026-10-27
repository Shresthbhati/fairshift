// Demo seed (plan §I3). Run via `pnpm db:reset` (resets the DB first). Local-only: refuses anything else.
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  RULES_C,
  RULES_H,
  meenasMonth,
  meenasPayslipComponents,
  ravisMonth,
  ravisPayslipComponents,
} from '../src/domain/pay/fixtures.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const password = process.env.DEMO_PASSWORD ?? '';
let host = '';
try {
  host = new URL(url).hostname;
} catch {
  /* handled below */
}
if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || !['127.0.0.1', 'localhost'].includes(host)) {
  console.error('Refusing to seed: needs NEXT_PUBLIC_DEMO_MODE=true and a localhost Supabase URL.');
  process.exit(1);
}
if (!serviceKey || !password) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD in .env.local.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data === null) throw new Error(`${what}: ${error?.message ?? 'no data returned'}`);
  return data as NonNullable<T>;
}

const sha256 = (s: string | Uint8Array) => createHash('sha256').update(s).digest('hex');
const refCode = () => 'FS-' + randomBytes(4).toString('hex').toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const startOfToday = () => `${today()}T00:00:00Z`;

// ── orgs, sites, rule sets ───────────────────────────────────────────────────
const [shakti] = await must(
  admin.from('organisations').insert({ name: 'Shakti Constructions (Demo)', sector: 'construction', join_code: 'SHAKTI-DEMO' }).select('id'),
  'org construction',
);
const [sunrise] = await must(
  admin.from('organisations').insert({ name: 'Sunrise Hospital (Demo)', sector: 'healthcare', join_code: 'SUNRISE-DEMO' }).select('id'),
  'org hospital',
);
const [towerB] = await must(admin.from('sites').insert({ org_id: shakti.id, name: 'Tower B site', kind: 'site' }).select('id'), 'site');
const [ward3] = await must(
  admin.from('sites').insert([
    { org_id: sunrise.id, name: 'Ward 3', kind: 'department' },
    { org_id: sunrise.id, name: 'Emergency', kind: 'department' },
  ]).select('id'),
  'departments',
);

// ── users (the profile trigger creates profiles from user_metadata) ──────────
const PEOPLE = [
  { key: 'ravi', name: 'Ravi Kumar', locale: 'hi' },
  { key: 'meena', name: 'Meena Das', locale: 'en' },
  { key: 'suresh', name: 'Suresh', locale: 'en' },
  { key: 'priya', name: 'Priya', locale: 'en' },
  { key: 'anita', name: 'Anita', locale: 'en' },
  { key: 'deepak', name: 'Deepak', locale: 'en' },
  { key: 'kavya', name: 'Kavya', locale: 'en' },
  { key: 'farhan', name: 'Farhan', locale: 'en' },
] as const;
const id: Record<string, string> = {};
for (const p of PEOPLE) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${p.key}@demo.fairshift.local`,
    password,
    email_confirm: true,
    user_metadata: { display_name: p.name, locale: p.locale },
  });
  if (error || !data.user) throw new Error(`user ${p.key}: ${error?.message} (run via \`pnpm db:reset\` for a clean database)`);
  id[p.key] = data.user.id;
}
await must(admin.from('consent_records').insert(PEOPLE.map((p) => ({ user_id: id[p.key], notice_version: 'privacy-v1' }))).select('id'), 'consent');

const memberships = [
  { org_id: shakti.id, user_id: id.ravi, role: 'worker' },
  { org_id: sunrise.id, user_id: id.ravi, role: 'worker', status: 'ended', started_on: '2025-01-01', ended_on: '2025-12-31' },
  { org_id: sunrise.id, user_id: id.meena, role: 'worker' },
  { org_id: shakti.id, user_id: id.suresh, role: 'supervisor' },
  { org_id: shakti.id, user_id: id.priya, role: 'payroll' },
  { org_id: shakti.id, user_id: id.anita, role: 'investigator' },
  { org_id: shakti.id, user_id: id.deepak, role: 'org_admin' },
  { org_id: sunrise.id, user_id: id.kavya, role: 'payroll' },
  { org_id: sunrise.id, user_id: id.farhan, role: 'investigator' },
];
// defaultToNull:false → keys missing from a row use the column default instead of NULL
await must(admin.from('memberships').insert(memberships, { defaultToNull: false }).select('id'), 'memberships');

const ruleRow = (org: string, r: typeof RULES_C, by: string) => ({
  org_id: org,
  version: r.version,
  label: r.label,
  pay_basis: r.payBasis,
  base_rate_paise: r.baseRatePaise,
  ot_after_minutes: r.otAfterMinutes,
  ot_multiplier_pct: r.otMultiplierPct,
  monthly_divisor_days: r.monthlyDivisorDays,
  unpaid_break: r.unpaidBreak,
  night_allowance_paise: r.nightAllowancePaise,
  night_start: r.nightStart,
  night_end: r.nightEnd,
  night_min_minutes: r.nightMinMinutes,
  long_shift_minutes: r.longShiftMinutes,
  min_rest_minutes: r.minRestMinutes,
  source_note: r.sourceNote,
  effective_from: '2026-01-01',
  created_by: by,
});
await must(admin.from('wage_rule_sets').insert([ruleRow(shakti.id, RULES_C, id.priya), ruleRow(sunrise.id, RULES_H, id.kavya)]).select('id'), 'rule sets');

// ── September 2026 shifts and payslips ───────────────────────────────────────
const shiftRows = (worker: string, org: string, site: string, shifts: ReturnType<typeof ravisMonth>) =>
  shifts.map((s) => ({
    worker_id: worker,
    org_id: org,
    site_id: site,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    break_minutes: s.breakMinutes,
    source: 'worker',
    time_source: 'server_clock',
    status: 'recorded',
    client_request_id: randomUUID(),
  }));
await must(admin.from('shifts').insert(shiftRows(id.ravi, shakti.id, towerB.id, ravisMonth())).select('id'), 'ravi shifts');
await must(admin.from('shifts').insert(shiftRows(id.meena, sunrise.id, ward3.id, meenasMonth())).select('id'), 'meena shifts');

await must(
  admin.from('payslips').insert([
    {
      worker_id: id.ravi, org_id: shakti.id, period_start: '2026-09-01', period_end: '2026-09-30',
      components: ravisPayslipComponents, deductions: [], gross_paise: 1540000, net_paise: 1540000,
      status: 'paid', paid_on: '2026-10-05', created_by: id.priya,
    },
    {
      worker_id: id.meena, org_id: sunrise.id, period_start: '2026-09-01', period_end: '2026-09-30',
      components: meenasPayslipComponents,
      deductions: [{ label: 'Provident Fund (employee share) – demo', amount_paise: 216000 }],
      gross_paise: 2275386, net_paise: 2059386, status: 'issued', created_by: id.kavya,
    },
  ]).select('id'),
  'payslips',
);

// ── incidents (same shape the RPCs produce) ──────────────────────────────────
type Ev = { kind?: string; from?: string; to?: string; body?: string; actor: 'reporter' | 'investigator'; actorId: string | null; visible?: boolean };
type Inc = {
  org: string; mode: 'identified' | 'confidential' | 'anonymous'; category: string; severity: string;
  description: string; location?: string; status: string; reporter?: string; ref?: string; token?: string; events: Ev[];
};
async function addIncident(i: Inc) {
  const [row] = await must(
    admin.from('incidents').insert({
      org_id: i.org, reference_code: i.ref ?? refCode(), mode: i.mode, category: i.category, severity: i.severity,
      description: i.description, location_text: i.location ?? null, status: i.status,
      tracking_token_hash: i.mode === 'anonymous' ? sha256(i.token ?? randomBytes(32).toString('base64url')) : null,
    }).select('id, reference_code'),
    'incident',
  );
  if (i.reporter) await must(admin.from('incident_reporters').insert({ incident_id: row.id, reporter_id: i.reporter }).select('incident_id'), 'reporter');
  for (const [n, e] of i.events.entries()) {
    await must(
      admin.from('incident_events').insert({
        incident_id: row.id, kind: e.kind ?? 'status', from_status: e.from ?? null, to_status: e.to ?? null,
        body: e.body ?? null, actor_kind: e.actor, actor_id: e.actorId, visible_to_reporter: e.visible ?? true,
        ...(n === 0 && i.mode === 'anonymous' ? { created_at: startOfToday() } : {}),
      }).select('id'),
      'incident event',
    );
  }
  return row.reference_code as string;
}

const submitted = (actorId: string | null): Ev => ({ to: 'submitted', actor: 'reporter', actorId });
const inv = (from: string, to: string, body: string): Ev => ({ from, to, body, actor: 'investigator', actorId: id.anita });

const DEMO_TRACK_REF = 'FS-DEMO0001';
const DEMO_TRACK_TOKEN = 'fairshift-demo-tracking-token-0001';
const anon = (category: string, severity: string, description: string, location: string, extra: Partial<Inc> = {}) =>
  addIncident({ org: shakti.id, mode: 'anonymous', category, severity, description, location, status: 'submitted', events: [submitted(null)], ...extra });

await anon('physical_hazard', 'high', '[DEMO] Loose boards on the third-level scaffold near the north stairs.', 'Tower B, level 3', { ref: DEMO_TRACK_REF, token: DEMO_TRACK_TOKEN });
await anon('physical_hazard', 'medium', '[DEMO] Open rebar ends without caps beside the material gate.', 'Tower B, gate 2');
await anon('physical_hazard', 'medium', '[DEMO] Wet floor near the mixer with no barrier or sign.', 'Mixer area');
await anon('physical_hazard', 'low', '[DEMO] Poor lighting on the basement ramp during evening shift.', 'Basement ramp');
await anon('harassment', 'high', '[DEMO] A foreman shouts and threatens workers who ask about overtime pay.', 'Tower B');
await anon('wages', 'medium', '[DEMO] Overtime hours are written in the register but not shown on the slip.', 'Site office');
await anon('unsafe_equipment', 'high', '[DEMO] The hoist brake sticks and the gate latch does not close.', 'Material hoist');

await addIncident({
  org: shakti.id, mode: 'identified', category: 'physical_hazard', severity: 'high', status: 'resolved', reporter: id.ravi,
  description: '[DEMO] The scaffold at the east wall has cracked boards and no toe-guard.', location: 'Tower B, east wall',
  events: [
    submitted(id.ravi),
    inv('submitted', 'acknowledged', 'Report received. An investigator has been assigned.'),
    inv('acknowledged', 'investigating', 'Site inspection scheduled for the east wall scaffold.'),
    inv('investigating', 'action_taken', 'Cracked boards replaced and a toe-guard fitted on the east wall.'),
    inv('action_taken', 'resolved', 'Re-inspection passed. Please tell us if the problem returns.'),
  ],
});
await addIncident({
  org: shakti.id, mode: 'confidential', category: 'harassment', severity: 'high', status: 'action_taken', reporter: id.ravi,
  description: '[DEMO] A supervisor makes demeaning remarks about my language in front of the crew.', location: 'Tower B',
  events: [
    submitted(id.ravi),
    inv('submitted', 'acknowledged', 'Report received. Only the investigator can see your name.'),
    inv('acknowledged', 'investigating', 'We are speaking with the people involved.'),
    inv('investigating', 'action_taken', 'Both people have been spoken to and the team roster was changed. We will check back in two weeks.'),
  ],
});
await addIncident({
  org: sunrise.id, mode: 'confidential', category: 'excessive_hours', severity: 'medium', status: 'submitted', reporter: id.meena,
  description: '[DEMO] Back-to-back night shifts with very little rest in Ward 3.', location: 'Ward 3',
  events: [submitted(id.meena)],
});

// ── one tiny evidence document for Ravi ──────────────────────────────────────
const pdf = new TextEncoder().encode(
  [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 220 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    '4 0 obj<</Length 56>>stream',
    'BT /F1 12 Tf 10 50 Td (Appointment letter - DEMO) Tj ET',
    'endstream endobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'trailer<</Root 1 0 R/Size 6>>',
    '%%EOF',
  ].join('\n'),
);
const storagePath = `${id.ravi}/${randomUUID()}.pdf`;
const up = await admin.storage.from('evidence').upload(storagePath, pdf, { contentType: 'application/pdf' });
if (up.error) throw new Error(`evidence upload: ${up.error.message}`);
await must(
  admin.from('evidence_documents').insert({
    owner_id: id.ravi, org_id: shakti.id, kind: 'agreement', title: 'Appointment letter (demo)',
    storage_path: storagePath, mime_type: 'application/pdf', size_bytes: pdf.byteLength, sha256: sha256(pdf),
  }).select('id'),
  'evidence row',
);

// ── summary ──────────────────────────────────────────────────────────────────
console.log('\nSeeded FairShift demo data (all fictional).\n');
console.table([
  { account: 'ravi@demo.fairshift.local', role: 'worker (construction, Hindi)' },
  { account: 'meena@demo.fairshift.local', role: 'worker (hospital)' },
  { account: 'suresh@demo.fairshift.local', role: 'supervisor (construction)' },
  { account: 'priya@demo.fairshift.local', role: 'payroll (construction)' },
  { account: 'anita@demo.fairshift.local', role: 'investigator (construction)' },
  { account: 'deepak@demo.fairshift.local', role: 'org_admin (construction)' },
  { account: 'kavya@demo.fairshift.local', role: 'payroll (hospital)' },
  { account: 'farhan@demo.fairshift.local', role: 'investigator (hospital)' },
]);
console.log('Password for all accounts: the DEMO_PASSWORD value in .env.local');
console.log(`Demo tracker: reference ${DEMO_TRACK_REF}, token ${DEMO_TRACK_TOKEN}  (open /track)`);
console.log(`Join codes: SHAKTI-DEMO, SUNRISE-DEMO. Department rows: ${ward3 ? 'ok' : 'missing'}\n`);
