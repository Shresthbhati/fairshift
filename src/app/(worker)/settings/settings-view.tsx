'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Heading, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { FsButton, PaperCard } from '@/components/fs/primitives';
import { formatDate } from '@/lib/i18n';
import { LanguageSwitch } from '@/components/fs/shell';
import { toaster } from '@/components/ui/toaster';
import { useT } from '@/lib/i18n-client';
import { joinOrg, updateName } from './actions';

export function SettingsView({
  name, email, consent, workplaces,
}: {
  name: string; email: string; consent: { version: string; at: string } | null;
  workplaces: { id: string; org: string; role: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const [newName, setNewName] = useState(name);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: { org: string } }>, onOk: (d?: { org: string }) => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? 'common.errors.generic');
      onOk(res.data);
      router.refresh();
    });

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('auth.settings.title')}</Heading>
      {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}

      <PaperCard title={t('common.language')}><LanguageSwitch /></PaperCard>

      <PaperCard title={t('auth.settings.name')}>
        <Stack gap="3">
          <Text fontSize="sm" color="fg.muted">{email}</Text>
          <Field.Root>
            <Field.Label>{t('auth.settings.name')}</Field.Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} minH="48px" bgColor="white" />
          </Field.Root>
          <FsButton loading={pending} alignSelf="flex-start" onClick={() => run(() => updateName({ name: newName }), () => toaster.create({ title: t('auth.settings.nameSaved'), type: 'success' }))}>
            {t('auth.settings.saveName')}
          </FsButton>
        </Stack>
      </PaperCard>

      <PaperCard title={t('auth.settings.workplaces')}>
        <Stack gap="1">
          {workplaces.map((w) => (
            <Text key={w.id}>{w.org} · <Text as="span" color="fg.muted">{t(`common.roles.${w.role}`)}</Text></Text>
          ))}
        </Stack>
      </PaperCard>

      <PaperCard title={t('auth.settings.join')}>
        <Stack gap="3">
          <Text color="fg.muted">{t('auth.settings.joinHelp')}</Text>
          <HStack align="flex-end" gap="3">
            <Field.Root flex="1">
              <Field.Label>{t('auth.settings.joinCode')}</Field.Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" minH="48px" bgColor="white" />
            </Field.Root>
            <FsButton loading={pending} onClick={() => run(() => joinOrg({ code }), (d) => { setCode(''); toaster.create({ title: t('auth.settings.joined', { org: d?.org ?? '' }), type: 'success' }); })}>
              {t('auth.settings.joinBtn')}
            </FsButton>
          </HStack>
        </Stack>
      </PaperCard>

      <PaperCard title={t('auth.settings.privacy')}>
        <Text>{consent ? t('auth.settings.consentOn', { version: consent.version, date: formatDate(consent.at, t.locale, 'date') }) : t('auth.settings.noConsent')}</Text>
      </PaperCard>
    </Stack>
  );
}
