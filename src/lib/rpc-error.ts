/** Maps a Postgres function error to an i18n key. Raw database messages never reach the UI. */
export function mapRpcError(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? '';
  if (/invalid_transition/.test(m)) return 'common.errors.invalidStep';
  if (/body_required/.test(m)) return 'common.errors.bodyRequired';
  if (/forbidden|permission denied/.test(m) || error?.code === '42501') return 'common.errors.forbidden';
  if (/not_found|invalid_code/.test(m)) return 'common.errors.notFound';
  return 'common.errors.generic';
}
