'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Heading, HStack, Stack, Text, Textarea } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, MoneyText, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { formatMoney } from '@/lib/i18n';
import { useT } from '@/lib/i18n-client';
import { employerTransition } from './actions';

type Dispute = { id: string; worker: string; status: string; component: string; paise: number; description: string; at: string };
type Ev = { id: string; to: string | null; body: string | null; actor: string; at: string };
type Move = 'acknowledged' | 'responded' | 'resolved';

const MOVE_BY_STATUS: Record<string, { to: Move; label: string }> = {
  submitted: { to: 'acknowledged', label: 'review.disputes.acknowledge' },
  acknowledged: { to: 'responded', label: 'review.disputes.reply' },
  challenged: { to: 'responded', label: 'review.disputes.reply' },
  accepted_by_worker: { to: 'resolved', label: 'review.disputes.resolve' },
};

export function DisputeView({ dispute, snapshot, events }: { dispute: Dispute; snapshot: { engine: string; totalPaise: number } | null; events: Ev[] }) {
  const t = useT();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const move = MOVE_BY_STATUS[dispute.status];

  const go = () =>
    start(async () => {
      if (!move) return;
      setError(null);
      const res = await employerTransition({ disputeId: dispute.id, to: move.to, body: note });
      if (!res.ok) return setError(res.error);
      setNote('');
      toaster.create({ title: t('review.disputes.done'), type: 'success' });
      router.refresh();
    });

  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" size="sm" alignSelf="flex-start">
        <NextLink href="/review/disputes">‹ {t('review.disputes.back')}</NextLink>
      </FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">{dispute.worker}</Heading>

      <PaperCard title={t('review.disputes.claim')} stamp={<StatusBadge kind="dispute" status={dispute.status} />}>
        <Stack gap="2">
          <Text fontWeight="600">{t(`pay.compare.${dispute.component}`)} · {t('review.disputes.amount')}: <MoneyText paise={dispute.paise} /></Text>
          <Text>{dispute.description}</Text>
          {snapshot && (
            <Text fontSize="sm" color="fg.muted">
              {t('review.disputes.snapshot')}: {t('review.disputes.snapshotNote', { engine: snapshot.engine, total: formatMoney(snapshot.totalPaise, t.locale) })}
            </Text>
          )}
          <Text fontSize="sm" color="fg.muted"><DateText value={dispute.at} style="datetime" /></Text>
        </Stack>
      </PaperCard>

      <PaperCard title={t('review.disputes.timeline')}>
        {events.length === 0 ? (
          <EmptyState title={t('pay.disputes.noEvents')} />
        ) : (
          <Stack as="ol" listStyleType="none" m="0" p="0" gap="3">
            {events.map((e) => (
              <Stack as="li" key={e.id} gap="1" borderBottomWidth="1px" borderColor="border" pb="2">
                <HStack justify="space-between" wrap="wrap">
                  <Text fontWeight="700" color={e.actor === 'employer' ? 'stamp.blue' : 'ledger.fg'}>{t(e.actor === 'employer' ? 'pay.disputes.employer' : 'review.disputes.worker')}</Text>
                  <DateText value={e.at} style="datetime" fontSize="sm" color="fg.muted" />
                </HStack>
                {e.to && <StatusBadge kind="dispute" status={e.to} />}
                {e.body && <Text>{e.body}</Text>}
              </Stack>
            ))}
          </Stack>
        )}
      </PaperCard>

      <PaperCard title={t('review.disputes.actions')}>
        <Stack gap="3">
          {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
          {move ? (
            <>
              <Field.Root>
                <Field.Label>{t('review.disputes.note')}</Field.Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} bgColor="white" />
              </Field.Root>
              <FsButton loading={pending} onClick={go}>{t(move.label)}</FsButton>
            </>
          ) : (
            <Text color="fg.muted">{dispute.status === 'responded' ? t('review.disputes.waiting') : t('review.disputes.nothing')}</Text>
          )}
          {dispute.status !== 'accepted_by_worker' && dispute.status !== 'resolved' && <Text fontSize="sm" color="fg.muted">{t('review.disputes.resolveNeeds')}</Text>}
        </Stack>
      </PaperCard>
    </Stack>
  );
}
