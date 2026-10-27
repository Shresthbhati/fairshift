'use client';

import { RadioCard, Stack, Text } from '@chakra-ui/react';
import { useT } from '@/lib/i18n-client';

export type IncidentMode = 'identified' | 'confidential' | 'anonymous';
const MODES: IncidentMode[] = ['identified', 'confidential', 'anonymous'];

/** Each mode explains, in plain words, who can see the reporter's name and what its limits are. */
export function ModeSelector({ value, onChange }: { value: IncidentMode | ''; onChange: (mode: IncidentMode) => void }) {
  const t = useT();
  return (
    <RadioCard.Root value={value} onValueChange={(e) => e.value && onChange(e.value as IncidentMode)} colorPalette="ledger" size="md">
      <RadioCard.Label fontWeight="700" mb="2">
        {t('report.mode.label')}
      </RadioCard.Label>
      <Stack gap="3">
        {MODES.map((m) => (
          <RadioCard.Item key={m} value={m} bgColor="bg.surface" borderColor="border">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl alignItems="flex-start" gap="3" p="4">
              <RadioCard.ItemContent>
                <RadioCard.ItemText fontWeight="700">{t(`report.mode.${m}.title`)}</RadioCard.ItemText>
                <Text mt="1" fontSize="sm" color="fg.muted">
                  {t(`report.mode.${m}.privacy`)}
                </Text>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </Stack>
    </RadioCard.Root>
  );
}
