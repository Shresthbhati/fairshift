import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* env may already be set by the caller */
}

export const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. Only for setup and for asserting what RLS must hide. */
export const admin = createClient(URL_, SERVICE, opts);

export type Who = 'ravi' | 'meena' | 'suresh' | 'priya' | 'anita' | 'deepak' | 'kavya' | 'farhan';

/** A client signed in as a seeded demo user, plus their auth user id. */
export async function signIn(who: Who) {
  const client = createClient(URL_, ANON, opts);
  const { data, error } = await client.auth.signInWithPassword({
    email: `${who}@demo.fairshift.local`,
    password: process.env.DEMO_PASSWORD as string,
  });
  if (error || !data.user) throw new Error(`sign-in as ${who} failed: ${error?.message}`);
  return { client, id: data.user.id };
}

export async function orgId(namePart: string): Promise<string> {
  const { data, error } = await admin.from('organisations').select('id').ilike('name', `%${namePart}%`).single();
  if (error) throw new Error(error.message);
  return data.id;
}
