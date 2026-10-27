import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { BottomNav } from '@/components/fs/BottomNav';
import { DemoBanner, OfflineBanner } from '@/components/fs/primitives';
import { TopBar } from '@/components/fs/shell';
import { isStaff, requireUser, workerOrg } from '@/lib/auth';

// Server layout: authenticates, then wraps every worker screen in the shell (top bar, banners, bottom nav).
export default async function WorkerLayout({ children }: { children: ReactNode }) {
  const ctx = await requireUser();
  const org = workerOrg(ctx) ?? ctx.memberships[0];
  return (
    <Box minH="100vh" pb="88px">
      <OfflineBanner />
      {org?.org.is_demo && <DemoBanner />}
      <TopBar name={ctx.displayName} showReview={isStaff(ctx)} />
      <Box as="main" id="main" maxW="640px" mx="auto" px="4" py="4">
        {children}
      </Box>
      <BottomNav />
    </Box>
  );
}
