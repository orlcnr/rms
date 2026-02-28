'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ConnectionStatusProps {
  isConnected: boolean;
  isSyncing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ConnectionStatus({ isConnected, isSyncing, onRefresh, className }: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (isSyncing) return "bg-warning-main";
    return isConnected ? "bg-success-main" : "bg-danger-main";
  };

  const getStatusText = () => {
    if (isSyncing) return "Senkronize Ediliyor...";
    return isConnected ? "Socket Bağlantısı Aktif" : "Socket Bağlantısı Kesildi";
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        onClick={onRefresh}
        className="p-1.5 hover:bg-bg-hover rounded-sm transition-colors text-text-muted"
        title="Yenile"
      >
        <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
      </button>

      <div
        className="flex items-center gap-2"
        title={isSyncing ? "Veri sunucuya yazılıyor..." : undefined}
      >
        <div className="relative flex h-2 w-2">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            getStatusColor()
          )}></span>
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            getStatusColor(),
            isSyncing && "animate-pulse"
          )}></span>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
}
