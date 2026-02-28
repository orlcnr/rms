'use client';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          isConnected ? 'bg-success-main animate-pulse' : 'bg-danger-main'
        }`}
        title={isConnected ? 'Canlı veri aktarımı aktif' : 'Bağlantı kesildi'}
      />
      <span className="text-xs text-text-secondary">
        {isConnected ? 'Canlı' : 'Bağlantı koptu'}
      </span>
    </div>
  );
}
