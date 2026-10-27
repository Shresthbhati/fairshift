import 'server-only';
import { cookies } from 'next/headers';
import fs from 'node:fs';
import path from 'node:path';
import { LOCALE_COOKIE, NAMESPACES, isLocale, translate, type Locale, type Messages, type Params } from './i18n';

const cache = new Map<Locale, Messages>();

/** Merges messages/<locale>/<namespace>.json into { namespace: {...} }. Cached per process. */
export function loadMessages(locale: Locale): Messages {
  const hit = cache.get(locale);
  if (hit) return hit;
  const merged: Messages = {};
  for (const ns of NAMESPACES) {
    const file = path.join(process.cwd(), 'messages', locale, `${ns}.json`);
    merged[ns] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  }
  if (process.env.NODE_ENV === 'production') cache.set(locale, merged);
  return merged;
}

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : 'en';
}

export async function getT() {
  const locale = await getLocale();
  const messages = loadMessages(locale);
  return Object.assign((key: string, params?: Params) => translate(messages, key, params), { locale });
}
