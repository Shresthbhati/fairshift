'use client';

import NextLink from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Heading, HStack, Input, Stack, Text, Textarea } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { useT } from '@/lib/i18n-client';
import { attachmentUrl, markSeen, respond, uploadIncidentFile } from './actions';

type Incident = { id: string; reference: string; category: string; severity: string; mode: string; status: string; description: string; location: string | null; date: string };
type Ev = { id: string; kind: string; to: string | null; body: string | null; actor: string; at: string };
type FileRow = { id: string; mime: string; size: number };
type Action = 'comment' | 'confirm' | 'reopen' | 'escalate';

export function CaseView({ incident, events, files }: { incident: Incident; events: Ev[]; files: FileRow[] }) {
  const t = useT();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const s = incident.status;

  useEffect(() => {
    markSeen();
  }, []);

  const act = (action: Action) =>
    start(async () => {
      setError(null);
      const res = await respond({ incidentId: incident.id, action, body: note });
      if (!res.ok) return setError(res.error);
      setNote('');
      toaster.create({ title: t('report.case.done'), type: 'success' });
      router.refresh();
    });

  const open = (id: string) =>
    start(async () => {
      const res = await attachmentUrl(id);
      if (res.ok && res.data) window.open(res.data.url, '_blank', 'noopener');
      else setError(res.ok ? 'common.errors.generic' : res.error);
    });

  const upload = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    start(async () => {
      setError(null);
      const form = new FormData();
      form.set('incidentId', incident.id);
      form.set('file', file);
      const res = await uploadIncidentFile(form);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  };

  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" size="sm" alignSelf="flex-start">
        <NextLink href="/report">‹ {t('report.case.back')}</NextLink>
      </FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">
        {t('report.case.title')}
      </Heading>

      <PaperCard title={incident.reference} stamp={<StatusBadge kind="incident" status={s} />}>
        <Stack gap="2">
          <Text fontWeight="600">{t(`report.category.${incident.category}`)} · {t(`report.severity.${incident.severity}`)} · {t(`report.mode.${incident.mode}.title`)}</Text>
          <Text whiteSpace="pre-wrap">{incident.description}</Text>
          {incident.location && <Text color="fg.muted">{t('report.case.location')}: {incident.location}</Text>}
          <Text fontSize="sm" color="fg.muted"><DateText value={incident.date} /></Text>
        </Stack>
      </PaperCard>

      <PaperCard title={t('report.case.files')}>
        <Stack gap="2">
          {files.length === 0 ? (
            <Text color="fg.muted">{t('report.case.noFiles')}</Text>
          ) : (
            files.map((f) => (
              <HStack key={f.id} justify="space-between">
                <Text fontSize="sm">{f.mime} · {(f.size / 1024).toFixed(0)} KB</Text>
                <FsButton size="sm" variant="secondary" onClick={() => open(f.id)} disabled={pending}>{t('report.case.openFile')}</FsButton>
              </HStack>
            ))
          )}
          <Field.Root>
            <Field.Label>{t('report.case.addFile')}</Field.Label>
            <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files)} pt="2" bgColor="white" />
            <Field.HelperText>{t('report.attachmentsHelp')}</Field.HelperText>
          </Field.Root>
        </Stack>
      </PaperCard>

      <PaperCard title={t('report.case.timeline')}>
        {events.length === 0 ? (
          <EmptyState title={t('report.case.noUpdates')} />
        ) : (
          <Stack as="ol" listStyleType="none" m="0" p="0" gap="3">
            {events.map((e) => (
              <Stack as="li" key={e.id} gap="1" borderBottomWidth="1px" borderColor="border" pb="2">
                <HStack justify="space-between" wrap="wrap" gap="2">
                  <Text fontWeight="700" color={e.actor === 'investigator' ? 'stamp.blue' : 'ledger.fg'}>
                    {t(`report.case.${e.actor === 'investigator' ? 'investigator' : e.actor === 'reporter' ? 'you' : 'system'}`)}
                  </Text>
                  <DateText value={e.at} style="datetime" fontSize="sm" color="fg.muted" />
                </HStack>
                {e.to && <StatusBadge kind="incident" status={e.to} />}
                {e.body && <Text>{e.body}</Text>}
              </Stack>
            ))}
          </Stack>
        )}
      </PaperCard>

      {s === 'escalated' && <Text color="fg.muted">{t('report.case.escalateInfo')}</Text>}

      <PaperCard title={t('report.case.actions')}>
        <Stack gap="3">
          {error && (
            <Text role="alert" color="danger" fontWeight="600">
              {t(error)}
            </Text>
          )}
          <Field.Root>
            <Field.Label>{t('report.case.note')}</Field.Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} bgColor="white" />
            <Field.HelperText>{t('report.case.reopenNote')}</Field.HelperText>
          </Field.Root>
          {s === 'resolved' && <FsButton loading={pending} onClick={() => act('confirm')}>{t('report.case.confirm')}</FsButton>}
          {(s === 'resolved' || s === 'closed_no_action') && (
            <FsButton variant="secondary" loading={pending} onClick={() => act('reopen')}>{t('report.case.reopen')}</FsButton>
          )}
          <FsButton variant="secondary" loading={pending} disabled={!note.trim()} onClick={() => act('comment')}>{t('report.case.comment')}</FsButton>
          {s !== 'escalated' && <FsButton variant="quiet" loading={pending} onClick={() => act('escalate')}>{t('report.case.escalate')}</FsButton>}
          <Text fontSize="sm" color="fg.muted">{t('report.case.escalateInfo')}</Text>
        </Stack>
      </PaperCard>
    </Stack>
  );
}
