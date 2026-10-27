import { createHash, randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, orgId, signIn, type Who } from './helpers';

type Session = Awaited<ReturnType<typeof signIn>>;
const s = {} as Record<Who, Session>;
let shakti: string;

beforeAll(async () => {
  for (const w of ['ravi', 'suresh', 'priya', 'anita', 'deepak'] as Who[]) s[w] = await signIn(w);
  shakti = await orgId('Shakti');
});

const sha = (t: string) => createHash('sha256').update(t).digest('hex');
const msg = (e: { message: string } | null) => e?.message ?? '';

describe('security-definer functions', () => {
  it('RPC-1 the investigator state machine and note rules are enforced', async () => {
    const { data: inc } = await admin.from('incidents').select('id').eq('category', 'wages').single();
    const id = inc!.id;
    const jump = await s.anita.client.rpc('transition_incident', { p_incident: id, p_to: 'resolved', p_body: 'closing it now, nothing more' });
    expect(msg(jump.error)).toMatch(/invalid_transition/);
    for (const to of ['acknowledged', 'investigating'] as const) {
      const ok = await s.anita.client.rpc('transition_incident', { p_incident: id, p_to: to, p_body: null });
      expect(ok.error).toBeNull();
    }
    const short = await s.anita.client.rpc('transition_incident', { p_incident: id, p_to: 'action_taken', p_body: 'abc' });
    expect(msg(short.error)).toMatch(/body_required/);
    const good = await s.anita.client.rpc('transition_incident', { p_incident: id, p_to: 'action_taken', p_body: 'Register corrected and overtime paid out.', p_visible: true });
    expect(good.error).toBeNull();
    const resolved = await s.anita.client.rpc('transition_incident', { p_incident: id, p_to: 'resolved', p_body: 'Confirmed on the next payslip run.' });
    expect(resolved.error).toBeNull();
  });

  it('RPC-2 only an investigator can transition; the reporter can reopen their own resolved report', async () => {
    const { data: inc } = await admin.from('incidents').select('id').eq('category', 'wages').single();
    const forbidden = await s.suresh.client.rpc('transition_incident', { p_incident: inc!.id, p_to: 'acknowledged', p_body: null });
    expect(msg(forbidden.error)).toMatch(/forbidden/);
    const mine = await s.ravi.client.from('incidents').select('id').eq('status', 'resolved').single();
    const reopen = await s.ravi.client.rpc('reporter_respond', { p_incident: mine.data!.id, p_action: 'reopen', p_body: 'The scaffold problem has come back.' });
    expect(reopen.error).toBeNull();
    const after = await s.ravi.client.from('incidents').select('status').eq('id', mine.data!.id).single();
    expect(after.data!.status).toBe('reopened');
    const stranger = await s.suresh.client.rpc('reporter_respond', { p_incident: mine.data!.id, p_action: 'comment', p_body: 'hello' });
    expect(msg(stranger.error)).toMatch(/forbidden/);
  });

  it('RPC-3 a dispute cannot be resolved until the worker accepts', async () => {
    const slip = await s.ravi.client.from('payslips').select('id, org_id').single();
    const created = await s.ravi.client.from('wage_disputes').insert({
      worker_id: s.ravi.id, org_id: slip.data!.org_id, payslip_id: slip.data!.id, component_kind: 'overtime',
      claimed_difference_paise: 210000, description: 'Overtime on six long days is missing from my payslip.',
      client_request_id: randomUUID(),
    }).select('id').single();
    expect(created.error).toBeNull();
    const id = created.data!.id;
    const early = await s.priya.client.rpc('transition_dispute', { p_dispute: id, p_to: 'resolved', p_body: 'Resolved without asking the worker.' });
    expect(msg(early.error)).toMatch(/invalid_transition/);
    expect((await s.priya.client.rpc('transition_dispute', { p_dispute: id, p_to: 'acknowledged', p_body: null })).error).toBeNull();
    expect((await s.priya.client.rpc('transition_dispute', { p_dispute: id, p_to: 'responded', p_body: 'We checked the register and will issue the difference.' })).error).toBeNull();
    const stillEarly = await s.priya.client.rpc('transition_dispute', { p_dispute: id, p_to: 'resolved', p_body: 'Resolved before the worker replied.' });
    expect(msg(stillEarly.error)).toMatch(/invalid_transition/);
    expect((await s.ravi.client.rpc('transition_dispute', { p_dispute: id, p_to: 'accepted_by_worker', p_body: null })).error).toBeNull();
    expect((await s.priya.client.rpc('transition_dispute', { p_dispute: id, p_to: 'resolved', p_body: 'Difference paid with the next run.' })).error).toBeNull();
  });

  it('RPC-4 signed-in users cannot call the service-only functions', async () => {
    const a = await s.ravi.client.rpc('submit_anonymous_incident', {
      p_org: shakti, p_category: 'other', p_severity: 'low', p_description: 'direct call attempt', p_location: null, p_token_hash: sha('x'),
    });
    expect(a.error?.code).toBe('42501');
    const b = await s.ravi.client.rpc('get_incident_by_token', { p_token_hash: sha('x') });
    expect(b.error?.code).toBe('42501');
    const c = await s.ravi.client.rpc('_reporter_action', { p_incident: randomUUID(), p_action: 'comment', p_body: 'x', p_actor: s.ravi.id });
    expect(c.error).not.toBeNull();
  });

  it('RPC-5 insights hide small groups and are closed to workers', async () => {
    for (const who of ['anita', 'deepak'] as const) {
      const { data, error } = await s[who].client.rpc('incident_insights', { p_org: shakti });
      expect(error).toBeNull();
      expect(data!.every((r: { total: number }) => r.total >= 5)).toBe(true);
      expect(data!.map((r: { category: string }) => r.category)).toEqual(['physical_hazard']);
    }
    const worker = await s.ravi.client.rpc('incident_insights', { p_org: shakti });
    expect(msg(worker.error)).toMatch(/forbidden/);
  });

  it('RPC-6 the tracker returns only reporter-visible events and nothing for a wrong token', async () => {
    const token = 'fairshift-demo-tracking-token-0001';
    const ok = await admin.rpc('get_incident_by_token', { p_token_hash: sha(token) });
    expect(ok.error).toBeNull();
    expect(ok.data.reference_code).toBe('FS-DEMO0001');
    expect(ok.data.events.length).toBeGreaterThanOrEqual(1);
    const wrong = await admin.rpc('get_incident_by_token', { p_token_hash: sha('nope') });
    expect(wrong.data).toBeNull();
    const respond = await admin.rpc('anonymous_respond', { p_token_hash: sha(token), p_action: 'comment', p_body: 'Still unsafe this week.' });
    expect(respond.error).toBeNull();
    const reply = await s.anita.client.from('incident_events').select('actor_id').eq('body', 'Still unsafe this week.').single();
    expect(reply.data!.actor_id).toBeNull();
  });
});
