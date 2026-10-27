'use client';

import NextLink from 'next/link';
import { Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { FiAlertTriangle, FiBookOpen, FiFolder } from 'react-icons/fi';
import { LuIndianRupee } from 'react-icons/lu';
import { EmptyState, FsButton, PaperCard, Tile } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';
import { ShiftBar } from '../shifts/shift-bar';

export type AttentionItem = { id: string; text: string; href: string };

export function HomeView({
  name, hasOrg, staffOnly, open, items,
}: {
  name: string; hasOrg: boolean; staffOnly: boolean;
  open: { id: string; startedAt: string } | null; items: AttentionItem[];
}) {
  const t = useT();
  return (
    <Stack gap="5">
      <Heading as="h1" fontFamily="heading" size="2xl">
        {t('home.greeting', { name })}
      </Heading>

      {hasOrg ? (
        <ShiftBar open={open} canRecord />
      ) : (
        <PaperCard>
          <Stack gap="3">
            <Text>{t(staffOnly ? 'home.staffOnly' : 'home.noOrg')}</Text>
            <FsButton asChild variant="secondary" alignSelf="flex-start">
              <NextLink href={staffOnly ? '/review' : '/settings'}>{t(staffOnly ? 'common.reviewConsole' : 'home.joinCode')}</NextLink>
            </FsButton>
          </Stack>
        </PaperCard>
      )}

      <SimpleGrid columns={2} gap="3">
        <Tile href="/pay" icon={LuIndianRupee} label={t('home.tiles.wages.label')} hint={t('home.tiles.wages.hint')} />
        <Tile href="/report" icon={FiAlertTriangle} label={t('home.tiles.report.label')} hint={t('home.tiles.report.hint')} />
        <Tile href="/vault" icon={FiFolder} label={t('home.tiles.vault.label')} hint={t('home.tiles.vault.hint')} />
        <Tile href="/rights" icon={FiBookOpen} label={t('home.tiles.rights.label')} hint={t('home.tiles.rights.hint')} />
      </SimpleGrid>

      <PaperCard title={t('home.attention.title')}>
        {items.length === 0 ? (
          <EmptyState title={t('home.attention.none')} />
        ) : (
          <Stack as="ul" listStyleType="none" m="0" p="0" gap="2">
            {items.map((i) => (
              <li key={i.id}>
                <FsButton asChild variant="secondary" w="full" justifyContent="flex-start" textAlign="start">
                  <NextLink href={i.href}>{i.text}</NextLink>
                </FsButton>
              </li>
            ))}
          </Stack>
        )}
      </PaperCard>

      <HStack gap="2" wrap="wrap">
        <FsButton asChild variant="quiet" size="sm">
          <NextLink href="/shifts">{t('home.links.shifts')}</NextLink>
        </FsButton>
        <FsButton asChild variant="quiet" size="sm">
          <NextLink href="/ledger">{t('home.links.ledger')}</NextLink>
        </FsButton>
        <FsButton asChild variant="quiet" size="sm">
          <NextLink href="/settings">{t('home.links.settings')}</NextLink>
        </FsButton>
      </HStack>
    </Stack>
  );
}
