'use client';

import { Box, Heading, Stack, Table, Text } from '@chakra-ui/react';
import { EmptyState, PaperCard } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

type Row = { category: string; open: number; closed: number; total: number };

export function InsightsView({ rows }: { rows: Row[] }) {
  const t = useT();
  return (
    <Stack gap="4">
      <Box>
        <Heading as="h1" fontFamily="heading" size="xl">{t('review.insights.title')}</Heading>
        <Text color="fg.muted">{t('review.insights.intro')}</Text>
      </Box>
      <PaperCard>
        {rows.length === 0 ? (
          <EmptyState title={t('review.insights.empty')} />
        ) : (
          <Table.ScrollArea>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>{t('review.insights.type')}</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">{t('review.insights.open')}</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">{t('review.insights.closed')}</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">{t('review.insights.total')}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rows.map((r) => (
                  <Table.Row key={r.category}>
                    <Table.Cell>{r.category === 'small_groups_hidden' ? t('review.insights.hidden') : t(`report.category.${r.category}`)}</Table.Cell>
                    <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">{r.open}</Table.Cell>
                    <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums">{r.closed}</Table.Cell>
                    <Table.Cell textAlign="end" fontVariantNumeric="tabular-nums" fontWeight="700">{r.total}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
        <Text fontSize="sm" color="fg.muted" mt="3">{t('review.insights.note')}</Text>
      </PaperCard>
    </Stack>
  );
}
