'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AppErrorScreen } from '@/modules/shared/components/AppErrorScreen';
import { classifyAppError } from '@/modules/shared/errors/classify-error';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const presentation = classifyAppError(error);

  useEffect(() => {
    if (presentation.kind !== 'connection' && presentation.kind !== 'server') {
      Sentry.captureException(error);
    }
  }, [error, presentation.kind]);

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
    <html>
      <body>
        <AppErrorScreen
          presentation={presentation}
          onRetry={reset}
          referenceCode={error.digest}
        />
      </body>
    </html>
  );
}
