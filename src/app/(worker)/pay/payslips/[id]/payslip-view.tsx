'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CloseButton, Drawer, Field, Heading, NativeSelect, Portal, Stack, Text, Textarea } from '@chakra-ui/react';
import type { CompareRow } from '@/domain/pay';
import { ComparisonTable, PayslipSheet, type PayslipData } from '@/components/fs/PayslipSheet';
import { DateText, FsButton, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { formatMoney } from '@/lib/i18n';
import { useT } from '@/lib/i18n-client';
import { submitDispute } from './actions';

const KINDS = ['base', 'overtime', 'allowance', 'other', 'total'] as const;

export function PayslipView({
  slip, month, rows, disputes,
}: {
  slip: PayslipData & { id: string };
  month: string;
  rows: CompareRow[] | null;
  disputes: { id: string; status: string; createdAt: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const flagged = rows?.filter((r) => r.kind !== 'total' && r.status !== 'matches') ?? [];
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]>((flagged[0]?.kind as (typeof KINDS)[number]) ?? 'total');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [key] = useState(() => crypto.randomUUID());
  const chosen = rows?.find((r) => r.kind === kind);

  const send = () =>
    start(async () => {
      setError(null);
      const res = await submitDispute({ payslipId: slip.id, componentKind: kind, description, clientRequestId: key });
      if (!res.ok) return setError(res.error);
      toaster.create({ title: t('pay.disputes.sent'), type: 'success' });
      router.push(`/pay/disputes/${res.data?.id}`);
    });

  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" alignSelf="flex-start" size="sm">
        <NextLink href={`/pay?month=${month}`}>‹ {t('pay.payslip.back')}</NextLink>
      </FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">
        {t('pay.payslip.title')}
      </Heading>
      <PayslipSheet slip={slip} />
      {rows ? <ComparisonTable rows={rows} /> : null}

      {flagged.length > 0 && (
        <FsButton onClick={() => setOpen(true)}>{t('pay.payslip.ask')}</FsButton>
      )}

      {disputes.length > 0 && (
        <PaperCard title={t('pay.disputes.title')}>
          <Stack gap="2">
            {disputes.map((d) => (
              <FsButton key={d.id} asChild variant="secondary" justifyContent="space-between">
                <NextLink href={`/pay/disputes/${d.id}`}>
                  <DateText value={d.createdAt} />
                  <StatusBadge kind="dispute" status={d.status} />
                </NextLink>
              </FsButton>
            ))}
          </Stack>
        </PaperCard>
      )}

      <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="bottom">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bgColor="bg.surface" borderTopRadius="lg" maxH="92vh">
              <Drawer.Header>
                <Drawer.Title fontFamily="heading">{t('pay.disputes.askTitle')}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap="4">
                  {error && (
                    <Text role="alert" color="danger" fontWeight="600">
                      {t(error)}
                    </Text>
                  )}
                  <Field.Root>
                    <Field.Label>{t('pay.disputes.component')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={kind} onChange={(e) => setKind(e.currentTarget.value as (typeof KINDS)[number])} minH="48px" bgColor="white">
                        {KINDS.filter((k) => k !== 'other').map((k) => (
                          <option key={k} value={k}>
                            {t(`pay.compare.${k}`)}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  {chosen && (
                    <Text>
                      {t('pay.disputes.amount')}: <b>{formatMoney(chosen.differencePaise, t.locale)}</b>
                    </Text>
                  )}
                  <Field.Root required invalid={error === 'pay.disputes.errors.tooShort'}>
                    <Field.Label>{t('pay.disputes.description')}</Field.Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} bgColor="white" />
                    <Field.HelperText>{t('pay.disputes.descriptionHelp')}</Field.HelperText>
                  </Field.Root>
                  <Text fontSize="sm" color="fg.muted">
                    {t('pay.disputes.copyNote')}
                  </Text>
                </Stack>
              </Drawer.Body>
              <Drawer.Footer gap="3">
                <FsButton variant="secondary" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </FsButton>
                <FsButton loading={pending} onClick={send}>
                  {t('pay.disputes.send')}
                </FsButton>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <CloseButton position="absolute" top="2" insetEnd="2" aria-label={t('common.close')} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Stack>
  );
}
