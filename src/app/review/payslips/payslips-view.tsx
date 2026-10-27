'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, Heading, HStack, Input, NativeSelect, Stack, Text } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, MoneyText, PaperCard, Stamp } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { formatMoney } from '@/lib/i18n';
import { useT } from '@/lib/i18n-client';
import { issuePayslip } from './actions';
import { rupeesToPaise } from './schemas';

type Slip = { id: string; worker: string; month: string; gross: number; net: number; status: string };
type Line = { label: string; kind: 'base' | 'overtime' | 'allowance' | 'other'; amount: string };
type Ded = { label: string; amount: string };
const KINDS = ['base', 'overtime', 'allowance', 'other'] as const;
const thisMonth = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);

export function PayslipsView({ slips, workers, canIssue }: { slips: Slip[]; workers: { id: string; name: string }[]; canIssue: boolean }) {
  const t = useT();
  const router = useRouter();
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? '');
  const [month, setMonth] = useState(thisMonth());
  const [lines, setLines] = useState<Line[]>([{ label: '', kind: 'base', amount: '' }]);
  const [deds, setDeds] = useState<Ded[]>([]);
  const [status, setStatus] = useState<'issued' | 'paid'>('issued');
  const [paidOn, setPaidOn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sum = (xs: { amount: string }[]) => xs.reduce((n, x) => n + (rupeesToPaise(x.amount) ?? 0), 0);
  const gross = sum(lines);
  const net = gross - sum(deds);

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await issuePayslip({ workerId, month, components: lines, deductions: deds, status, paidOn: paidOn || undefined });
      if (!res.ok) return setError(res.error);
      toaster.create({ title: t('review.payslips.done'), type: 'success' });
      setLines([{ label: '', kind: 'base', amount: '' }]);
      setDeds([]);
      router.refresh();
    });

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('review.payslips.title')}</Heading>

      {canIssue && (
        <PaperCard title={t('review.payslips.issue')}>
          <Stack gap="4">
            {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
            <HStack gap="3" align="flex-start" wrap="wrap">
              <Field.Root flex="1" minW="180px">
                <Field.Label>{t('review.payslips.worker')}</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field value={workerId} onChange={(e) => setWorkerId(e.currentTarget.value)} minH="48px" bgColor="white">
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              <Field.Root flex="1" minW="160px">
                <Field.Label>{t('review.payslips.month')}</Field.Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} minH="48px" bgColor="white" />
              </Field.Root>
            </HStack>

            <Text fontWeight="700">{t('review.payslips.components')}</Text>
            {lines.map((l, i) => (
              <HStack key={i} gap="2" align="flex-end" wrap="wrap">
                <Field.Root flex="2" minW="140px">
                  <Field.Label>{t('review.payslips.label')}</Field.Label>
                  <Input value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} minH="48px" bgColor="white" />
                </Field.Root>
                <Field.Root flex="1" minW="120px">
                  <Field.Label>{t('review.payslips.kind')}</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={l.kind} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, kind: e.currentTarget.value as Line['kind'] } : x)))} minH="48px" bgColor="white">
                      {KINDS.map((k) => <option key={k} value={k}>{t(`review.payslips.kinds.${k}`)}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root flex="1" minW="110px">
                  <Field.Label>{t('review.payslips.amount')}</Field.Label>
                  <Input inputMode="decimal" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} minH="48px" bgColor="white" />
                </Field.Root>
              </HStack>
            ))}
            <FsButton variant="secondary" size="sm" alignSelf="flex-start" onClick={() => setLines([...lines, { label: '', kind: 'other', amount: '' }])}>{t('review.payslips.addRow')}</FsButton>

            <Text fontWeight="700">{t('review.payslips.deductions')}</Text>
            {deds.map((d, i) => (
              <HStack key={i} gap="2" align="flex-end">
                <Field.Root flex="2"><Field.Label>{t('review.payslips.label')}</Field.Label>
                  <Input value={d.label} onChange={(e) => setDeds(deds.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} minH="48px" bgColor="white" /></Field.Root>
                <Field.Root flex="1"><Field.Label>{t('review.payslips.amount')}</Field.Label>
                  <Input inputMode="decimal" value={d.amount} onChange={(e) => setDeds(deds.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} minH="48px" bgColor="white" /></Field.Root>
              </HStack>
            ))}
            <FsButton variant="secondary" size="sm" alignSelf="flex-start" onClick={() => setDeds([...deds, { label: '', amount: '' }])}>{t('review.payslips.addRow')}</FsButton>

            <HStack gap="3" wrap="wrap" align="flex-start">
              <Field.Root flex="1" minW="140px">
                <Field.Label>{t('review.payslips.status')}</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field value={status} onChange={(e) => setStatus(e.currentTarget.value as 'issued' | 'paid')} minH="48px" bgColor="white">
                    <option value="issued">{t('review.payslips.issued')}</option>
                    <option value="paid">{t('review.payslips.paid')}</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              {status === 'paid' && (
                <Field.Root flex="1" minW="150px">
                  <Field.Label>{t('review.payslips.paidOn')}</Field.Label>
                  <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} minH="48px" bgColor="white" />
                </Field.Root>
              )}
            </HStack>
            <Text fontVariantNumeric="tabular-nums">
              {t('review.payslips.gross')}: <b>{formatMoney(gross, t.locale)}</b> · {t('review.payslips.net')}: <b>{formatMoney(net, t.locale)}</b>
            </Text>
            <FsButton loading={pending} onClick={submit}>{t('review.payslips.submit')}</FsButton>
          </Stack>
        </PaperCard>
      )}

      <PaperCard title={t('review.payslips.list')}>
        {slips.length === 0 ? (
          <EmptyState title={t('review.payslips.empty')} />
        ) : (
          <Stack gap="2">
            {slips.map((s) => (
              <HStack key={s.id} justify="space-between" wrap="wrap" gap="2" borderBottomWidth="1px" borderColor="border" pb="2">
                <Stack gap="0">
                  <Text fontWeight="700">{s.worker}</Text>
                  <Text fontSize="sm" color="fg.muted"><DateText value={s.month} style="month" /> · {t('review.payslips.net')}: <MoneyText paise={s.net} /></Text>
                </Stack>
                <Stamp kind={s.status === 'paid' ? 'paid' : 'issued'} />
              </HStack>
            ))}
          </Stack>
        )}
      </PaperCard>
    </Stack>
  );
}
