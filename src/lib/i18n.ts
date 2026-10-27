// Pure i18n helpers (safe in server and client code). The server-side loader lives in ./locale.ts.
export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = 'fs_locale';
export const NAMESPACES = ['common', 'auth', 'home', 'pay', 'shifts', 'report', 'vault', 'ledger', 'rights', 'review'] as const;

export type Messages = Record<string, Record<string, unknown>>;
export type Params = Record<string, string | number>;

export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'hi';

/** Looks up "ns.some.key", then fills {name} placeholders. A missing key returns the key itself. */
export function translate(messages: Messages, key: string, params?: Params): string {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }
  if (typeof node !== 'string') {
    if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return params ? node.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : node;
}

const intlLocale = (l: Locale) => (l === 'hi' ? 'hi-IN' : 'en-IN');

/** Money is stored as integer paise and only formatted here, at render time. */
export const formatMoney = (paise: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency: 'INR' }).format(paise / 100);

export type DateStyle = 'date' | 'datetime' | 'month' | 'time';
const DATE_OPTS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  datetime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  month: { month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
};

/** Everything is displayed in India time regardless of the viewer's device. */
export function formatDate(value: string | Date, locale: Locale, style: DateStyle = 'date') {
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
  return new Intl.DateTimeFormat(intlLocale(locale), { ...DATE_OPTS[style], timeZone: 'Asia/Kolkata' }).format(d);
}
