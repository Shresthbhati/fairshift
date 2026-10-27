'use client';

import type { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/theme/system';
import { Toaster } from '@/components/ui/toaster';
import { I18nProvider } from '@/lib/i18n-client';
import type { Locale, Messages } from '@/lib/i18n';

export function Providers({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  return (
    <ChakraProvider value={system}>
      {/* Light theme only (outdoor use on low-end phones): no colour-mode provider, base tokens apply. */}
      <I18nProvider locale={locale} messages={messages}>
        {children}
        <Toaster />
      </I18nProvider>
    </ChakraProvider>
  );
}
