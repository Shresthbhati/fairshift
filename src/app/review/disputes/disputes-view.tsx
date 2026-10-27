'use client';

import NextLink from 'next/link';
import { Heading, Stack, Text } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, MoneyText, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

type Row = { id: string; worker: string; component: string; paise: number; status: string; at: string };

export function DisputesView({ rows }: { rows: Row[] }) {
  const t = useT();
  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('review.disputes.title')}</Heading>
      <PaperCard>
        {rows.length === 0 ? (
          <EmptyState title={t('review.disputes.empty')} />
        ) : (
          <Stack as="ul" listStyleType="none" m="0" p="0" gap="2">
            {rows.map((r) => (
              <li key={r.id}>
                <FsButton asChild variant="secondary" w="full" h="auto" py="3" justifyContent="space-between" textAlign="start">
                  <NextLink href={`/review/disputes/${r.id}`}>
                    <Stack gap="0.5" align="flex-start">
                      <Text fontWeight="700">{r.worker}</Text>
                      <Text fontSize="sm" fontWeight="400" color="fg.muted">
                        {t(`pay.compare.${r.component}`)} · <MoneyText paise={r.paise} /> · <DateText value={r.at} />
                      </Text>
                    </Stack>
                    <StatusBadge kind="dispute" status={r.status} />
                  </NextLink>
                </FsButton>
              </li>
            ))}
          </Stack>
        )}
      </PaperCard>
    </Stack>
  );
}
