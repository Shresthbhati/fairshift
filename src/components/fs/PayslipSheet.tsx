'use client';

import { Box, HStack, Icon, Stack, Table, Text } from '@chakra-ui/react';
import { FiArrowDown, FiArrowUp, FiCheck } from 'react-icons/fi';
import type { CompareRow } from '@/domain/pay';
import { useT } from '@/lib/i18n-client';
import { formatMoney } from '@/lib/i18n';
import { DateText, MoneyText, PaperCard, Stamp } from './primitives';

export type PayslipData = {
  orgName: string;
  periodStart: string;
  periodEnd: string;
  components: { label: string; kind: string; amount_paise: number }[];
  deductions: { label: string; amount_paise: number }[];
  grossPaise: number;
  netPaise: number;
  status: 'issued' | 'paid';
  paidOn: string | null;
};

/** The employer's payslip, on ruled paper, stamped ISSUED or PAID. */
export function PayslipSheet({ slip }: { slip: PayslipData }) {
  const t = useT();
  return (
    <PaperCard
      ruled
      title={slip.orgName}
      stamp={slip.status === 'paid' ? <Stamp kind="paid" suffix={slip.paidOn ?? undefined} /> : <Stamp kind="issued" />}
    >
      <Text fontSize="sm" color="fg.muted" mb="3">
        <DateText value={slip.periodStart} /> – <DateText value={slip.periodEnd} />
      </Text>
      <Stack gap="1.5">
        {slip.components.map((c, i) => (
          <HStack key={`c${i}`} justify="space-between" gap="3">
            <Text>{c.label}</Text>
            <MoneyText paise={c.amount_paise} fontWeight="600" />
          </HStack>
        ))}
        <HStack justify="space-between" borderTopWidth="1px" borderColor="border" pt="1.5">
          <Text fontWeight="700">{t('pay.payslip.gross')}</Text>
          <MoneyText paise={slip.grossPaise} fontWeight="700" />
        </HStack>
        {slip.deductions.map((d, i) => (
          <HStack key={`d${i}`} justify="space-between" gap="3" color="fg.muted">
            <Text>− {d.label}</Text>
            <MoneyText paise={d.amount_paise} />
          </HStack>
        ))}
        <HStack justify="space-between" borderTopWidth="2px" borderColor="ink.700" pt="1.5">
          <Text fontWeight="800">{t('pay.payslip.net')}</Text>
          <MoneyText paise={slip.netPaise} fontWeight="800" />
        </HStack>
      </Stack>
    </PaperCard>
  );
}

const KIND_KEY: Record<string, string> = {
  base: 'pay.compare.base',
  overtime: 'pay.compare.overtime',
  allowance: 'pay.compare.allowance',
  total: 'pay.compare.total',
};

/** Estimate vs issued, per component. Neutral wording: a "difference to review", never an accusation. */
export function ComparisonTable({ rows }: { rows: CompareRow[] }) {
  const t = useT();
  const locale = t.locale;
  const flagged = rows.filter((r) => r.kind !== 'total' && r.status !== 'matches');
  return (
    <PaperCard title={t('pay.compare.title')} stamp={<Stamp kind="estimate" />}>
      <Table.ScrollArea>
        <Table.Root size="sm" variant="line">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t('pay.compare.item')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">{t('pay.compare.estimate')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">{t('pay.compare.issued')}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">{t('pay.compare.difference')}</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r) => {
              const color = r.status === 'matches' ? 'success' : 'warning';
              const Glyph = r.status === 'matches' ? FiCheck : r.status === 'estimate_higher' ? FiArrowUp : FiArrowDown;
              return (
                <Table.Row key={r.kind} fontWeight={r.kind === 'total' ? '700' : '400'}>
                  <Table.Cell>{t(KIND_KEY[r.kind])}</Table.Cell>
                  <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">
                    {formatMoney(r.estimatePaise, locale)}
                  </Table.Cell>
                  <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">
                    {formatMoney(r.issuedPaise, locale)}
                  </Table.Cell>
                  <Table.Cell textAlign="end" color={color} fontVariantNumeric="tabular-nums">
                    <HStack as="span" display="inline-flex" gap="1">
                      <Icon boxSize="4" aria-hidden>
                        <Glyph />
                      </Icon>
                      {r.status === 'matches' ? t('pay.compare.matchesShort') : formatMoney(Math.abs(r.differencePaise), locale)}
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      <Stack gap="2" mt="3" aria-live="polite">
        {flagged.length === 0 ? (
          <Text color="fg.muted">{t('pay.compare.allMatch')}</Text>
        ) : (
          flagged.map((r) => (
            <Box key={r.kind} borderLeftWidth="4px" borderColor="warning" pl="3">
              <Text>
                {t(r.status === 'estimate_higher' ? 'pay.compare.estimateHigher' : 'pay.compare.estimateLower', {
                  amount: formatMoney(Math.abs(r.differencePaise), locale),
                  component: t(KIND_KEY[r.kind]).toLowerCase(),
                })}
              </Text>
            </Box>
          ))
        )}
      </Stack>
    </PaperCard>
  );
}
