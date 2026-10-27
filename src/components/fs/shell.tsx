'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { setLocale, signOut } from '@/app/login/actions';
import { useT } from '@/lib/i18n-client';
import type { Locale } from '@/lib/i18n';
import { FsButton } from './primitives';

/** Two plain buttons rather than a menu: easiest on a low-end phone. */
export function LanguageSwitch() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (l: Locale) =>
    start(async () => {
      await setLocale(l);
      router.refresh();
    });
  return (
    <HStack as="div" role="group" aria-label={t('common.language')} gap="1">
      {(['en', 'hi'] as const).map((l) => (
        <FsButton
          key={l}
          size="sm"
          minH="40px"
          px="3"
          variant={t.locale === l ? 'primary' : 'secondary'}
          aria-pressed={t.locale === l}
          disabled={pending}
          onClick={() => pick(l)}
          lang={l}
        >
          {t(`common.lang.${l}`)}
        </FsButton>
      ))}
    </HStack>
  );
}

export function SignOutButton() {
  const t = useT();
  return (
    <form
      action={signOut}
      onSubmit={() => {
        try {
          localStorage.removeItem('fs.anon'); // saved anonymous tracking codes never outlive a session
        } catch {
          /* storage may be unavailable */
        }
      }}
    >
      <FsButton type="submit" variant="quiet" size="sm" minH="40px">
        {t('common.signOut')}
      </FsButton>
    </form>
  );
}

/** Top bar for worker and review screens. */
export function TopBar({ name, showReview }: { name: string; showReview?: boolean }) {
  const t = useT();
  return (
    <Box as="header" bgColor="bg.surface" borderBottomWidth="1px" borderColor="border" px="4" py="2" className="no-print">
      <HStack maxW="1100px" mx="auto" justify="space-between" gap="2" wrap="wrap">
        <Text fontFamily="heading" fontWeight="800" fontSize="lg" color="ledger.fg">
          {t('common.appName')}
          <Text as="span" fontWeight="500" fontSize="sm" color="fg.muted" ms="2">
            {name}
          </Text>
        </Text>
        <HStack gap="1" wrap="wrap">
          {showReview && (
            <FsButton asChild variant="quiet" size="sm" minH="40px">
              <NextLink href="/review">{t('common.reviewConsole')}</NextLink>
            </FsButton>
          )}
          <LanguageSwitch />
          <SignOutButton />
        </HStack>
      </HStack>
    </Box>
  );
}
