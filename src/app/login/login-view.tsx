'use client';

import NextLink from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Field, Heading, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { FsButton, PaperCard } from '@/components/fs/primitives';
import { LanguageSwitch } from '@/components/fs/shell';
import { useT } from '@/lib/i18n-client';
import { signIn } from './actions';

const DEMO_USERS = ['ravi', 'meena', 'suresh', 'priya', 'anita', 'deepak', 'kavya', 'farhan'] as const;

export function LoginView({ demoPassword }: { demoPassword: string | null }) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submitRef = useRef<HTMLButtonElement>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await signIn({ email: email.trim(), password });
      if (!res.ok) return setError(res.error);
      router.replace('/');
      router.refresh();
    });

  return (
    <Box as="main" id="main" maxW="460px" mx="auto" px="4" py="6">
      <Stack gap="5">
        <Box alignSelf="flex-end">
          <LanguageSwitch />
        </Box>
        <Stack gap="1">
          <Heading as="h1" fontFamily="heading" size="2xl" color="ledger.fg">
            {t('auth.title')}
          </Heading>
          <Text color="fg.muted">{t('auth.subtitle')}</Text>
        </Stack>

        <PaperCard>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Stack gap="4">
              {error && (
                <Text role="alert" color="danger" fontWeight="600">
                  {t(error)}
                </Text>
              )}
              <Field.Root required invalid={!!error}>
                <Field.Label>{t('auth.email')}</Field.Label>
                <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} minH="48px" bgColor="white" />
              </Field.Root>
              <Field.Root required invalid={!!error}>
                <Field.Label>{t('auth.password')}</Field.Label>
                <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} minH="48px" bgColor="white" />
              </Field.Root>
              <FsButton ref={submitRef} type="submit" loading={pending} w="full">
                {t('auth.signIn')}
              </FsButton>
            </Stack>
          </form>
        </PaperCard>

        {demoPassword !== null && (
          <PaperCard title={t('auth.demoTitle')}>
            <Text fontSize="sm" color="fg.muted" mb="3">
              {t('auth.demoHint')} {t('auth.demoFill')}
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap="2">
              {DEMO_USERS.map((u) => (
                <FsButton
                  key={u}
                  variant="secondary"
                  size="sm"
                  justifyContent="flex-start"
                  onClick={() => {
                    setEmail(`${u}@demo.fairshift.local`);
                    setPassword(demoPassword);
                    setError(null);
                    submitRef.current?.focus();
                  }}
                >
                  {t(`auth.demo.${u}`)}
                </FsButton>
              ))}
            </SimpleGrid>
          </PaperCard>
        )}

        <Text textAlign="center" color="fg.muted">
          {t('auth.newHere')}{' '}
          <NextLink href="/signup" style={{ color: '#185641', fontWeight: 600, textDecoration: 'underline' }}>
            {t('auth.createAccount')}
          </NextLink>
        </Text>
      </Stack>
    </Box>
  );
}
