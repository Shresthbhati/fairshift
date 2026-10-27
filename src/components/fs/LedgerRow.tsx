'use client';

import NextLink from 'next/link';
import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import { useT } from '@/lib/i18n-client';
import { DateText, StatusBadge } from './primitives';

export type LedgerEntry = {
  id: string;
  at: string;
  source: 'you' | 'employer' | 'fairshift';
  title: string;
  status?: { kind: 'incident' | 'dispute'; value: string };
  href?: string;
};

const SOURCE_COLOR = { you: 'ledger.fg', employer: 'stamp.blue', fairshift: 'ink.700' } as const;

/** One row of the Fairness Ledger timeline: date, who recorded it, what happened, current status. */
export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const t = useT();
  const body = (
    <Stack gap="1">
      <HStack gap="2" wrap="wrap">
        <Text
          as="span"
          fontSize="xs"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing="0.05em"
          color={SOURCE_COLOR[entry.source]}
          borderWidth="1px"
          borderColor={SOURCE_COLOR[entry.source]}
          borderRadius="sm"
          px="1.5"
        >
          {t(`ledger.source.${entry.source}`)}
        </Text>
        {entry.status && <StatusBadge kind={entry.status.kind} status={entry.status.value} />}
      </HStack>
      <Text fontWeight="600">{entry.title}</Text>
    </Stack>
  );
  return (
    <HStack align="flex-start" gap="3" py="3" borderBottomWidth="1px" borderColor="border">
      <DateText value={entry.at} style="date" fontSize="sm" color="fg.muted" minW="86px" />
      <Box flex="1" minW="0">
        {entry.href ? (
          <NextLink href={entry.href} style={{ color: 'inherit', textDecoration: 'none' }}>
            {body}
          </NextLink>
        ) : (
          body
        )}
      </Box>
    </HStack>
  );
}
