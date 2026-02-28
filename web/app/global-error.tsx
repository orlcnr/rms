'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Bir hata oluştu!
            </h2>
            <p className="text-gray-600 mb-6">
              {error.message || 'Beklenmeyen bir hata oluştu'}
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
