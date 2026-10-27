import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Service-role client (bypasses RLS). Allowed callers are listed in scripts/check-no-service-role.ts:
 * the anonymous incident submit and the anonymous tracker, nothing else in the app.
 */
export function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
