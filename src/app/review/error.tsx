'use client';

import { ErrorState } from '@/components/fs/primitives';

export default function ReviewError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
