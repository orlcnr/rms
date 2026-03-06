'use client';

import { useEffect } from 'react';
import { AppErrorScreen } from '@/modules/shared/components/AppErrorScreen';
import { classifyAppError } from '@/modules/shared/errors/classify-error';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const presentation = classifyAppError(error);

  useEffect(() => {
    if (!presentation.autoRetry) {
      return;
    }
    const timer = window.setInterval(() => {
      reset();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [presentation.autoRetry, reset]);

  return (
    <AppErrorScreen
      presentation={presentation}
      onRetry={reset}
      referenceCode={error.digest}
    />
  );
}
