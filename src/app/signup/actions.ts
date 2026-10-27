'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import type { ActionResult } from '@/app/login/actions';
import { LOCALE_COOKIE } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';

const NOTICE_VERSION = 'privacy-v1'; // a 'use server' file may only export async functions

const schema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.email(),
  password: z.string().min(8).max(200),
  locale: z.enum(['en', 'hi']),
  consent: z.literal(true),
});

/** Self sign-up: only a display name is required. The profile is created by a database trigger from the metadata. */
export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => String(i.path[0]));
    if (keys.includes('consent')) return { ok: false, error: 'auth.signup.consentRequired' };
    if (keys.includes('password')) return { ok: false, error: 'auth.signup.weakPassword' };
    if (keys.includes('displayName')) return { ok: false, error: 'auth.signup.nameRequired' };
    return { ok: false, error: 'common.errors.invalid' };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: { data: { display_name: v.displayName, locale: v.locale } },
  });
  if (error || !data.user) {
    if (error && /registered|already/i.test(error.message)) return { ok: false, error: 'auth.signup.emailTaken' };
    return { ok: false, error: 'common.errors.generic' };
  }
  if (data.session) await supabase.from('consent_records').insert({ user_id: data.user.id, notice_version: NOTICE_VERSION });
  (await cookies()).set(LOCALE_COOKIE, v.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return { ok: true };
}
