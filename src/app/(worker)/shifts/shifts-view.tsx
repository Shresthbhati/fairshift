'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CloseButton, Drawer, Field, Heading, HStack, Input, Portal, Stack, Text, Textarea, Checkbox } from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { DateText, EmptyState, FsButton, MonthSwitcher, PaperCard } from '@/components/fs/primitives';
import { useT } from '@/lib/i18n-client';
import { formatMinutes } from '@/domain/pay';
import { addManualShift } from './actions';
import { ShiftBar } from './shift-bar';

type Row = { id: string; startedAt: string; endedAt: string | null; breakMinutes: number; source: string; timeSource: string; status: string };

const todayIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

export function ShiftsView({
  month, prev, next, canRecord, open, rows,
}: {
  month: string; prev: string; next: string; canRecord: boolean;
  open: { id: string; startedAt: string } | null; rows: Row[];
}) {
  const t = useT();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ date: todayIST(), start: '08:00', end: '17:00', endNextDay: false, breakMinutes: '30', note: '' });
  const [key, setKey] = useState(() => crypto.randomUUID());
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await addManualShift({ ...form, breakMinutes: Number(form.breakMinutes), clientRequestId: key });
      if (!res.ok) return setError(res.error);
      toaster.create({ title: t('shifts.saved'), type: 'success' });
      setDrawer(false);
      setKey(crypto.randomUUID());
      router.refresh();
    });

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">
        {t('shifts.title')}
      </Heading>
      <ShiftBar open={open} canRecord={canRecord} />
      <MonthSwitcher basePath="/shifts" month={month} prev={prev} next={next} />

      {rows.length === 0 ? (
        <PaperCard>
          <EmptyState title={t('shifts.monthEmpty')} />
        </PaperCard>
      ) : (
        <Stack gap="2" as="ul" listStyleType="none" m="0" p="0">
          {rows.map((r) => (
            <PaperCard as="li" key={r.id} p="3">
              <HStack justify="space-between" align="flex-start" gap="3">
                <Stack gap="0.5">
                  <Text fontWeight="700">
                    <DateText value={r.startedAt} style="date" />
                  </Text>
                  <Text fontVariantNumeric="tabular-nums">
                    <DateText value={r.startedAt} style="time" /> – {r.endedAt ? <DateText value={r.endedAt} style="time" /> : t('shifts.open')}
                    {r.endedAt && (
                      <Text as="span" color="fg.muted" fontSize="sm" ms="2">
                        {formatMinutes(Math.round((Date.parse(r.endedAt) - Date.parse(r.startedAt)) / 60_000))}
                        {r.breakMinutes > 0 ? ` · ${t('shifts.breakShort', { n: r.breakMinutes })}` : ''}
                      </Text>
                    )}
                  </Text>
                </Stack>
                <Stack gap="0.5" align="flex-end" fontSize="xs" color="fg.muted" textAlign="end">
                  <span>{t(`shifts.timeSource.${r.timeSource}`)}</span>
                  {r.source === 'employer' && <Text color="stamp.blue" fontWeight="700">{t('shifts.editedByEmployer')}</Text>}
                  {r.status === 'confirmed' && <Text color="success" fontWeight="700">{t('shifts.confirmed')}</Text>}
                </Stack>
              </HStack>
            </PaperCard>
          ))}
        </Stack>
      )}

      {canRecord && (
        <FsButton variant="secondary" onClick={() => setDrawer(true)}>
          <Icon aria-hidden>
            <FiPlus />
          </Icon>
          {t('shifts.add')}
        </FsButton>
      )}

      <Drawer.Root open={drawer} onOpenChange={(e) => setDrawer(e.open)} placement="bottom">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bgColor="bg.surface" borderTopRadius="lg" maxH="92vh">
              <Drawer.Header>
                <Drawer.Title fontFamily="heading">{t('shifts.addTitle')}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap="4">
                  {error && (
                    <Text role="alert" color="danger" fontWeight="600">
                      {t(error)}
                    </Text>
                  )}
                  <Field.Root required>
                    <Field.Label>{t('shifts.date')}</Field.Label>
                    <Input type="date" value={form.date} max={todayIST()} onChange={(e) => set('date', e.target.value)} minH="48px" bgColor="white" />
                  </Field.Root>
                  <HStack gap="3" align="flex-start">
                    <Field.Root required>
                      <Field.Label>{t('shifts.startTime')}</Field.Label>
                      <Input type="time" value={form.start} onChange={(e) => set('start', e.target.value)} minH="48px" bgColor="white" />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label>{t('shifts.endTime')}</Field.Label>
                      <Input type="time" value={form.end} onChange={(e) => set('end', e.target.value)} minH="48px" bgColor="white" />
                    </Field.Root>
                  </HStack>
                  <Checkbox.Root checked={form.endNextDay} onCheckedChange={(e) => set('endNextDay', e.checked === true)}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{t('shifts.endNextDay')}</Checkbox.Label>
                  </Checkbox.Root>
                  <Field.Root>
                    <Field.Label>{t('shifts.breakMinutes')}</Field.Label>
                    <Input type="number" inputMode="numeric" min={0} max={720} value={form.breakMinutes} onChange={(e) => set('breakMinutes', e.target.value)} minH="48px" bgColor="white" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>{t('shifts.note')}</Field.Label>
                    <Textarea value={form.note} maxLength={500} onChange={(e) => set('note', e.target.value)} bgColor="white" />
                  </Field.Root>
                  <Box fontSize="sm" color="fg.muted">
                    {t('shifts.manualHint')}
                  </Box>
                </Stack>
              </Drawer.Body>
              <Drawer.Footer gap="3">
                <FsButton variant="secondary" onClick={() => setDrawer(false)}>
                  {t('common.cancel')}
                </FsButton>
                <FsButton loading={pending} onClick={submit}>
                  {t('common.save')}
                </FsButton>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <CloseButton position="absolute" top="2" insetEnd="2" aria-label={t('common.close')} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Stack>
  );
}
