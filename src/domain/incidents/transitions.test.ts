import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INVESTIGATOR_TRANSITIONS, nextStates, noteIsValid, queueOrder } from './transitions';

describe('incident transitions', () => {
  it('matches the list inside transition_incident in the SQL migration', () => {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261027000400_functions.sql'), 'utf8');
    const fn = sql.slice(sql.indexOf('create function public.transition_incident'), sql.indexOf('create function public._reporter_action'));
    const block = fn.slice(fn.indexOf('any (array['), fn.indexOf('])) then'));
    const fromSql = [...block.matchAll(/'([a-z_]+>[a-z_]+)'/g)].map((m) => m[1]);
    expect([...fromSql].sort()).toEqual([...INVESTIGATOR_TRANSITIONS].sort());
  });

  it('offers only the allowed next states', () => {
    expect(nextStates('submitted').sort()).toEqual(['acknowledged', 'closed_no_action']);
    expect(nextStates('investigating').sort()).toEqual(['action_taken', 'closed_no_action']);
    expect(nextStates('action_taken')).toEqual(['resolved']);
    expect(nextStates('resolved')).toEqual([]);
    expect(nextStates('escalated')).toEqual([]);
  });

  it('requires a 10+ character note for action_taken, resolved and closed_no_action only', () => {
    expect(noteIsValid('acknowledged', '')).toBe(true);
    expect(noteIsValid('action_taken', 'too short')).toBe(false);
    expect(noteIsValid('resolved', 'Scaffold boards replaced.')).toBe(true);
  });

  it('sorts open before closed, then severity, then age', () => {
    const rows = [
      { id: 'a', severity: 'low', status: 'submitted', submitted_on: '2026-09-01' },
      { id: 'b', severity: 'high', status: 'resolved', submitted_on: '2026-08-01' },
      { id: 'c', severity: 'high', status: 'submitted', submitted_on: '2026-09-05' },
      { id: 'd', severity: 'high', status: 'submitted', submitted_on: '2026-09-02' },
    ];
    expect(queueOrder(rows).map((r) => r.id)).toEqual(['d', 'c', 'a', 'b']);
  });
});
