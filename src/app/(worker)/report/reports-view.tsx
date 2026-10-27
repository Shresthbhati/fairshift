'use client';

import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, PaperCard, StatusBadge } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

type Report = { ref: string; category: string; status: string; mode: string; date: string };

export function ReportsView({ reports }: { reports: Report[] }) {
  const t = useT();
  const [saved, setSaved] = useState<{ ref: string }[]>([]);
  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem('fs.anon') ?? '[]'));
    } catch {
      setSaved([]);
    }
  }, []);

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">
        {t('report.title')}
      </Heading>
      <FsButton asChild>
        <NextLink href="/report/new">{t('report.new')}</NextLink>
      </FsButton>

      <PaperCard title={t('report.mine')}>
        {reports.length === 0 ? (
          <EmptyState title={t('report.none')} />
        ) : (
          <Stack as="ul" listStyleType="none" m="0" p="0" gap="2">
            {reports.map((r) => (
              <li key={r.ref}>
                <FsButton asChild variant="secondary" w="full" h="auto" py="3" justifyContent="space-between" textAlign="start">
                  <NextLink href={`/report/${r.ref}`}>
                    <Stack gap="0.5" align="flex-start">
                      <Text fontWeight="700" fontVariantNumeric="tabular-nums">{r.ref}</Text>
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
        )}
      </PaperCard>

      {saved.length > 0 && (
        <PaperCard title={t('report.saved')}>
          <Stack gap="2">
            {saved.map((s) => (
              <HStack key={s.ref} justify="space-between">
                <Text fontWeight="700" fontVariantNumeric="tabular-nums">{s.ref}</Text>
                <FsButton asChild size="sm" variant="secondary">
                  <NextLink href={`/track?ref=${s.ref}`}>{t('report.check')}</NextLink>
                </FsButton>
              </HStack>
            ))}
          </Stack>
        </PaperCard>
      )}
    </Stack>
  );
}
