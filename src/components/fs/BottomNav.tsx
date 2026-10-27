'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Icon, SimpleGrid, Text } from '@chakra-ui/react';
import { FiAlertTriangle, FiBookOpen, FiFolder, FiHome } from 'react-icons/fi';
import { LuIndianRupee } from 'react-icons/lu';
import { useT } from '@/lib/i18n-client';

const ITEMS = [
  { href: '/home', key: 'common.nav.home', icon: FiHome },
  { href: '/pay', key: 'common.nav.pay', icon: LuIndianRupee },
  { href: '/report', key: 'common.nav.report', icon: FiAlertTriangle },
  { href: '/vault', key: 'common.nav.vault', icon: FiFolder },
  { href: '/rights', key: 'common.nav.rights', icon: FiBookOpen },
];

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <Box
      as="nav"
      aria-label={t('common.nav.label')}
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      zIndex="10"
      bgColor="bg.surface"
      borderTopWidth="1px"
      borderColor="border"
      boxShadow="0 -2px 8px rgba(28,36,48,.08)"
      pb="env(safe-area-inset-bottom)"
      className="no-print"
    >
      <SimpleGrid columns={5} maxW="640px" mx="auto">
        {ITEMS.map(({ href, key, icon: Glyph }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Box
              asChild
              key={href}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap="0.5"
              minH="60px"
              px="1"
              textDecoration="none"
              color={current ? 'ledger.fg' : 'fg.muted'}
              fontWeight={current ? '700' : '500'}
              borderTopWidth="3px"
              borderTopColor={current ? 'ledger.solid' : 'transparent'}
            >
              <NextLink href={href} aria-current={current ? 'page' : undefined}>
                <Icon boxSize="5" aria-hidden>
                  <Glyph />
                </Icon>
                <Text fontSize="xs" lineHeight="1.2" textAlign="center">
                  {t(key)}
                </Text>
              </NextLink>
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
