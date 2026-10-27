import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/** Only for client components that truly need the browser session. Prefer server actions. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
