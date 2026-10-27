import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Heading, Stack, Text } from '@chakra-ui/react';
import { FsButton, PaperCard } from '@/components/fs/primitives';
import { formatDate } from '@/lib/i18n';
import { getT } from '@/lib/locale';
import { loadRightsCard } from '@/lib/rights';

export default async function RightsCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const card = loadRightsCard((await params).slug);
  if (!card) notFound();
  const t = await getT();
  return (
    <Stack gap="4">
      <FsButton asChild variant="quiet" size="sm" alignSelf="flex-start"><NextLink href="/rights">‹ {t('rights.back')}</NextLink></FsButton>
      <Heading as="h1" fontFamily="heading" size="xl">{card.title[t.locale]}</Heading>
      <PaperCard>
        <Stack gap="3">
          <Text fontSize="lg">{card.body[t.locale]}</Text>
          {!card.verified && <Text role="note" borderLeftWidth="4px" borderColor="warning" ps="3" fontWeight="700">{t('rights.notVerified')}</Text>}
          <Text fontSize="sm" color="fg.muted">{t('rights.lastChecked', { date: formatDate(card.lastChecked, t.locale, 'date') })}</Text>
          <Heading as="h2" size="sm">{t('rights.sources')}</Heading>
          {card.sources.length === 0 ? (
            <Text color="fg.muted">{t('rights.noSources')}</Text>
          ) : (
            card.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)
          )}
          <Text fontWeight="600">{t('rights.emergency')}</Text>
          <Text fontSize="sm" color="fg.muted">{t('rights.disclaimer')}</Text>
        </Stack>
      </PaperCard>
    </Stack>
  );
}
