'use client';

import NextLink from 'next/link';
import { Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { LedgerRow, type LedgerEntry } from '@/components/fs/LedgerRow';
import { EmptyState, FsButton, PaperCard } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

export function LedgerView({ entries, page, hasMore }: { entries: LedgerEntry[]; page: number; hasMore: boolean }) {
  const t = useT();
  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('ledger.title')}</Heading>
      <Text color="fg.muted">{t('ledger.intro')}</Text>
      <PaperCard className="ruled">
        {entries.length === 0 ? <EmptyState title={t('ledger.empty')} /> : entries.map((e) => <LedgerRow key={e.id} entry={e} />)}
      </PaperCard>
      <HStack justify="space-between">
        {page > 1 ? <FsButton asChild variant="secondary" size="sm"><NextLink href={`/ledger?page=${page - 1}`}>‹ {t('ledger.newer')}</NextLink></FsButton> : <span />}
        {hasMore ? <FsButton asChild variant="secondary" size="sm"><NextLink href={`/ledger?page=${page + 1}`}>{t('ledger.older')} ›</NextLink></FsButton> : <span />}
      </HStack>
    </Stack>
  );
}
