'use client';

import { useDashboardStore } from '../store/dashboard.store';

interface KitchenLoadMeterProps {
  className?: string;
}

export function KitchenLoadMeter({ className }: KitchenLoadMeterProps) {
  const kitchenLoad = useDashboardStore((state) => state.kitchenLoad);

  if (!kitchenLoad) {
    return (
      <div className={`p-4 bg-bg-surface border border-border-light rounded-sm ${className}`}>
        <div className="text-sm font-semibold text-text-secondary mb-2">Mutfak Kapasitesi</div>
        <div className="text-xs text-text-muted">Veri yükleniyor...</div>
      </div>
    );
  }

  const { preparingCount, readyCount, totalCapacity, loadPercentage } = kitchenLoad;

  // Determine color based on load percentage
  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return 'bg-danger-main';
    if (percentage >= 60) return 'bg-warning-main';
    return 'bg-success-main';
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 80) return 'Kritik';
    if (percentage >= 60) return 'Dikkat';
    return 'Normal';
  };

  return (
    <div className={`p-4 bg-bg-surface border border-border-light rounded-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-text-secondary">Mutfak Kapasitesi</span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            loadPercentage >= 80
              ? 'bg-danger-main/10 text-danger-main'
              : loadPercentage >= 60
              ? 'bg-warning-main/10 text-warning-main'
              : 'bg-success-main/10 text-success-main'
          }`}
        >
          {getStatusText(loadPercentage)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${getColorClass(loadPercentage)}`}
          style={{ width: `${Math.min(loadPercentage, 100)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          <span className="font-semibold text-text-primary">{preparingCount}</span> hazırlanıyor +{' '}
          <span className="font-semibold text-text-primary">{readyCount}</span> hazır
        </span>
        <span className="font-bold text-text-primary">
          {loadPercentage}% / {totalCapacity}
        </span>
      </div>
    </div>
  );
}
