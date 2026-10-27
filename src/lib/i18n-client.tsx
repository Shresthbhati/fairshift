'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { translate, type Locale, type Messages, type Params } from './i18n';

const Ctx = createContext<{ locale: Locale; messages: Messages }>({ locale: 'en', messages: {} });

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx).locale;
}

/** t('pay.title') or t('pay.hello', { name }). `t.locale` is the active locale. */
export function useT() {
  const { locale, messages } = useContext(Ctx);
  return useMemo(() => Object.assign((key: string, params?: Params) => translate(messages, key, params), { locale }), [locale, messages]);
}
