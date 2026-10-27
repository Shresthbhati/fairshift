'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Heading, HStack, Stack, Text, Textarea } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, MoneyText, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { useT } from '@/lib/i18n-client';
import { workerTransition } from './actions';

type Dispute = {
  id: string; status: string; componentKind: string; claimedPaise: number; description: string;
  createdAt: string; payslipId: string; periodStart: string | null; periodEnd: string | null;
};
type Ev = { id: string; to: string | null; body: string | null; actor: string; at: string };
type Move = 'accepted_by_worker' | 'challenged' | 'escalated' | 'withdrawn';

// Which worker moves exist from each status (the database function enforces the same table).
const MOVES: Record<string, Move[]> = {
  submitted: ['withdrawn'],
  acknowledged: ['withdrawn'],
  responded: ['accepted_by_worker', 'challenged', 'escalated', 'withdrawn'],
  challenged: ['escalated', 'withdrawn'],
};
const LABEL: Record<Move, string> = {
  accepted_by_worker: 'pay.disputes.accept',
  challenged: 'pay.disputes.challenge',
  escalated: 'pay.disputes.escalate',
  withdrawn: 'pay.disputes.withdraw',
};

export function DisputeView({ dispute, events }: { dispute: Dispute; events: Ev[] }) {
  const t = useT();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const moves = MOVES[dispute.status] ?? [];

  const go = (to: Move) =>
    start(async () => {
      setError(null);
      const res = await workerTransition({ disputeId: dispute.id, to, body: note });
      if (!res.ok) return setError(res.error);
      setNote('');
      toaster.create({ title: t('pay.disputes.done'), type: 'success' });
      router.refresh();
    });

  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" alignSelf="flex-start" size="sm">
        <NextLink href={`/pay/payslips/${dispute.payslipId}`}>‹ {t('pay.payslip.title')}</NextLink>
      </FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">
        {t('pay.disputes.title')}
      </Heading>

      <PaperCard title={t(`pay.compare.${dispute.componentKind}`)} stamp={<StatusBadge kind="dispute" status={dispute.status} />}>
        <Stack gap="2">
          <Text>
            {t('pay.disputes.amount')}: <MoneyText paise={dispute.claimedPaise} fontWeight="700" />
          </Text>
          <Text>{dispute.description}</Text>
          <Text fontSize="sm" color="fg.muted">
            <DateText value={dispute.createdAt} style="datetime" /> · {t('pay.disputes.copyNote')}
          </Text>
        </Stack>
      </PaperCard>

      <PaperCard title={t('pay.disputes.timeline')}>
        {events.length === 0 ? (
          <EmptyState title={t('pay.disputes.noEvents')} />
        ) : (
          <Stack as="ol" listStyleType="none" m="0" p="0" gap="3">
            {events.map((e) => (
              <Stack as="li" key={e.id} gap="1" borderBottomWidth="1px" borderColor="border" pb="2">
                <HStack gap="2" wrap="wrap" justify="space-between">
                  <Text fontWeight="700" color={e.actor === 'employer' ? 'stamp.blue' : 'ledger.fg'}>
                    {t(e.actor === 'employer' ? 'pay.disputes.employer' : 'pay.disputes.you')}
                  </Text>
                  <DateText value={e.at} style="datetime" fontSize="sm" color="fg.muted" />
                </HStack>
                {e.to && <StatusBadge kind="dispute" status={e.to} />}
                {e.body && <Text>{e.body}</Text>}
              </Stack>
            ))}
          </Stack>
        )}
      </PaperCard>

      {dispute.status === 'responded' && (
        <Text role="status" fontWeight="600">
          {t('pay.disputes.employerReplied')}
        </Text>
      )}
      {dispute.status === 'escalated' && <Text color="fg.muted">{t('pay.disputes.escalateInfo')}</Text>}

      {moves.length > 0 && (
        <PaperCard title={t('pay.disputes.reply')}>
          <Stack gap="3">
            {error && (
              <Text role="alert" color="danger" fontWeight="600">
                {t(error)}
              </Text>
            )}
            <Field.Root>
              <Field.Label>{t('pay.disputes.replyNote')}</Field.Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} bgColor="white" />
            </Field.Root>
            {moves.map((m) => (
              <FsButton key={m} variant={m === 'accepted_by_worker' ? 'primary' : m === 'withdrawn' ? 'quiet' : 'secondary'} loading={pending} onClick={() => go(m)}>
                {t(LABEL[m])}
              </FsButton>
            ))}
            {moves.includes('escalated') && <Text fontSize="sm" color="fg.muted">{t('pay.disputes.escalateInfo')}</Text>}
          </Stack>
        </PaperCard>
      )}
    </Stack>
  );
}
