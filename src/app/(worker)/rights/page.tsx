import NextLink from 'next/link';
import { Heading, Stack, Text } from '@chakra-ui/react';
import { FsButton, PaperCard } from '@/components/fs/primitives';
import { getT } from '@/lib/locale';
import { loadRightsCards } from '@/lib/rights';

export default async function RightsPage() {
  const t = await getT();
  const cards = loadRightsCards();
  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('rights.title')}</Heading>
      <Text color="fg.muted">{t('rights.intro')}</Text>
      {cards.map((c) => (
        <PaperCard key={c.slug} title={c.title[t.locale]}>
          <Stack gap="3">
            <Text lineClamp={3}>{c.body[t.locale]}</Text>
            {!c.verified && <Text fontSize="sm" color="warning" fontWeight="700">{t('rights.notVerified')}</Text>}
            <FsButton asChild variant="secondary" alignSelf="flex-start"><NextLink href={`/rights/${c.slug}`}>{t('rights.read')}</NextLink></FsButton>
          </Stack>
        </PaperCard>
      ))}
    </Stack>
  );
}
