'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Checkbox, Field, Heading, Input, Stack, Text } from '@chakra-ui/react';
import { FsButton, PaperCard } from '@/components/fs/primitives';
import { LanguageSwitch } from '@/components/fs/shell';
import { useT } from '@/lib/i18n-client';
import { signUp } from './actions';

export function SignupView() {
  const t = useT();
  const router = useRouter();
  const [f, setF] = useState({ displayName: '', email: '', password: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await signUp({ ...f, locale: t.locale, consent });
      if (!res.ok) return setError(res.error);
      router.replace('/');
      router.refresh();
    });

  return (
    <Box as="main" id="main" maxW="460px" mx="auto" px="4" py="6">
      <Stack gap="4">
        <Stack gap="1">
          <Text fontWeight="700">{t('auth.signup.chooseLanguage')}</Text>
          <LanguageSwitch />
        </Stack>
        <Heading as="h1" fontFamily="heading" size="2xl" color="ledger.fg">{t('auth.signup.title')}</Heading>
        <PaperCard>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Stack gap="4">
              {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
              <Field.Root required>
                <Field.Label>{t('auth.signup.displayName')}</Field.Label>
                <Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={80} autoComplete="name" minH="48px" bgColor="white" />
                <Field.HelperText>{t('auth.signup.displayNameHelp')}</Field.HelperText>
              </Field.Root>
              <Field.Root required>
                <Field.Label>{t('auth.email')}</Field.Label>
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" minH="48px" bgColor="white" />
              </Field.Root>
              <Field.Root required>
                <Field.Label>{t('auth.signup.password')}</Field.Label>
                <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" minH="48px" bgColor="white" />
              </Field.Root>
              <Box borderWidth="1px" borderColor="border" borderRadius="md" p="3" bgColor="bg.muted">
                <Heading as="h2" size="sm" mb="1">{t('auth.signup.privacyTitle')}</Heading>
                <Text fontSize="sm">{t('auth.signup.privacyBody')}</Text>
              </Box>
              <Checkbox.Root checked={consent} onCheckedChange={(e) => setConsent(e.checked === true)}>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{t('auth.signup.consent')}</Checkbox.Label>
              </Checkbox.Root>
              <FsButton type="submit" loading={pending}>{t('auth.signup.create')}</FsButton>
            </Stack>
          </form>
        </PaperCard>
        <Text textAlign="center">
          <NextLink href="/login" style={{ color: '#185641', textDecoration: 'underline' }}>{t('auth.haveAccount')}</NextLink>
        </Text>
      </Stack>
    </Box>
  );
}
