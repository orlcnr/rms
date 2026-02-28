'use client';

import { Check } from 'lucide-react';

interface QuickNumPadProps {
  value: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onConfirm: () => void;
}

export function QuickNumPad({
  value,
  onDigit,
  onDelete,
  onClear,
  onConfirm,
}: QuickNumPadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ','];

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="text-center p-3 bg-bg-surface border border-border-light rounded-sm">
        <span className="text-2xl font-black text-text-primary">{value}</span>
        <span className="text-lg font-bold text-text-muted ml-1">TL</span>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit) => (
          <button
            key={digit}
            onClick={() => onDigit(digit)}
            className="h-14 text-xl font-bold bg-bg-surface border border-border-light 
              hover:bg-primary-main/10 hover:border-primary-main rounded-sm transition-colors"
          >
            {digit}
          </button>
        ))}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="h-14 flex items-center justify-center bg-bg-muted border border-border-light 
            hover:bg-danger-main/10 hover:border-danger-main rounded-sm transition-colors"
        >
          <span className="text-lg font-bold text-text-secondary">⌫</span>
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="h-14 flex items-center justify-center bg-bg-muted border border-border-light 
            hover:bg-warning-main/10 rounded-sm transition-colors"
        >
          <span className="text-xs font-bold text-text-secondary">TEMİZLE</span>
        </button>

        {/* Confirm */}
        <button
          onClick={onConfirm}
          className="h-14 flex items-center justify-center bg-success-main text-white 
            hover:bg-success-hover rounded-sm transition-colors"
        >
          <Check className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
