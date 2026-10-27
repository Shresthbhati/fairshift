'use client';

import { ErrorState } from '@/components/fs/primitives';

// Plain message, never a stack trace.
export default function WorkerError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
