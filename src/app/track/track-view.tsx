'use client';

import NextLink from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Box, Field, Heading, HStack, Input, Stack, Text, Textarea } from '@chakra-ui/react';
import { DateText, FsButton, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { LanguageSwitch } from '@/components/fs/shell';
import { useT } from '@/lib/i18n-client';
import { trackIncident, trackRespond, type TrackData } from './actions';

export function TrackView({ initialRef }: { initialRef: string }) {
  const t = useT();
  const [reference, setReference] = useState(initialRef);
  const [token, setToken] = useState('');
  const [data, setData] = useState<TrackData | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // If this device saved the code (opt-in), prefill it. Nothing is read from or written to the URL.
  useEffect(() => {
    if (!initialRef) return;
    try {
      const hit = (JSON.parse(localStorage.getItem('fs.anon') ?? '[]') as { ref: string; token: string }[]).find((s) => s.ref === initialRef);
      if (hit) setToken(hit.token);
    } catch {
      /* no saved code */
    }
  }, [initialRef]);

  const check = () =>
    start(async () => {
      setError(null);
      const res = await trackIncident({ reference, token });
      if (!res.ok || !res.data) return setError(res.ok ? 'report.track.notFound' : res.error);
      setData(res.data);
    });

  const reply = (action: 'comment' | 'confirm' | 'reopen' | 'escalate') =>
    start(async () => {
      setError(null);
      const res = await trackRespond({ reference, token, action, body: note });
      if (!res.ok || !res.data) return setError(res.ok ? 'common.errors.generic' : res.error);
      setData(res.data);
      setNote('');
    });

  const s = data?.status;
  return (
    <Box as="main" id="main" maxW="560px" mx="auto" px="4" py="6">
      <Stack gap="4">
        <HStack justify="space-between" wrap="wrap">
          <Text fontFamily="heading" fontWeight="800" fontSize="lg" color="ledger.fg">{t('common.appName')}</Text>
          <LanguageSwitch />
        </HStack>
        <Heading as="h1" fontFamily="heading" size="xl">{t('report.track.title')}</Heading>

        {!data ? (
          <PaperCard>
            <form onSubmit={(e) => { e.preventDefault(); check(); }}>
              <Stack gap="4">
                <Text color="fg.muted">{t('report.track.intro')}</Text>
                {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
                <Field.Root required>
                  <Field.Label>{t('report.track.reference')}</Field.Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="FS-XXXXXXXX" autoComplete="off" minH="48px" bgColor="white" />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>{t('report.track.token')}</Field.Label>
                  <Input value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" minH="48px" bgColor="white" />
                </Field.Root>
                <FsButton type="submit" loading={pending}>{t('report.track.check')}</FsButton>
              </Stack>
            </form>
          </PaperCard>
        ) : (
          <Stack gap="4">
            <PaperCard title={data.reference_code} stamp={<StatusBadge kind="incident" status={data.status} />}>
              <Text>{t(`report.category.${data.category}`)} · {t(`report.severity.${data.severity}`)} · <DateText value={data.submitted_on} /></Text>
            </PaperCard>
            <PaperCard title={t('report.track.updates')}>
              {data.events.length === 0 ? (
                <Text color="fg.muted">{t('report.track.noUpdates')}</Text>
              ) : (
                <Stack as="ol" listStyleType="none" m="0" p="0" gap="3">
                  {data.events.map((e, i) => (
                    <Stack as="li" key={i} gap="1" borderBottomWidth="1px" borderColor="border" pb="2">
                      <DateText value={e.created_at} style="datetime" fontSize="sm" color="fg.muted" />
                      {e.to_status && <StatusBadge kind="incident" status={e.to_status} />}
                      {e.body && <Text>{e.body}</Text>}
                    </Stack>
                  ))}
                </Stack>
              )}
            </PaperCard>
            <PaperCard title={t('report.case.actions')}>
              <Stack gap="3">
                {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
                <Field.Root>
                  <Field.Label>{t('report.case.note')}</Field.Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} bgColor="white" />
                  <Field.HelperText>{t('report.case.reopenNote')}</Field.HelperText>
                </Field.Root>
                {s === 'resolved' && <FsButton loading={pending} onClick={() => reply('confirm')}>{t('report.case.confirm')}</FsButton>}
                {(s === 'resolved' || s === 'closed_no_action') && <FsButton variant="secondary" loading={pending} onClick={() => reply('reopen')}>{t('report.case.reopen')}</FsButton>}
                <FsButton variant="secondary" loading={pending} disabled={!note.trim()} onClick={() => reply('comment')}>{t('report.track.reply')}</FsButton>
                {s !== 'escalated' && <FsButton variant="quiet" loading={pending} onClick={() => reply('escalate')}>{t('report.case.escalate')}</FsButton>}
                <Text fontSize="sm" color="fg.muted">{t('report.case.escalateInfo')}</Text>
              </Stack>
            </PaperCard>
            <FsButton variant="secondary" onClick={() => { setData(null); setToken(''); }}>{t('common.back')}</FsButton>
          </Stack>
        )}
        <Text textAlign="center"><NextLink href="/login" style={{ textDecoration: 'underline', color: '#185641' }}>{t('report.track.signIn')}</NextLink></Text>
      </Stack>
    </Box>
  );
}
