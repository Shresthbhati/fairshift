'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CloseButton, Drawer, Field, Heading, HStack, Icon, Input, NativeSelect, Portal, Stack, Text } from '@chakra-ui/react';
import { FiDownload, FiFileText, FiImage, FiPlus, FiTrash2 } from 'react-icons/fi';
import { ConfirmDialog, DateText, EmptyState, FsButton, PaperCard, Stamp } from '@/components/fs/primitives';
import { toaster } from '@/components/ui/toaster';
import { useT } from '@/lib/i18n-client';
import { KINDS } from './schemas';
import { deleteEvidence, downloadUrl, uploadEvidence } from './actions';

type Doc = { id: string; kind: string; title: string; mime: string; size: number; verification: string; at: string };

export function VaultView({ docs }: { docs: Doc[] }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [upKind, setUpKind] = useState<(typeof KINDS)[number]>('agreement');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Doc | null>(null);
  const [pending, start] = useTransition();

  const shown = docs.filter((d) => (!kind || d.kind === kind) && d.title.toLowerCase().includes(q.trim().toLowerCase()));

  const upload = () =>
    start(async () => {
      setError(null);
      if (!file) return setError('common.errors.invalid');
      const form = new FormData();
      form.set('file', file);
      form.set('title', title);
      form.set('kind', upKind);
      const res = await uploadEvidence(form);
      if (!res.ok) return setError(res.error);
      toaster.create({ title: t('vault.uploaded'), type: 'success' });
      setDrawer(false);
      setFile(null);
      setTitle('');
      router.refresh();
    });

  const download = (id: string) =>
    start(async () => {
      const res = await downloadUrl(id);
      if (res.ok && res.data) {
        window.location.assign(res.data.url);
        return;
      }
      toaster.create({ title: t(res.ok ? 'common.errors.generic' : res.error), type: 'error' });
    });

  const remove = () =>
    start(async () => {
      if (!toDelete) return;
      const res = await deleteEvidence(toDelete.id);
      setToDelete(null);
      if (!res.ok) {
        toaster.create({ title: t(res.error), type: 'error' });
        return;
      }
      toaster.create({ title: t('vault.deleted'), type: 'success' });
      router.refresh();
    });

  return (
    <Stack gap="4">
      <Heading as="h1" fontFamily="heading" size="xl">{t('vault.title')}</Heading>
      <Text color="fg.muted">{t('vault.intro')}</Text>

      <HStack gap="3" align="flex-end" wrap="wrap">
        <Field.Root flex="2" minW="160px">
          <Field.Label>{t('vault.search')}</Field.Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} minH="48px" bgColor="white" />
        </Field.Root>
        <Field.Root flex="1" minW="140px">
          <Field.Label>{t('vault.filter')}</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field value={kind} onChange={(e) => setKind(e.currentTarget.value)} minH="48px" bgColor="white">
              <option value="">{t('vault.all')}</option>
              {KINDS.map((k) => <option key={k} value={k}>{t(`vault.kinds.${k}`)}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </HStack>

      <FsButton onClick={() => { setError(null); setDrawer(true); }}>
        <Icon aria-hidden><FiPlus /></Icon>
        {t('vault.upload')}
      </FsButton>

      {shown.length === 0 ? (
        <PaperCard><EmptyState title={t(docs.length === 0 ? 'vault.empty' : 'vault.noMatch')} /></PaperCard>
      ) : (
        <Stack as="ul" listStyleType="none" m="0" p="0" gap="3">
          {shown.map((d) => (
            <PaperCard as="li" key={d.id} p="3">
              <HStack align="flex-start" gap="3">
                <Icon boxSize="7" color="ledger.fg" aria-hidden>{d.mime.startsWith('image/') ? <FiImage /> : <FiFileText />}</Icon>
                <Stack gap="1" flex="1" minW="0">
                  <Text fontWeight="700" wordBreak="break-word">{d.title}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {t(`vault.kinds.${d.kind}`)} · <DateText value={d.at} /> · {(d.size / 1024).toFixed(0)} KB
                  </Text>
                  <HStack><Stamp kind={d.verification === 'employer_confirmed' ? 'employer_confirmed' : 'self_reported'} /></HStack>
                </Stack>
              </HStack>
              <HStack mt="3" gap="2">
                <FsButton size="sm" variant="secondary" disabled={pending} onClick={() => download(d.id)}>
                  <Icon aria-hidden><FiDownload /></Icon>{t('vault.download')}
                </FsButton>
                <FsButton size="sm" variant="quiet" onClick={() => setToDelete(d)}>
                  <Icon aria-hidden><FiTrash2 /></Icon>{t('vault.deleteBtn')}
                </FsButton>
              </HStack>
            </PaperCard>
          ))}
        </Stack>
      )}
      <Text fontSize="sm" color="fg.muted">{t('vault.stampNote')}</Text>

      <HStack gap="2" wrap="wrap">
        <FsButton asChild variant="quiet" size="sm"><NextLink href="/ledger">{t('vault.links.ledger')}</NextLink></FsButton>
        <FsButton asChild variant="quiet" size="sm"><NextLink href="/vault/export">{t('vault.links.export')}</NextLink></FsButton>
      </HStack>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('vault.deleteTitle')}
        body={<Text>{toDelete?.title}. {t('vault.deleteBody')}</Text>}
        confirmLabel={t('vault.deleteConfirm')}
        danger
        loading={pending}
        onConfirm={remove}
      />

      <Drawer.Root open={drawer} onOpenChange={(e) => setDrawer(e.open)} placement="bottom">
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bgColor="bg.surface" borderTopRadius="lg" maxH="92vh">
              <Drawer.Header><Drawer.Title fontFamily="heading">{t('vault.upload')}</Drawer.Title></Drawer.Header>
              <Drawer.Body>
                <Stack gap="4">
                  {error && <Text role="alert" color="danger" fontWeight="600">{t(error)}</Text>}
                  <Field.Root required>
                    <Field.Label>{t('vault.file')}</Field.Label>
                    <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} pt="2" bgColor="white" />
                    <Field.HelperText>{t('vault.fileHelp')}</Field.HelperText>
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>{t('vault.docTitle')}</Field.Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} minH="48px" bgColor="white" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>{t('vault.kind')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={upKind} onChange={(e) => setUpKind(e.currentTarget.value as (typeof KINDS)[number])} minH="48px" bgColor="white">
                        {KINDS.map((k) => <option key={k} value={k}>{t(`vault.kinds.${k}`)}</option>)}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                </Stack>
              </Drawer.Body>
              <Drawer.Footer gap="3">
                <FsButton variant="secondary" onClick={() => setDrawer(false)}>{t('common.cancel')}</FsButton>
                <FsButton loading={pending} onClick={upload}>{t('vault.save')}</FsButton>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild><CloseButton position="absolute" top="2" insetEnd="2" aria-label={t('common.close')} /></Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Stack>
  );
}
