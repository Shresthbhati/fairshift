import { Skeleton, Stack } from '@chakra-ui/react';

// Skeleton shaped like the typical worker page: a heading, a card, then a list.
export default function Loading() {
  return (
    <Stack gap="4" aria-busy="true">
      <Skeleton height="32px" width="60%" />
      <Skeleton height="120px" />
      <Skeleton height="72px" />
      <Skeleton height="72px" />
    </Stack>
  );
}
