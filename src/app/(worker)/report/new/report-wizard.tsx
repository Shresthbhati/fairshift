'use client';

import NextLink from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Checkbox, Field, Heading, HStack, Input, RadioCard, SegmentGroup, Stack, Text, Textarea } from '@chakra-ui/react';
import { EmptyState, FsButton, PaperCard } from '@/components/fs/primitives';
import { ModeSelector, type IncidentMode } from '@/components/fs/ModeSelector';
import { useT } from '@/lib/i18n-client';
import { uploadIncidentFile } from '../[ref]/actions';
import { CATEGORIES, SEVERITIES } from '../schemas';
import { submitAnonymous, submitNamed } from './actions';

type Category = (typeof CATEGORIES)[number];
type Severity = (typeof SEVERITIES)[number];
type Done = { reference: string; token?: string; fileWarning?: boolean };

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

export function ReportWizard({ hasOrg, initialCategory }: { hasOrg: boolean; initialCategory: Category | '' }) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(initialCategory ? 2 : 1);
  const [category, setCategory] = useState<Category | ''>(initialCategory);
  const [mode, setMode] = useState<IncidentMode | ''>('');
  const [severity, setSeverity] = useState<Severity>(initialCategory === 'excessive_hours' ? 'medium' : 'medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [savedCode, setSavedCode] = useState(false);
  const [saveOnDevice, setSaveOnDevice] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!hasOrg) {
    return (
      <PaperCard>
        <EmptyState title={t('common.errors.noOrg')} />
      </PaperCard>
    );
  }

  const urgent = category === 'physical_hazard' || severity === 'urgent';
  const anonymous = mode === 'anonymous';

  const next = () => {
    setError(null);
    if (step === 1 && !category) return setError('report.errors.chooseCategory');
    if (step === 2 && !mode) return setError('report.errors.chooseMode');
    if (step === 3 && description.trim().length < 10) return setError('report.errors.tooShort');
    setStep((s) => s + 1);
  };

  const pickFiles = (list: FileList | null) => {
    setError(null);
    const picked = Array.from(list ?? []).slice(0, MAX_FILES);
    if (picked.some((f) => f.size > MAX_BYTES)) return setError('report.errors.fileSize');
    setFiles(picked);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      if (!category || !mode) return;
      const body = { category, severity, description, location: location || undefined };
      if (mode === 'anonymous') {
        const res = await submitAnonymous(body);
        if (!res.ok || !res.data) return setError(res.ok ? 'common.errors.generic' : res.error);
        return setDone({ reference: res.data.reference, token: res.data.token });
      }
      const res = await submitNamed({ ...body, mode });
      if (!res.ok || !res.data) return setError(res.ok ? 'common.errors.generic' : res.error);
      let fileWarning = false;
      for (const file of files) {
        const form = new FormData();
        form.set('incidentId', res.data.id);
        form.set('file', file);
        const up = await uploadIncidentFile(form);
        if (!up.ok) fileWarning = true;
      }
      setDone({ reference: res.data.reference, fileWarning });
    });

  const copy = async (text: string, which: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      /* clipboard may be blocked: the code is still visible on screen */
    }
  };

  const finish = () => {
    if (done?.token && saveOnDevice) {
      try {
        const list = JSON.parse(localStorage.getItem('fs.anon') ?? '[]');
        list.push({ ref: done.reference, token: done.token });
        localStorage.setItem('fs.anon', JSON.stringify(list));
      } catch {
        /* storage unavailable: nothing is saved */
      }
    }
    router.push('/report');
    router.refresh();
  };

  /* ── result screen ─────────────────────────────────────────────────────── */
  if (done) {
    return (
      <Stack gap="4">
        <Heading as="h1" fontFamily="heading" size="xl">
          {t('report.done.title')}
        </Heading>
        <PaperCard title={t('report.done.ref')}>
          <HStack justify="space-between" wrap="wrap" gap="3">
            <Text fontSize="2xl" fontWeight="800" fontFamily="heading" fontVariantNumeric="tabular-nums" aria-live="polite">
              {done.reference}
            </Text>
            <FsButton size="sm" variant="secondary" onClick={() => copy(done.reference, 'ref')}>
              {copied === 'ref' ? t('common.copied') : t('common.copy')}
            </FsButton>
          </HStack>
        </PaperCard>
        {done.token ? (
          <PaperCard title={t('report.done.trackingCode')} borderColor="warning" borderWidth="2px">
            <Stack gap="3">
              <Text role="alert" fontWeight="600">
                {t('report.done.trackingWarn')}
              </Text>
              <Box bgColor="white" borderWidth="1px" borderColor="border" borderRadius="sm" p="3" fontFamily="mono" fontSize="sm" wordBreak="break-all" data-testid="tracking-token">
                {done.token}
              </Box>
              <FsButton size="sm" variant="secondary" alignSelf="flex-start" onClick={() => copy(done.token as string, 'token')}>
                {copied === 'token' ? t('common.copied') : t('common.copy')}
              </FsButton>
              <Checkbox.Root checked={savedCode} onCheckedChange={(e) => setSavedCode(e.checked === true)}>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{t('report.done.saved')}</Checkbox.Label>
              </Checkbox.Root>
              <Checkbox.Root checked={saveOnDevice} onCheckedChange={(e) => setSaveOnDevice(e.checked === true)}>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{t('report.done.saveOnDevice')}</Checkbox.Label>
              </Checkbox.Root>
              <FsButton disabled={!savedCode} onClick={finish}>
                {t('report.done.finish')}
              </FsButton>
            </Stack>
          </PaperCard>
        ) : (
          <Stack gap="3">
            <Text>{t('report.done.namedNote')}</Text>
            {done.fileWarning && (
              <Text role="alert" color="warning" fontWeight="600">
                {t('report.errors.uploadFailed')}
              </Text>
            )}
            <FsButton asChild>
              <NextLink href={`/report/${done.reference}`}>{t('report.done.viewReport')}</NextLink>
            </FsButton>
          </Stack>
        )}
      </Stack>
    );
  }

  /* ── wizard ────────────────────────────────────────────────────────────── */
  const titles = ['category', 'mode', 'details', 'review'] as const;
  return (
    <Stack gap="4">
      <Box>
        <Text fontSize="sm" color="fg.muted" aria-live="polite">
          {t('report.step', { n: step })}
        </Text>
        <Heading as="h1" fontFamily="heading" size="xl">
          {t(`report.steps.${titles[step - 1]}`)}
        </Heading>
        <HStack gap="1" mt="2" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <Box key={n} flex="1" h="6px" borderRadius="full" bgColor={n <= step ? 'ledger.solid' : 'bg.muted'} />
          ))}
        </HStack>
      </Box>

      {error && (
        <Text role="alert" color="danger" fontWeight="600">
          {t(error)}
        </Text>
      )}

      {step === 1 && (
        <Stack gap="3">
          <RadioCard.Root value={category} onValueChange={(e) => setCategory(e.value as Category)} colorPalette="ledger">
            <RadioCard.Label srOnly>{t('report.steps.category')}</RadioCard.Label>
            <Stack gap="2">
              {CATEGORIES.map((c) => (
                <RadioCard.Item key={c} value={c} bgColor="bg.surface" borderColor="border">
                  <RadioCard.ItemHiddenInput />
                  <RadioCard.ItemControl p="4" alignItems="center">
                    <RadioCard.ItemContent>
                      <RadioCard.ItemText fontWeight="600">{t(`report.category.${c}`)}</RadioCard.ItemText>
                    </RadioCard.ItemContent>
                    <RadioCard.ItemIndicator />
                  </RadioCard.ItemControl>
                </RadioCard.Item>
              ))}
            </Stack>
          </RadioCard.Root>
          {category === 'physical_hazard' && (
            <Box role="note" borderWidth="2px" borderColor="danger" borderRadius="md" p="3" fontWeight="600" bgColor="#FDECEA">
              {t('report.urgent')}
            </Box>
          )}
        </Stack>
      )}

      {step === 2 && <ModeSelector value={mode} onChange={setMode} />}

      {step === 3 && (
        <Stack gap="4">
          <Field.Root>
            <Field.Label>{t('report.severity.label')}</Field.Label>
            <SegmentGroup.Root value={severity} onValueChange={(e) => e.value && setSeverity(e.value as Severity)} w="full">
              <SegmentGroup.Indicator />
              <SegmentGroup.Items items={SEVERITIES.map((s) => ({ value: s, label: t(`report.severity.${s}`) }))} minH="44px" />
            </SegmentGroup.Root>
          </Field.Root>
          {urgent && (
            <Box role="note" borderWidth="2px" borderColor="danger" borderRadius="md" p="3" fontWeight="600" bgColor="#FDECEA">
              {t('report.urgent')}
            </Box>
          )}
          <Field.Root required invalid={error === 'report.errors.tooShort'}>
            <Field.Label>{t('report.description')}</Field.Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={4000} bgColor="white" />
            <Field.HelperText>{t('report.descriptionHelp')}</Field.HelperText>
          </Field.Root>
          <Field.Root>
            <Field.Label>{t('report.location')}</Field.Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} minH="48px" bgColor="white" />
          </Field.Root>
          {anonymous ? (
            <Text fontSize="sm" color="fg.muted">
              {t('report.attachmentsOff')}
            </Text>
          ) : (
            <Field.Root>
              <Field.Label>{t('report.attachments')}</Field.Label>
              <Input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => pickFiles(e.target.files)} pt="2" bgColor="white" />
              <Field.HelperText>{t('report.attachmentsHelp')}</Field.HelperText>
            </Field.Root>
          )}
        </Stack>
      )}

      {step === 4 && (
        <PaperCard title={t('report.reviewTitle')}>
          <Stack gap="2">
            <Text><b>{t('report.steps.category')}</b> {category && t(`report.category.${category}`)}</Text>
            <Text><b>{t('report.mode.label')}</b> {mode && t(`report.mode.${mode}.title`)}</Text>
            {mode && <Text fontSize="sm" color="fg.muted">{t(`report.mode.${mode}.privacy`)}</Text>}
            <Text><b>{t('report.severity.label')}</b> {t(`report.severity.${severity}`)}</Text>
            <Text whiteSpace="pre-wrap">{description}</Text>
            {location && <Text color="fg.muted">{location}</Text>}
            {files.length > 0 && <Text fontSize="sm">{files.map((f) => f.name).join(', ')}</Text>}
          </Stack>
        </PaperCard>
      )}

      <HStack gap="3">
        {step > 1 && (
          <FsButton variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={pending}>
            {t('common.back')}
          </FsButton>
        )}
        {step < 4 ? (
          <FsButton flex="1" onClick={next}>
            {t('common.next')}
          </FsButton>
        ) : (
          <FsButton flex="1" loading={pending} onClick={submit}>
            {t('report.send')}
          </FsButton>
        )}
      </HStack>
    </Stack>
  );
}
