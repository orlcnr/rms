'use client';

interface QuickNumPadProps {
  value: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onFillFullAmount: () => void;
  canFillFullAmount?: boolean;
  fillButtonTitle?: string;
}

export function QuickNumPad({
  value,
  onDigit,
  onDelete,
  onFillFullAmount,
  canFillFullAmount = true,
  fillButtonTitle,
}: QuickNumPadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

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

        {/* Fill remaining */}
        <button
          onClick={onFillFullAmount}
          disabled={!canFillFullAmount}
          title={fillButtonTitle}
          className="col-span-2 h-14 flex items-center justify-center bg-success-main text-white 
            hover:bg-success-hover rounded-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-sm font-black tracking-wider">TAM</span>
        </button>
      </div>
    </div>
  );
}
