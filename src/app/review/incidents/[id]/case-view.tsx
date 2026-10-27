'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox, Field, Heading, HStack, RadioCard, Stack, Text, Textarea } from '@chakra-ui/react';
import { attachmentUrl } from '@/app/(worker)/report/[ref]/actions';
import { nextStates, noteIsValid, NOTE_REQUIRED } from '@/domain/incidents/transitions';
import { DateText, EmptyState, FsButton, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { useT } from '@/lib/i18n-client';
import { transition } from './actions';

type Incident = { id: string; reference: string; category: string; severity: string; mode: string; status: string; description: string; location: string | null; date: string };
type Ev = { id: string; to: string | null; body: string | null; actor: string; visible: boolean; at: string };
type FileRow = { id: string; mime: string; size: number };
type Step = 'acknowledged' | 'investigating' | 'action_taken' | 'resolved' | 'closed_no_action';

export function CaseView({ incident, reporterName, events, files }: { incident: Incident; reporterName: string | null; events: Ev[]; files: FileRow[] }) {
  const t = useT();
  const router = useRouter();
  const moves = nextStates(incident.status) as Step[];
  const [to, setTo] = useState<Step | ''>('');
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needsNote = !!to && NOTE_REQUIRED.includes(to);

  const apply = () =>
    start(async () => {
      setError(null);
      if (!to) return;
      if (!noteIsValid(to, note)) return setError('review.case.noteRequired');
      const res = await transition({ incidentId: incident.id, to, body: note, visible });
      if (!res.ok) return setError(res.error);
      setTo('');
      setNote('');
      toaster.create({ title: t('review.case.done'), type: 'success' });
      router.refresh();
    });

  const open = (id: string) =>
    start(async () => {
      const res = await attachmentUrl(id);
      if (res.ok && res.data) window.open(res.data.url, '_blank', 'noopener');
    });

  const identity =
    incident.mode === 'anonymous'
      ? t('review.case.identity.anonymous')
      : t(`review.case.identity.${incident.mode}`, { name: reporterName ?? '—' });

  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" size="sm" alignSelf="flex-start">
        <NextLink href="/review/incidents">‹ {t('review.case.back')}</NextLink>
      </FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">{incident.reference}</Heading>

      <PaperCard title={t(`report.category.${incident.category}`)} stamp={<StatusBadge kind="incident" status={incident.status} />}>
        <Stack gap="2">
          <Text fontWeight="600">{t(`report.severity.${incident.severity}`)} · {t(`report.mode.${incident.mode}.title`)} · <DateText value={incident.date} /></Text>
          <Text borderLeftWidth="4px" borderColor={incident.mode === 'anonymous' ? 'ink.500' : 'stamp.blue'} ps="3" fontWeight="600" data-testid="identity-block">
            {t('review.case.identity.title')}: {identity}
          </Text>
        </Stack>
      </PaperCard>

      <PaperCard title={t('review.case.description')}>
        <Text whiteSpace="pre-wrap">{incident.description}</Text>
        {incident.location && <Text color="fg.muted" mt="2">{incident.location}</Text>}
      </PaperCard>

      <PaperCard title={t('review.case.files')}>
        {files.length === 0 ? (
          <Text color="fg.muted">{t('review.case.noFiles')}</Text>
        ) : (
          <Stack gap="2">
            {files.map((f) => (
              <HStack key={f.id} justify="space-between">
                <Text fontSize="sm">{f.mime} · {(f.size / 1024).toFixed(0)} KB</Text>
                <FsButton size="sm" variant="secondary" disabled={pending} onClick={() => open(f.id)}>{t('review.case.openFile')}</FsButton>
              </HStack>
            ))}
          </Stack>
        )}
      </PaperCard>

      <PaperCard title={t('review.case.timeline')}>
        {events.length === 0 ? (
          <EmptyState title={t('report.case.noUpdates')} />
        ) : (
          <Stack as="ol" listStyleType="none" m="0" p="0" gap="3">
            {events.map((e) => (
              <Stack as="li" key={e.id} gap="1" borderBottomWidth="1px" borderColor="border" pb="2">
                <HStack justify="space-between" wrap="wrap" gap="2">
                  <Text fontWeight="700" color={e.actor === 'investigator' ? 'stamp.blue' : 'ledger.fg'}>{t(`review.case.actor.${e.actor}`)}</Text>
                  <DateText value={e.at} style="datetime" fontSize="sm" color="fg.muted" />
                </HStack>
                {e.to && <StatusBadge kind="incident" status={e.to} />}
                {e.body && <Text>{e.body}</Text>}
                {!e.visible && <Text fontSize="xs" color="warning" fontWeight="700">{t('review.case.hidden')}</Text>}
              </Stack>
            ))}
          </Stack>
        )}
      </PaperCard>

      <PaperCard title={t('review.case.move')}>
        {moves.length === 0 ? (
          <Text color="fg.muted">{t('review.case.noMoves')}</Text>
        ) : (
          <Stack gap="3">
            {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
            <RadioCard.Root value={to} onValueChange={(e) => setTo(e.value as Step)} colorPalette="ledger">
              <RadioCard.Label srOnly>{t('review.case.move')}</RadioCard.Label>
              <Stack gap="2">
                {moves.map((m) => (
                  <RadioCard.Item key={m} value={m} bgColor="bg.surface" borderColor="border">
                    <RadioCard.ItemHiddenInput />
                    <RadioCard.ItemControl p="3" alignItems="center">
                      <RadioCard.ItemContent>
                        <RadioCard.ItemText fontWeight="600">{t(`review.case.next.${m}`)}</RadioCard.ItemText>
                      </RadioCard.ItemContent>
                      <RadioCard.ItemIndicator />
                    </RadioCard.ItemControl>
                  </RadioCard.Item>
                ))}
              </Stack>
            </RadioCard.Root>
            <Field.Root invalid={error === 'review.case.noteRequired'}>
              <Field.Label>{t('review.case.note')}</Field.Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} bgColor="white" />
              {needsNote && <Field.HelperText>{t('review.case.noteRequired')}</Field.HelperText>}
            </Field.Root>
            <Checkbox.Root checked={visible} onCheckedChange={(e) => setVisible(e.checked === true)}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{t('review.case.visible')}</Checkbox.Label>
            </Checkbox.Root>
            <FsButton loading={pending} disabled={!to} onClick={apply}>{t('review.case.apply')}</FsButton>
          </Stack>
        )}
      </PaperCard>
    </Stack>
  );
}
