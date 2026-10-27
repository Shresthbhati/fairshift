import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { admin, orgId, signIn, type Who } from './helpers';

type Session = Awaited<ReturnType<typeof signIn>>;
const s = {} as Record<Who, Session>;
let shakti: string;
let sunrise: string;

beforeAll(async () => {
  for (const w of ['ravi', 'meena', 'suresh', 'priya', 'anita', 'deepak', 'kavya', 'farhan'] as Who[]) s[w] = await signIn(w);
  shakti = await orgId('Shakti');
  sunrise = await orgId('Sunrise');
});

describe('row level security', () => {
  it('RLS-1 a worker sees only their own shifts and payslips', async () => {
    const { data } = await s.ravi.client.from('shifts').select('worker_id');
    expect(data).toHaveLength(22);
    expect(data!.every((r) => r.worker_id === s.ravi.id)).toBe(true);
    const meenas = await admin.from('payslips').select('id').eq('worker_id', s.meena.id).single();
    const peek = await s.ravi.client.from('payslips').select('id').eq('id', meenas.data!.id);
    expect(peek.data).toEqual([]);
  });

  it('RLS-2 payroll sees only their own organisation', async () => {
    const kavya = await s.kavya.client.from('payslips').select('id').eq('org_id', shakti);
    expect(kavya.data).toEqual([]);
    const priya = await s.priya.client.from('payslips').select('id').eq('worker_id', s.ravi.id);
    expect(priya.data).toHaveLength(1);
  });

  it('RLS-3 a supervisor cannot read any incident', async () => {
    const { data } = await s.suresh.client.from('incidents').select('id');
    expect(data).toEqual([]);
  });

  it('RLS-4 payroll cannot read any incident', async () => {
    const { data } = await s.priya.client.from('incidents').select('id');
    expect(data).toEqual([]);
  });

  it('RLS-5 an investigator sees all 9 own-org incidents and none from the other org', async () => {
    const { data } = await s.anita.client.from('incidents').select('org_id');
    expect(data).toHaveLength(9);
    expect(data!.every((r) => r.org_id === shakti)).toBe(true);
    const farhan = await s.farhan.client.from('incidents').select('org_id');
    expect(farhan.data).toHaveLength(1);
    expect(farhan.data![0].org_id).toBe(sunrise);
  });

  it('RLS-6 anonymous incidents have no reporter row', async () => {
    const anon = await admin.from('incidents').select('id').eq('mode', 'anonymous');
    expect(anon.data!.length).toBeGreaterThanOrEqual(7);
    const ids = anon.data!.map((r) => r.id);
    const rows = await admin.from('incident_reporters').select('incident_id').in('incident_id', ids);
    expect(rows.data).toEqual([]);
  });

  it('RLS-7 reporter events on anonymous incidents carry no actor id', async () => {
    const anon = await admin.from('incidents').select('id').eq('mode', 'anonymous');
    const ids = anon.data!.map((r) => r.id);
    const { data } = await s.anita.client.from('incident_events').select('actor_kind, actor_id').in('incident_id', ids);
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.filter((e) => e.actor_kind === 'reporter').every((e) => e.actor_id === null)).toBe(true);
  });

  it('RLS-8 audit, rule-set and incident-event tables are immutable, even for the service role', async () => {
    const audit = await admin.from('audit_events').select('id').limit(1).single();
    const rule = await admin.from('wage_rule_sets').select('id').limit(1).single();
    const ev = await admin.from('incident_events').select('id').limit(1).single();
    const attempts = [
      admin.from('audit_events').update({ action: 'x' }).eq('id', audit.data!.id),
      admin.from('audit_events').delete().eq('id', audit.data!.id),
      admin.from('wage_rule_sets').update({ label: 'x' }).eq('id', rule.data!.id),
      admin.from('wage_rule_sets').delete().eq('id', rule.data!.id),
      admin.from('incident_events').update({ body: 'x' }).eq('id', ev.data!.id),
      admin.from('incident_events').delete().eq('id', ev.data!.id),
    ];
    for (const a of await Promise.all(attempts)) expect(a.error?.message).toMatch(/immutable_table/);
  });

  it('RLS-9 a supervisor edit is allowed and leaves an audit trail the worker can read', async () => {
    const mine = await s.ravi.client.from('shifts').select('id').order('started_at').limit(1).single();
    const upd = await s.suresh.client.from('shifts').update({ note: 'time corrected by supervisor' }).eq('id', mine.data!.id).select('id');
    expect(upd.error).toBeNull();
    expect(upd.data).toHaveLength(1);
    const { data } = await s.ravi.client.from('audit_events').select('changed').eq('row_id', mine.data!.id).eq('action', 'update');
    expect(data).toHaveLength(1);
    const changed = data![0].changed as { old: { note: string | null }; new: { note: string } };
    expect(changed.old.note).toBeNull();
    expect(changed.new.note).toBe('time corrected by supervisor');
  });

  it('RLS-10 employers cannot see evidence documents or files; audit never lists them', async () => {
    const doc = await admin.from('evidence_documents').select('id, storage_path').eq('owner_id', s.ravi.id).single();
    for (const who of ['priya', 'suresh', 'deepak'] as Who[]) {
      const rows = await s[who].client.from('evidence_documents').select('id');
      expect(rows.data).toEqual([]);
    }
    const listed = await s.priya.client.storage.from('evidence').list(s.ravi.id);
    expect(listed.data ?? []).toEqual([]);
    const signed = await s.priya.client.storage.from('evidence').createSignedUrl(doc.data!.storage_path, 60);
    expect(signed.error).not.toBeNull();
    const audit = await s.deepak.client.from('audit_events').select('id').eq('table_name', 'evidence_documents');
    expect(audit.data).toEqual([]);
    const own = await s.ravi.client.storage.from('evidence').createSignedUrl(doc.data!.storage_path, 60);
    expect(own.error).toBeNull();
  });

  it('IDEM-1 repeating a shift insert with the same client_request_id keeps one row', async () => {
    const key = randomUUID();
    const row = {
      worker_id: s.ravi.id, org_id: shakti, started_at: '2026-08-05T08:00:00+05:30', ended_at: '2026-08-05T16:00:00+05:30',
      break_minutes: 30, status: 'recorded', time_source: 'manual_entry', client_request_id: key,
    };
    for (let i = 0; i < 2; i++) {
      const r = await s.ravi.client.from('shifts').upsert(row, { onConflict: 'client_request_id', ignoreDuplicates: true });
      expect(r.error).toBeNull();
    }
    const { data } = await admin.from('shifts').select('id').eq('client_request_id', key);
    expect(data).toHaveLength(1);
  });

  it('LEAVE-1 after leaving an employer, its staff lose access but the worker keeps their own records', async () => {
    const profile = await s.kavya.client.from('profiles').select('id').eq('id', s.ravi.id);
    expect(profile.data).toEqual([]);
    const shifts = await s.kavya.client.from('shifts').select('id').eq('worker_id', s.ravi.id);
    expect(shifts.data).toEqual([]);
    const own = await s.ravi.client.from('profiles').select('id').eq('id', s.ravi.id);
    expect(own.data).toHaveLength(1);
    const ended = await s.ravi.client.from('memberships').select('status').eq('org_id', sunrise).single();
    expect(ended.data!.status).toBe('ended');
  });
});
