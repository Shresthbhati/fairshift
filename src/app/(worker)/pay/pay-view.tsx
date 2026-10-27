'use client';

import NextLink from 'next/link';
import { Box, Collapsible, Heading, HStack, Stack, Table, Text } from '@chakra-ui/react';
import { FiChevronDown } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';
import { explainLine, formatMinutes, type PayResult } from '@/domain/pay';
import { DateText, EmptyState, FsButton, MoneyText, MonthSwitcher, PaperCard, Stamp } from '@/components/fs/primitives';
import { formatMoney } from '@/lib/i18n';
import { useT } from '@/lib/i18n-client';

type Rules = { label: string; version: number; sourceNote: string; payBasis: 'hourly' | 'daily' | 'monthly'; otMultiplierPct: number; longShiftMinutes: number; minRestMinutes: number };
type Slip = { id: string; periodStart: string; periodEnd: string; status: string; netPaise: number; paidOn: string | null };

export function PayView({
  month, prev, next, orgName, rules, result, invalidShift, payslips,
}: {
  month: string; prev: string; next: string; orgName: string | null; rules: Rules | null;
  result: PayResult | null; invalidShift: boolean; payslips: Slip[];
}) {
  const t = useT();
  const money = (p: number) => formatMoney(p, t.locale);
  const longShifts = result?.lines.filter((l) => l.warnings.includes('long_shift')).length ?? 0;
  const shortRests = result?.lines.filter((l) => l.warnings.includes('short_rest')).length ?? 0;

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">
        {t('pay.title')}
      </Heading>
      <MonthSwitcher basePath="/pay" month={month} prev={prev} next={next} />

      <PaperCard title={t('pay.estimateTitle')} stamp={<Stamp kind="estimate" />}>
        {!orgName || !rules ? (
          <EmptyState title={t(orgName ? 'pay.noRule' : 'common.errors.noOrg')} />
        ) : invalidShift ? (
          <Stack gap="3">
            <Text role="alert" color="danger" fontWeight="600">
              {t('pay.invalidShift')}
            </Text>
            <FsButton asChild variant="secondary">
              <NextLink href={`/shifts?month=${month}`}>{t('pay.checkShifts')}</NextLink>
            </FsButton>
          </Stack>
        ) : result ? (
          <Stack gap="3">
            <Box>
              <Text fontSize="sm" color="fg.muted">
                {t('pay.total')}
              </Text>
              <MoneyText paise={result.totalPaise} fontSize="3xl" fontWeight="800" fontFamily="heading" />
            </Box>
            <Text fontSize="sm" color="fg.muted">
              {t('pay.rule', { org: orgName, label: rules.label, version: rules.version, source: rules.sourceNote })}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {t('pay.from')}
            </Text>
            <HStack gap="4" wrap="wrap" fontVariantNumeric="tabular-nums">
              <Text>{t('pay.compare.base')}: <b>{money(result.basePaise)}</b></Text>
              <Text>{t('pay.compare.overtime')}: <b>{money(result.overtimePaise)}</b></Text>
              <Text>{t('pay.compare.allowance')}: <b>{money(result.allowancePaise)}</b></Text>
            </HStack>

            {result.lines.length === 0 ? (
              <Text color="fg.muted">{t('pay.noShifts')}</Text>
            ) : (
              <Collapsible.Root>
                <Collapsible.Trigger asChild>
                  <FsButton variant="secondary" w="full">
                    {t('pay.itemised')}
                    <Icon aria-hidden>
                      <FiChevronDown />
                    </Icon>
                  </FsButton>
                </Collapsible.Trigger>
                <Collapsible.Content>
                  <Table.ScrollArea mt="3">
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>{t('pay.col.date')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">{t('pay.col.worked')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">{t('pay.col.regular')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">{t('pay.col.overtime')}</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">{t('pay.col.allowance')}</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {result.lines.map((l) => (
                          <Table.Row key={l.shiftId}>
                            <Table.Cell><DateText value={l.dateIST} /></Table.Cell>
                            <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">{formatMinutes(l.workedMinutes)}</Table.Cell>
                            <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">{money(l.regularPaise)}</Table.Cell>
                            <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">{money(l.overtimePaise)}</Table.Cell>
                            <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">{money(l.nightPaise)}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Table.ScrollArea>
                  <Collapsible.Root mt="3">
                    <Collapsible.Trigger asChild>
                      <FsButton variant="quiet" size="sm">{t('pay.howWorked')}</FsButton>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <Stack as="ul" gap="2" mt="2" ps="4">
                        {result.lines.map((l) => {
                          const e = explainLine(l, rules, money);
                          return (
                            <Text as="li" key={l.shiftId} fontSize="sm">
                              {t(e.key, e.params)}
                              {l.nightPaise > 0 ? ` ${t('pay.explain.night', { nightAmount: money(l.nightPaise) })}` : ''}
                            </Text>
                          );
                        })}
                      </Stack>
                    </Collapsible.Content>
                  </Collapsible.Root>
                </Collapsible.Content>
              </Collapsible.Root>
            )}
          </Stack>
        ) : null}
      </PaperCard>

      {result && rules && (
        <PaperCard title={t('pay.alerts.title')}>
          <Stack gap="2">
            {longShifts + shortRests === 0 ? (
              <Text color="fg.muted">{t('pay.alerts.none')}</Text>
            ) : (
              <>
                {longShifts > 0 && <Text>{t('pay.alerts.longShift', { n: longShifts, hours: formatMinutes(rules.longShiftMinutes) })}</Text>}
                {shortRests > 0 && <Text>{t('pay.alerts.shortRest', { n: shortRests, hours: formatMinutes(rules.minRestMinutes) })}</Text>}
                <FsButton asChild variant="secondary" alignSelf="flex-start">
                  <NextLink href="/report/new?category=excessive_hours">{t('pay.alerts.report')}</NextLink>
                </FsButton>
              </>
            )}
            <Text fontSize="sm" color="fg.muted">
              {t('pay.alerts.hint')}
            </Text>
          </Stack>
        </PaperCard>
      )}

      <PaperCard title={t('pay.payslips.title')}>
        {payslips.length === 0 ? (
          <EmptyState title={t('pay.payslips.none')} />
        ) : (
          <Stack gap="2">
            {payslips.map((p) => (
              <HStack key={p.id} justify="space-between" gap="3" wrap="wrap" borderBottomWidth="1px" borderColor="border" pb="2">
                <Stack gap="0">
                  <Text fontWeight="600">
                    <DateText value={p.periodStart} /> – <DateText value={p.periodEnd} />
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {t('pay.payslips.net')}: <MoneyText paise={p.netPaise} />
                  </Text>
                </Stack>
                <HStack gap="3">
                  <Stamp kind={p.status === 'paid' ? 'paid' : 'issued'} />
                  <FsButton asChild size="sm" variant="secondary">
                    <NextLink href={`/pay/payslips/${p.id}`}>{t('pay.payslips.view')}</NextLink>
                  </FsButton>
                </HStack>
              </HStack>
            ))}
          </Stack>
        )}
      </PaperCard>
    </Stack>
  );
}
