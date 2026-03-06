'use client';

import { AppErrorPresentation } from '../errors/classify-error';

type AppErrorScreenProps = {
  presentation: AppErrorPresentation;
  onRetry: () => void;
  referenceCode?: string;
};

export function AppErrorScreen({
  presentation,
  onRetry,
  referenceCode,
}: AppErrorScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        {presentation.autoRetry ? (
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
        ) : null}

        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {presentation.title}
        </h2>

        <p className="text-gray-600 mb-3">{presentation.description}</p>

        {referenceCode ? (
          <p className="text-xs text-gray-500 mb-6">Referans: {referenceCode}</p>
        ) : (
          <div className="mb-6" />
        )}

        <button
          onClick={onRetry}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
