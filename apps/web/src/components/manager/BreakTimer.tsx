import { useState, useEffect } from 'react';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  amber: '#F59E0B',
};

interface BreakTimerProps {
  expectedEnd: Date | string;
  onExpired?: () => void;
}

export function BreakTimer({ expectedEnd, onExpired }: BreakTimerProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const endTime = new Date(expectedEnd).getTime();

    const updateRemaining = () => {
      const diff = endTime - Date.now();
      const mins = Math.ceil(diff / 60000);
      setRemaining(mins);

      if (diff <= 0 && onExpired) {
        onExpired();
      }
    };

    // Initial update
    updateRemaining();

    // Update every second for accurate countdown
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expectedEnd, onExpired]);

  const isOvertime = remaining <= 0;

  return (
    <div
      className="flex items-center gap-1"
      style={{ color: isOvertime ? SG_COLORS.red : SG_COLORS.amber }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
        {isOvertime ? 'warning' : 'timer'}
      </span>
      <span className="text-sm font-medium">
        {isOvertime ? 'Dépassé!' : `${remaining} min`}
      </span>
    </div>
  );
}

// Break reason labels and icons
export const BREAK_REASON_LABELS: Record<string, { label: string; icon: string }> = {
  lunch: { label: 'Déjeuner', icon: '🍽️' },
  prayer: { label: 'Prière', icon: '🕌' },
  personal: { label: 'Personnel', icon: '👤' },
  urgent: { label: 'Urgent', icon: '⚡' },
};
