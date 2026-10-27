// UI mirror of the transition table in supabase/migrations/…_functions.sql (transition_incident).
// The database is the authority; transitions.test.ts fails if this list and the SQL ever disagree.
export type IncidentStatus =
  | 'submitted' | 'acknowledged' | 'investigating' | 'action_taken'
  | 'resolved' | 'closed_no_action' | 'reopened' | 'escalated';

export const INVESTIGATOR_TRANSITIONS = [
  'submitted>acknowledged',
  'acknowledged>investigating',
  'reopened>investigating',
  'investigating>action_taken',
  'action_taken>resolved',
  'submitted>closed_no_action',
  'acknowledged>closed_no_action',
  'investigating>closed_no_action',
] as const;

/** Steps that need a note of at least 10 characters. */
export const NOTE_REQUIRED: readonly IncidentStatus[] = ['action_taken', 'resolved', 'closed_no_action'];

export const nextStates = (from: string): IncidentStatus[] =>
  INVESTIGATOR_TRANSITIONS.filter((p) => p.startsWith(`${from}>`)).map((p) => p.split('>')[1] as IncidentStatus);

export const noteIsValid = (to: string, body: string) =>
  !NOTE_REQUIRED.includes(to as IncidentStatus) || body.trim().length >= 10;

const SEVERITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const CLOSED = ['resolved', 'closed_no_action'];

/** Queue order: open before closed, then most serious, then oldest. */
export function queueOrder<T extends { severity: string; status: string; submitted_on: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(CLOSED.includes(a.status)) - Number(CLOSED.includes(b.status)) ||
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      a.submitted_on.localeCompare(b.submitted_on),
  );
}
