'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CloseButton, Checkbox, Drawer, Field, Heading, HStack, Input, Portal, Stack, Text } from '@chakra-ui/react';
import { DateText, EmptyState, FsButton, PaperCard } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { useT } from '@/lib/i18n-client';
import { confirmShift, editShift } from './actions';

type Row = { id: string; worker: string; startedAt: string; endedAt: string | null; breakMinutes: number; status: string };
const ist = (iso: string) => new Date(Date.parse(iso) + 330 * 60_000).toISOString();

export function AttendanceView({ week, prev, next, canEdit, rows }: { week: string; prev: string; next: string; canEdit: boolean; rows: Row[] }) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [f, setF] = useState({ date: '', start: '', end: '', endNextDay: false, breakMinutes: '0' });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const openEdit = (r: Row) => {
    setError(null);
    const s = ist(r.startedAt);
    const e = r.endedAt ? ist(r.endedAt) : s;
    setF({ date: s.slice(0, 10), start: s.slice(11, 16), end: e.slice(11, 16), endNextDay: e.slice(0, 10) > s.slice(0, 10), breakMinutes: String(r.breakMinutes) });
    setEditing(r);
  };
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? 'common.errors.generic');
      toaster.create({ title: t('review.attendance.saved'), type: 'success' });
      setEditing(null);
      router.refresh();
    });

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('review.attendance.title')}</Heading>
      <HStack justify="space-between" gap="2">
        <FsButton asChild size="sm" variant="secondary"><NextLink href={`/review/attendance?week=${prev}`}>‹ {t('review.attendance.prev')}</NextLink></FsButton>
        <Text fontWeight="700">{t('review.attendance.week')} <DateText value={week} /></Text>
        <FsButton asChild size="sm" variant="secondary"><NextLink href={`/review/attendance?week=${next}`}>{t('review.attendance.next')} ›</NextLink></FsButton>
      </HStack>
      {error && !editing && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}

      {rows.length === 0 ? (
        <PaperCard><EmptyState title={t('review.attendance.empty')} /></PaperCard>
      ) : (
        <Stack as="ul" listStyleType="none" m="0" p="0" gap="2">
          {rows.map((r) => (
            <PaperCard as="li" key={r.id} p="3">
              <HStack justify="space-between" wrap="wrap" gap="2">
                <Stack gap="0">
                  <Text fontWeight="700">{r.worker}</Text>
                  <Text fontSize="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
                    <DateText value={r.startedAt} /> · <DateText value={r.startedAt} style="time" /> – {r.endedAt ? <DateText value={r.endedAt} style="time" /> : t('review.attendance.running')}
                  </Text>
                </Stack>
                <HStack gap="2">
                  {r.status === 'confirmed' ? (
                    <Text fontSize="sm" fontWeight="700" color="success">{t('review.attendance.confirmed')}</Text>
                  ) : canEdit && r.endedAt ? (
                    <FsButton size="sm" loading={pending} onClick={() => run(() => confirmShift({ shiftId: r.id }))}>{t('review.attendance.confirm')}</FsButton>
                  ) : null}
                  {canEdit && r.endedAt && <FsButton size="sm" variant="secondary" onClick={() => openEdit(r)}>{t('review.attendance.edit')}</FsButton>}
                </HStack>
              </HStack>
            </PaperCard>
          ))}
        </Stack>
      )}

      <Drawer.Root open={!!editing} onOpenChange={(e) => !e.open && setEditing(null)} placement="bottom">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bgColor="bg.surface" borderTopRadius="lg" maxH="92vh">
              <Drawer.Header><Drawer.Title fontFamily="heading">{t('review.attendance.editTitle')} – {editing?.worker}</Drawer.Title></Drawer.Header>
              <Drawer.Body>
                <Stack gap="4">
                  {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
                  <Field.Root><Field.Label>{t('shifts.date')}</Field.Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} minH="48px" bgColor="white" /></Field.Root>
                  <HStack gap="3" align="flex-start">
                    <Field.Root><Field.Label>{t('shifts.startTime')}</Field.Label><Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} minH="48px" bgColor="white" /></Field.Root>
                    <Field.Root><Field.Label>{t('shifts.endTime')}</Field.Label><Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} minH="48px" bgColor="white" /></Field.Root>
                  </HStack>
                  <Checkbox.Root checked={f.endNextDay} onCheckedChange={(e) => setF({ ...f, endNextDay: e.checked === true })}>
                    <Checkbox.HiddenInput /><Checkbox.Control /><Checkbox.Label>{t('shifts.endNextDay')}</Checkbox.Label>
                  </Checkbox.Root>
                  <Field.Root><Field.Label>{t('shifts.breakMinutes')}</Field.Label><Input type="number" min={0} max={720} value={f.breakMinutes} onChange={(e) => setF({ ...f, breakMinutes: e.target.value })} minH="48px" bgColor="white" /></Field.Root>
                  <Text fontSize="sm" color="fg.muted">{t('review.attendance.editNote')}</Text>
                </Stack>
              </Drawer.Body>
              <Drawer.Footer gap="3">
                <FsButton variant="secondary" onClick={() => setEditing(null)}>{t('common.cancel')}</FsButton>
                <FsButton loading={pending} onClick={() => editing && run(() => editShift({ shiftId: editing.id, ...f, breakMinutes: Number(f.breakMinutes) }))}>{t('review.attendance.save')}</FsButton>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild><CloseButton position="absolute" top="2" insetEnd="2" aria-label={t('common.close')} /></Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Stack>
  );
}
