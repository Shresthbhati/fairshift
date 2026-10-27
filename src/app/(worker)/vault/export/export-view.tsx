'use client';

import NextLink from 'next/link';
import { useState } from 'react';
import { Checkbox, Heading, Stack, Text } from '@chakra-ui/react';
import { FsButton, PaperCard } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';

const CATEGORIES = ['shifts', 'payslips', 'disputes', 'incidents', 'documents'] as const;

/** Step 1: choose categories. Step 2: see the counts. Step 3: confirm by downloading or opening the statement. */
export function ExportView({ counts }: { counts: Record<(typeof CATEGORIES)[number], number> }) {
  const t = useT();
  const [selected, setSelected] = useState<string[]>([...CATEGORIES]);
  const qs = selected.join(',');
  const none = selected.length === 0;
  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" size="sm" alignSelf="flex-start"><NextLink href="/vault">‹ {t('vault.title')}</NextLink></FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">{t('vault.export.title')}</Heading>
      <Text color="fg.muted">{t('vault.export.intro')}</Text>
      <PaperCard>
        <Stack gap="3">
          {CATEGORIES.map((c) => (
            <Checkbox.Root key={c} checked={selected.includes(c)} onCheckedChange={(e) => setSelected((s) => (e.checked === true ? [...s, c] : s.filter((x) => x !== c)))}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                {t(`vault.export.categories.${c}`)} <Text as="span" color="fg.muted">({t('vault.export.count', { n: counts[c] })})</Text>
              </Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Stack>
      </PaperCard>
      {none && <Text role="alert" color="danger" fontWeight="600">{t('vault.export.none')}</Text>}
      <FsButton asChild disabled={none} aria-disabled={none}>
        <a href={none ? undefined : `/vault/export/download?c=${qs}`} download>{t('vault.export.download')}</a>
      </FsButton>
      <FsButton asChild variant="secondary" disabled={none} aria-disabled={none}>
        <NextLink href={none ? '#' : `/vault/export/statement?c=${qs}`}>{t('vault.export.statement')}</NextLink>
      </FsButton>
      <Text fontSize="sm" color="fg.muted">{t('vault.export.note')}</Text>
    </Stack>
  );
}
