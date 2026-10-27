'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Field, HStack, NativeSelect, Stack, Text } from '@chakra-ui/react';
import { FiClock, FiPlay, FiSquare } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { ConfirmDialog, DateText, FsButton, PaperCard } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';
import { endShift, startShift } from './actions';

const BREAKS = [0, 15, 30, 45, 60, 90];

function elapsed(since: string, now: number) {
  const min = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

/** A paper strip: "No shift running" + Start, or "Shift running since …" + live elapsed + End. */
export function ShiftBar({ open, canRecord }: { open: { id: string; startedAt: string } | null; canRecord: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [breakMin, setBreakMin] = useState('30');
  const [error, setError] = useState<string | null>(null);
  // One idempotency key per start attempt: a double tap sends the same key, so only one shift is created.
  const key = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [open]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, doneKey: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? 'common.errors.generic');
      key.current = '';
      setConfirm(false);
      toaster.create({ title: t(doneKey), type: 'success' });
      router.refresh();
    });

  return (
    <PaperCard>
      <Stack gap="3">
        <HStack gap="3" align="center">
          <Icon boxSize="7" color={open ? 'success' : 'fg.subtle'} aria-hidden>
            <FiClock />
          </Icon>
          <Stack gap="0" flex="1">
            {open ? (
              <>
                <Text fontWeight="700">
                  {t('shifts.running')} <DateText value={open.startedAt} style="time" />
                </Text>
                <Text fontSize="sm" color="fg.muted" aria-live="off">
                  {t('shifts.elapsed', { duration: elapsed(open.startedAt, now) })}
                </Text>
              </>
            ) : (
              <Text fontWeight="700">{t('shifts.none')}</Text>
            )}
          </Stack>
        </HStack>
        {error && (
          <Text role="alert" color="danger" fontWeight="600">
            {t(error)}
          </Text>
        )}
        {!canRecord ? (
          <Text color="fg.muted">{t('common.errors.noOrg')}</Text>
        ) : open ? (
          <FsButton variant="danger" onClick={() => setConfirm(true)} w="full">
            <Icon aria-hidden>
              <FiSquare />
            </Icon>
            {t('shifts.end')}
          </FsButton>
        ) : (
          <FsButton
            loading={pending}
            w="full"
            onClick={() => {
              if (!key.current) key.current = crypto.randomUUID();
              run(() => startShift({ clientRequestId: key.current }), 'shifts.started');
            }}
          >
            <Icon aria-hidden>
              <FiPlay />
            </Icon>
            {t('shifts.start')}
          </FsButton>
        )}
      </Stack>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('shifts.endTitle')}
        confirmLabel={t('shifts.end')}
        loading={pending}
        onConfirm={() => open && run(() => endShift({ shiftId: open.id, breakMinutes: Number(breakMin) }), 'shifts.ended')}
        body={
          <Field.Root>
            <Field.Label>{t('shifts.endBody')}</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={breakMin} onChange={(e) => setBreakMin(e.currentTarget.value)} minH="48px" bgColor="white">
                {BREAKS.map((b) => (
                  <option key={b} value={b}>
                    {t('shifts.minutesOption', { n: b })}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        }
      />
    </PaperCard>
  );
}
