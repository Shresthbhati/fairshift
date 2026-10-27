'use client';

import NextLink from 'next/link';
import { Box, Heading, HStack, Stack, Table, Text } from '@chakra-ui/react';
import { DateText, FsButton, MoneyText, PaperCard } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- rows come straight from the export query

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <PaperCard title={title} className="ruled" style={{ breakInside: 'avoid' }}>
      {empty ? <Text color="fg.muted">{t('vault.statement.empty')}</Text> : <Table.ScrollArea>{children}</Table.ScrollArea>}
    </PaperCard>
  );
}

/** Printable statement: print CSS hides the app chrome, the disclaimer stays on the page. */
export function StatementView({ name, generatedAt, categories, records }: { name: string; generatedAt: string; categories: string[]; records: Record<string, R[]> }) {
  const t = useT();
  const has = (c: string) => categories.includes(c);
  return (
    <Stack gap="4">
      <HStack justify="space-between" className="no-print">
        <FsButton asChild variant="quiet" size="sm"><NextLink href="/vault/export">‹ {t('vault.statement.back')}</NextLink></FsButton>
        <FsButton onClick={() => window.print()}>{t('vault.statement.print')}</FsButton>
      </HStack>
      <Box>
        <Heading as="h1" fontFamily="heading" size="xl">{t('vault.statement.title')}</Heading>
        <Text>{t('vault.statement.for')}: <b>{name}</b></Text>
        <Text>{t('vault.statement.on')}: <DateText value={generatedAt} style="datetime" /></Text>
        <Text mt="2" fontSize="sm" color="fg.muted">{t('vault.statement.disclaimer')}</Text>
      </Box>

      {has('shifts') && (
        <Section title={t('vault.export.categories.shifts')} empty={!records.shifts?.length}>
          <Table.Root size="sm"><Table.Body>
            {records.shifts?.map((s) => (
              <Table.Row key={s.id}>
                <Table.Cell><DateText value={s.started_at} /></Table.Cell>
                <Table.Cell><DateText value={s.started_at} style="time" /> – {s.ended_at ? <DateText value={s.ended_at} style="time" /> : '…'}</Table.Cell>
                <Table.Cell>{s.break_minutes} min</Table.Cell>
                <Table.Cell>{t(`shifts.timeSource.${s.time_source}`)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body></Table.Root>
        </Section>
      )}
      {has('payslips') && (
        <Section title={t('vault.export.categories.payslips')} empty={!records.payslips?.length}>
          <Table.Root size="sm"><Table.Body>
            {records.payslips?.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell><DateText value={p.period_start} style="month" /></Table.Cell>
                <Table.Cell>{t('pay.payslip.gross')}: <MoneyText paise={p.gross_paise} /></Table.Cell>
                <Table.Cell>{t('pay.payslip.net')}: <MoneyText paise={p.net_paise} /></Table.Cell>
                <Table.Cell>{t(p.status === 'paid' ? 'common.stamp.paid' : 'common.stamp.issued')}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body></Table.Root>
        </Section>
      )}
      {has('disputes') && (
        <Section title={t('vault.export.categories.disputes')} empty={!records.disputes?.length}>
          <Table.Root size="sm"><Table.Body>
            {records.disputes?.map((d) => (
              <Table.Row key={d.id}>
                <Table.Cell><DateText value={d.created_at} /></Table.Cell>
                <Table.Cell>{t(`pay.compare.${d.component_kind}`)}</Table.Cell>
                <Table.Cell><MoneyText paise={d.claimed_difference_paise} /></Table.Cell>
                <Table.Cell>{t(`common.status.dispute.${d.status}`)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body></Table.Root>
        </Section>
      )}
      {has('incidents') && (
        <Section title={t('vault.export.categories.incidents')} empty={!records.incidents?.length}>
          <Table.Root size="sm"><Table.Body>
            {records.incidents?.map((i) => (
              <Table.Row key={i.reference_code}>
                <Table.Cell>{i.reference_code}</Table.Cell>
                <Table.Cell>{t(`report.category.${i.category}`)}</Table.Cell>
                <Table.Cell><DateText value={i.submitted_on} /></Table.Cell>
                <Table.Cell>{t(`common.status.incident.${i.status}`)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body></Table.Root>
        </Section>
      )}
      {has('documents') && (
        <Section title={t('vault.export.categories.documents')} empty={!records.documents?.length}>
          <Table.Root size="sm"><Table.Body>
            {records.documents?.map((d) => (
              <Table.Row key={d.id}>
                <Table.Cell>{d.title}</Table.Cell>
                <Table.Cell>{t(`vault.kinds.${d.kind}`)}</Table.Cell>
                <Table.Cell><DateText value={d.created_at} /></Table.Cell>
                <Table.Cell>{t(d.verification === 'employer_confirmed' ? 'common.stamp.employerConfirmed' : 'common.stamp.selfReported')}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body></Table.Root>
        </Section>
      )}
    </Stack>
  );
}
