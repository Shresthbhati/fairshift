'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';

/** Every server action returns this; `error` is an i18n key, never a raw database or Zod message. */
export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const COOKIE_OPTS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const };

const Credentials = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = Credentials.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'auth.invalid' };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: 'auth.invalid' };
  // A language picked on this device wins; otherwise fall back to the profile's preference.
  const store = await cookies();
  if (!isLocale(store.get(LOCALE_COOKIE)?.value)) {
    const { data: profile } = await supabase.from('profiles').select('preferred_locale').eq('id', data.user.id).single();
    if (profile) store.set(LOCALE_COOKIE, profile.preferred_locale, COOKIE_OPTS);
  }
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function setLocale(locale: unknown): Promise<ActionResult> {
  if (!isLocale(locale)) return { ok: false, error: 'common.errors.invalid' };
  (await cookies()).set(LOCALE_COOKIE, locale, COOKIE_OPTS);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from('profiles').update({ preferred_locale: locale }).eq('id', user.id);
  revalidatePath('/', 'layout');
  return { ok: true };
}
