import { Skeleton, Stack } from '@chakra-ui/react';

export default function ReviewLoading() {
  return (
    <Stack gap="3" aria-busy="true">
      <Skeleton height="32px" width="50%" />
      <Skeleton height="80px" />
      <Skeleton height="80px" />
      <Skeleton height="80px" />
    </Stack>
  );
}
