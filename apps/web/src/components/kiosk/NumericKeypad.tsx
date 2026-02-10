import { useState, useCallback } from 'react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxDigits?: number;
  accentColor?: string;
  showConfirm?: boolean;
  confirmDisabled?: boolean;
}

export default function NumericKeypad({
  value,
  onChange,
  onSubmit,
  maxDigits = 8,
  accentColor = '#8DC7DE',
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
    <>
      <style>{`
        @keyframes keyFlash {
          0% { transform: scale(1); }
          40% { transform: scale(0.93); }
          100% { transform: scale(1); }
        }
        .kpad-flash {
          animation: keyFlash 0.18s ease-out;
        }
      `}</style>
      <div
        className="grid grid-cols-3 gap-1.5 sm:gap-2.5 flex-1"
        style={{ width: '100%', gridTemplateRows: 'repeat(4, 1fr)' }}
      >
        {keys.map((key) => {
          if (key === 'empty') {
            return <div key={key} />;
          }

          if (key === 'backspace') {
            const isPressed = pressedKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { handleBackspace(); triggerPress(key); }}
                disabled={value.length === 0}
                className={`flex items-center justify-center rounded-xl sm:rounded-2xl transition-colors disabled:opacity-20 ${isPressed ? 'kpad-flash' : ''}`}
                style={{
                  height: '100%',
                  minHeight: '44px',
                  backgroundColor: isPressed ? `${accentColor}20` : '#F3F4F6',
                  border: '1.5px solid #E5E7EB',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px', color: '#6B7280' }}
                >
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
                className="flex items-center justify-center rounded-xl sm:rounded-2xl transition-all disabled:opacity-30"
                style={{
                  height: '100%',
                  minHeight: '44px',
                  backgroundColor: '#E9041E',
                  border: '1.5px solid #E9041E',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '28px', color: 'white' }}
                >
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
              className={`flex items-center justify-center rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-medium transition-colors ${isPressed ? 'kpad-flash' : ''}`}
              style={{
                height: '100%',
                minHeight: '44px',
                backgroundColor: isPressed ? `${accentColor}25` : '#FFFFFF',
                border: `1.5px solid ${isPressed ? accentColor : '#E5E7EB'}`,
                color: '#1A1A1A',
                boxShadow: isPressed ? `0 0 0 3px ${accentColor}15` : '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </>
  );
}
