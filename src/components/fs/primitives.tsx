'use client';

import { useEffect, useState, type ComponentProps, type ElementType, type ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Button, Dialog, Heading, HStack, Icon, Portal, Stack, Text, type BoxProps, type ButtonProps } from '@chakra-ui/react';
import { FiInbox, FiLock, FiWifiOff, FiAlertCircle } from 'react-icons/fi';
import { formatDate, formatMoney, type DateStyle } from '@/lib/i18n';
import { useLocale, useT } from '@/lib/i18n-client';
import { STATUS_META } from './status-meta';

/* ── buttons ─────────────────────────────────────────────────────────────── */

type FsVariant = 'primary' | 'secondary' | 'danger' | 'quiet';
const VARIANTS: Record<FsVariant, ButtonProps> = {
  primary: { bg: 'ledger.solid', color: 'white', boxShadow: 'key', _hover: { bg: 'ledger.700' } },
  secondary: { bg: 'bg.surface', color: 'fg', borderWidth: '1px', borderColor: 'ink.700', boxShadow: 'keyQuiet', _hover: { bg: 'bg.muted' } },
  danger: { bg: 'danger', color: 'white', boxShadow: '0 2px 0 #7a1914', _hover: { bg: '#8f1d17' } },
  quiet: { bg: 'transparent', color: 'ledger.fg', textDecoration: 'underline', _hover: { bg: 'bg.muted' } },
};

/** Tactile key button: raised at rest, pressed on click. 48px minimum height. */
export function FsButton({ variant = 'primary', ...props }: Omit<ComponentProps<typeof Button>, 'variant'> & { variant?: FsVariant }) {
  return (
    <Button
      minH="48px"
      px="5"
      fontWeight="600"
      borderRadius="md"
      whiteSpace="normal"
      textAlign="center"
      transition="transform 120ms ease-out"
      _active={{ transform: 'translateY(2px)', boxShadow: 'none' }}
      _disabled={{ opacity: 0.55, cursor: 'not-allowed' }}
      {...VARIANTS[variant]}
      {...props}
    />
  );
}

/* ── surfaces ────────────────────────────────────────────────────────────── */

export function PaperCard({
  title,
  stamp,
  ruled,
  children,
  ...rest
}: Omit<BoxProps, 'title'> & { title?: ReactNode; stamp?: ReactNode; ruled?: boolean }) {
  return (
    <Box
      as="section"
      bgColor="bg.surface"
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      boxShadow="paper"
      p="4"
      className={ruled ? 'ruled' : undefined}
      {...rest}
    >
      {(title || stamp) && (
        <HStack justify="space-between" align="start" gap="3" mb="3">
          {title ? (
            <Heading as="h2" fontFamily="heading" size="md">
              {title}
            </Heading>
          ) : (
            <span />
          )}
          {stamp}
        </HStack>
      )}
      {children}
    </Box>
  );
}

/** Large tappable card for the Home grid: the whole tile is the link. */
export function Tile({ href, icon, label, hint }: { href: string; icon: ElementType; label: string; hint: string }) {
  const Glyph = icon;
  return (
    <Box
      asChild
      display="flex"
      flexDirection="column"
      gap="1"
      minH="124px"
      p="4"
      bgColor="bg.surface"
      color="fg"
      textDecoration="none"
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      boxShadow="paper"
      transition="transform 120ms ease-out"
      _hover={{ borderColor: 'ledger.solid' }}
      _active={{ transform: 'translateY(2px)', boxShadow: 'none' }}
    >
      <NextLink href={href}>
        <Icon boxSize="8" color="ledger.fg" aria-hidden>
          <Glyph />
        </Icon>
        <Text fontFamily="heading" fontWeight="700" lineHeight="1.3">
          {label}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {hint}
        </Text>
      </NextLink>
    </Box>
  );
}

/* ── stamps and badges ───────────────────────────────────────────────────── */

export type StampKind = 'estimate' | 'issued' | 'paid' | 'self_reported' | 'employer_confirmed' | 'demo';
const STAMP_COLOR: Record<StampKind, string> = {
  estimate: 'ink.700',
  issued: 'stamp.blue',
  paid: 'success',
  self_reported: 'ink.700',
  employer_confirmed: 'stamp.blue',
  demo: 'warning',
};
const STAMP_KEY: Record<StampKind, string> = {
  estimate: 'common.stamp.estimate',
  issued: 'common.stamp.issued',
  paid: 'common.stamp.paid',
  self_reported: 'common.stamp.selfReported',
  employer_confirmed: 'common.stamp.employerConfirmed',
  demo: 'common.stamp.demo',
};

/** A rubber-stamp label. Always text; colour only reinforces it. */
export function Stamp({ kind, suffix }: { kind: StampKind; suffix?: string }) {
  const t = useT();
  const color = STAMP_COLOR[kind];
  return (
    <Box
      as="span"
      display="inline-block"
      transform="rotate(-3deg)"
      borderWidth="3px"
      borderStyle="double"
      borderColor={color}
      color={color}
      px="2"
      py="0.5"
      fontSize="xs"
      fontWeight="800"
      letterSpacing="0.06em"
      textTransform="uppercase"
      whiteSpace="nowrap"
    >
      {t(STAMP_KEY[kind])}
      {suffix ? ` ${suffix}` : ''}
    </Box>
  );
}

export function StatusBadge({ kind, status }: { kind: 'incident' | 'dispute'; status: string }) {
  const t = useT();
  const meta = STATUS_META[kind][status];
  if (!meta) return <Text as="span">{status}</Text>;
  const Glyph = meta.icon;
  return (
    <HStack as="span" display="inline-flex" gap="1.5" color={meta.color} borderWidth="1px" borderColor={meta.color} borderRadius="full" px="2.5" py="0.5" fontSize="sm" fontWeight="600">
      <Icon boxSize="4" aria-hidden>
        <Glyph />
      </Icon>
      {t(meta.key)}
    </HStack>
  );
}

/* ── formatted values ────────────────────────────────────────────────────── */

export function MoneyText({ paise, ...rest }: { paise: number } & Omit<BoxProps, 'children'>) {
  const locale = useLocale();
  return (
    <Box as="span" fontVariantNumeric="tabular-nums" {...rest}>
      {formatMoney(paise, locale)}
    </Box>
  );
}

export function DateText({ value, style = 'date', ...rest }: { value: string; style?: DateStyle } & Omit<BoxProps, 'children'>) {
  const locale = useLocale();
  return (
    <Box as="span" {...rest}>
      {formatDate(value, locale, style)}
    </Box>
  );
}

/* ── page states ─────────────────────────────────────────────────────────── */

export function EmptyState({ icon = FiInbox, title, action }: { icon?: ElementType; title: string; action?: ReactNode }) {
  const Glyph = icon;
  return (
    <Stack align="center" textAlign="center" gap="3" py="8" px="4">
      <Icon boxSize="10" color="fg.subtle" aria-hidden>
        <Glyph />
      </Icon>
      <Text color="fg.muted">{title}</Text>
      {action}
    </Stack>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useT();
  return (
    <Stack align="center" textAlign="center" gap="3" py="10" px="4" role="alert">
      <Icon boxSize="10" color="danger" aria-hidden>
        <FiAlertCircle />
      </Icon>
      <Text fontWeight="600">{t('common.error.title')}</Text>
      {onRetry && <FsButton onClick={onRetry}>{t('common.retry')}</FsButton>}
    </Stack>
  );
}

export function ForbiddenState({ roles }: { roles: string }) {
  const t = useT();
  return (
    <PaperCard>
      <Stack align="center" textAlign="center" gap="3" py="6">
        <Icon boxSize="10" color="fg.subtle" aria-hidden>
          <FiLock />
        </Icon>
        <Heading as="h1" size="md" fontFamily="heading">
          {t('common.forbidden.title')}
        </Heading>
        <Text color="fg.muted">{t('common.forbidden.body', { roles })}</Text>
      </Stack>
    </PaperCard>
  );
}

export function OfflineBanner() {
  const t = useT();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (online) return null;
  return (
    <HStack role="status" bg="warning" color="white" px="4" py="2" gap="2" fontSize="sm" fontWeight="600" className="no-print">
      <Icon aria-hidden>
        <FiWifiOff />
      </Icon>
      {t('common.offline')}
    </HStack>
  );
}

export function DemoBanner() {
  const t = useT();
  return (
    <Box bg="#FFF1C9" color="ink.900" borderBottomWidth="1px" borderColor="warning" px="4" py="1.5" fontSize="sm" fontWeight="600" textAlign="center" className="no-print">
      {t('common.demoBanner')}
    </Box>
  );
}

/* ── confirm dialog ──────────────────────────────────────────────────────── */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  loading,
  danger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  const t = useT();
  return (
    <Dialog.Root role="alertdialog" open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mx="4" bgColor="bg.surface">
            <Dialog.Header>
              <Dialog.Title fontFamily="heading">{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{body}</Dialog.Body>
            <Dialog.Footer gap="3">
              <FsButton variant="secondary" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </FsButton>
              <FsButton variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </FsButton>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/* ── month switcher ──────────────────────────────────────────────────────── */

export function MonthSwitcher({ basePath, month, prev, next }: { basePath: string; month: string; prev: string; next: string }) {
  const t = useT();
  return (
    <HStack justify="space-between" gap="2" as="nav" aria-label={t('pay.monthNav')}>
      <FsButton asChild variant="secondary" size="sm" aria-label={t('pay.monthPrev')}>
        <NextLink href={`${basePath}?month=${prev}`}>‹</NextLink>
      </FsButton>
      <Heading as="h2" size="md" fontFamily="heading" textAlign="center">
        <DateText value={`${month}-01`} style="month" />
      </Heading>
      <FsButton asChild variant="secondary" size="sm" aria-label={t('pay.monthNext')}>
        <NextLink href={`${basePath}?month=${next}`}>›</NextLink>
      </FsButton>
    </HStack>
  );
}
