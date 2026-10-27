import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { DemoBanner, ForbiddenState, OfflineBanner } from '@/components/fs/primitives';
import { ReviewNav, TopBar } from '@/components/fs/shell';
import { STAFF_ROLES, allowedSections, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';

// The review console shows only the sections the signed-in roles allow. Anyone else gets a clear "not for your account" page.
export default async function ReviewLayout({ children }: { children: ReactNode }) {
  const ctx = await requireUser();
  const t = await getT();
  const sections = allowedSections(ctx);
  const org = ctx.memberships.find((m) => STAFF_ROLES.includes(m.role));
  return (
    <Box minH="100vh" pb="8">
      <OfflineBanner />
      {org?.org.is_demo && <DemoBanner />}
      <TopBar name={ctx.displayName} />
      <Box maxW="1100px" mx="auto" px="4" py="4" display={{ lg: 'grid' }} gridTemplateColumns={{ lg: '220px minmax(0, 1fr)' }} gap="6">
        {sections.length > 0 && <ReviewNav sections={sections.map(({ href, key }) => ({ href, key }))} />}
        <Box as="main" id="main" minW="0" mt={{ base: 3, lg: 0 }}>
          {sections.length > 0 ? children : <ForbiddenState roles={t('review.staff')} />}
        </Box>
      </Box>
    </Box>
  );
}
