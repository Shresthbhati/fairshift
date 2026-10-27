'use client';

import NextLink from 'next/link';
import { Box, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

type Row = { id: string; ref: string; category: string; severity: string; status: string; mode: string; date: string };
const CLOSED = ['resolved', 'closed_no_action'];
const SEV_COLOR: Record<string, string> = { urgent: 'danger', high: 'danger', medium: 'warning', low: 'ink.700' };

function List({ rows }: { rows: Row[] }) {
  const t = useT();
  return (
    <Stack as="ul" listStyleType="none" m="0" p="0" gap="2">
      {rows.map((r) => (
        <li key={r.id}>
          <FsButton asChild variant="secondary" w="full" h="auto" py="3" justifyContent="space-between" textAlign="start">
            <NextLink href={`/review/incidents/${r.id}`}>
              <Stack gap="0.5" align="flex-start">
                <HStack gap="2" wrap="wrap">
                  <Text fontWeight="700" fontVariantNumeric="tabular-nums">{r.ref}</Text>
                  <Box as="span" fontSize="xs" fontWeight="700" textTransform="uppercase" color={SEV_COLOR[r.severity]} borderWidth="1px" borderColor={SEV_COLOR[r.severity]} borderRadius="sm" px="1.5">
                    {t(`report.severity.${r.severity}`)}
                  </Box>
                  <Text as="span" fontSize="xs" color="fg.muted">{t(`report.mode.${r.mode}.title`)}</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="400" color="fg.muted">
                  {t(`report.category.${r.category}`)} · <DateText value={r.date} />
                </Text>
              </Stack>
              <StatusBadge kind="incident" status={r.status} />
            </NextLink>
          </FsButton>
        </li>
      ))}
    </Stack>
  );
}

export function QueueView({ rows }: { rows: Row[] }) {
  const t = useT();
  const open = rows.filter((r) => !CLOSED.includes(r.status));
  const closed = rows.filter((r) => CLOSED.includes(r.status));
  return (
    <Stack gap="4">
      <Box>
        <Heading as="h1" fontFamily="heading" size="xl">{t('review.incidents.title')}</Heading>
        <Text color="fg.muted">{t('review.incidents.subtitle')}</Text>
      </Box>
      <PaperCard title={`${t('review.incidents.open')} (${open.length})`}>
        {open.length === 0 ? <EmptyState title={t('review.incidents.empty')} /> : <List rows={open} />}
      </PaperCard>
      {closed.length > 0 && (
        <PaperCard title={`${t('review.incidents.closed')} (${closed.length})`}>
          <List rows={closed} />
        </PaperCard>
      )}
    </Stack>
  );
}
