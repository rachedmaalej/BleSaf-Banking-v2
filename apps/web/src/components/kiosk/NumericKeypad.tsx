import { useState, useCallback } from 'react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxDigits?: number;
  showConfirm?: boolean;
  confirmDisabled?: boolean;
}

export default function NumericKeypad({
  value,
  onChange,
  onSubmit,
  maxDigits = 8,
  showConfirm = false,
  confirmDisabled = true,
}: NumericKeypadProps) {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const handleDigit = useCallback((digit: string) => {
    if (value.length < maxDigits) {
      onChange(value + digit);
    }
  }, [value, maxDigits, onChange]);

  const handleBackspace = useCallback(() => {
    onChange(value.slice(0, -1));
  }, [value, onChange]);

  const triggerPress = useCallback((key: string) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 180);
  }, []);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', showConfirm ? 'confirm' : 'empty'] as const;

  return (
    <div className="grid grid-cols-3 gap-1 flex-1" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
      {keys.map((key) => {
        if (key === 'empty') return <div key={key} />;

        if (key === 'backspace') {
          const isPressed = pressedKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { handleBackspace(); triggerPress(key); }}
              disabled={value.length === 0}
              className="flex items-center justify-center rounded-md cursor-pointer transition-colors disabled:opacity-20 hover:bg-gray-200"
              style={{
                minHeight: '44px',
                backgroundColor: isPressed ? '#E5E5E5' : '#F5F5F5',
                border: '1px solid #E5E5E5',
              }}
            >
              <span className="material-symbols-outlined text-base text-dark">
                backspace
              </span>
            </button>
          );
        }

        if (key === 'confirm') {
          return (
            <button
              key={key}
              type="button"
              onClick={() => !confirmDisabled && onSubmit?.()}
              disabled={confirmDisabled}
              className="flex items-center justify-center rounded-md cursor-pointer transition-all disabled:opacity-30 bg-brand-red border-brand-red"
              style={{ minHeight: '44px' }}
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>
                send
              </span>
            </button>
          );
        }

        // Digit key
        const isPressed = pressedKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => { handleDigit(key); triggerPress(key); }}
            className="flex items-center justify-center rounded-md font-barlow-c font-semibold text-2xl text-dark cursor-pointer transition-colors hover:bg-gray-200"
            style={{
              minHeight: '44px',
              backgroundColor: isPressed ? '#E5E5E5' : '#F5F5F5',
              border: '1px solid #E5E5E5',
            }}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
