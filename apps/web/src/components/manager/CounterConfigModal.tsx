import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
};

interface CounterConfigModalProps {
  branchId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentCount: number;
  openCounters: number; // Number of counters that are open or on_break
}

export function CounterConfigModal({
  branchId,
  isOpen,
  onClose,
  onSaved,
  currentCount,
  openCounters,
}: CounterConfigModalProps) {
  const [targetCount, setTargetCount] = useState(currentCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset target count when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetCount(currentCount);
      setError(null);
    }
  }, [isOpen, currentCount]);

  const difference = targetCount - currentCount;
  const isIncreasing = difference > 0;
  const isDecreasing = difference < 0;
  const countersToRemove = Math.abs(difference);

  // Check if reduction is blocked by open counters
  const reductionBlocked = isDecreasing && countersToRemove > (currentCount - openCounters);

  const handleSave = async () => {
    if (targetCount === currentCount) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await adminApi.configureCounters(branchId, targetCount);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncrement = () => {
    if (targetCount < 50) {
      setTargetCount(targetCount + 1);
    }
  };

  const handleDecrement = () => {
    if (targetCount > 1) {
      setTargetCount(targetCount - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
            Configurer les guichets
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current Count Display */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">Nombre actuel</p>
            <p className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>
              {currentCount} guichet{currentCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Target Count Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau nombre de guichets
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleDecrement}
                disabled={targetCount <= 1}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <input
                type="number"
                value={targetCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setTargetCount(Math.min(50, Math.max(1, val)));
                }}
                min={1}
                max={50}
                className="w-20 text-center text-2xl font-bold px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              />
              <button
                onClick={handleIncrement}
                disabled={targetCount >= 50}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          {/* Change Preview */}
          {difference !== 0 && (
            <div className={`p-3 rounded-lg ${isIncreasing ? 'bg-green-50' : 'bg-amber-50'}`}>
              {isIncreasing ? (
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                  {difference} guichet{difference > 1 ? 's' : ''} sera{difference > 1 ? 'ont' : ''} cree{difference > 1 ? 's' : ''} (G{currentCount + 1}{difference > 1 ? `-G${targetCount}` : ''})
                </p>
              ) : (
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove_circle</span>
                  {countersToRemove} guichet{countersToRemove > 1 ? 's' : ''} sera{countersToRemove > 1 ? 'ont' : ''} supprime{countersToRemove > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Warning for reduction with open counters */}
          {reductionBlocked && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
                {openCounters} guichet{openCounters > 1 ? 's sont ouverts' : ' est ouvert'}. Fermez-le{openCounters > 1 ? 's' : ''} avant de reduire.
              </p>
            </div>
          )}

          {/* Info Note */}
          {isIncreasing && (
            <p className="text-xs text-gray-500">
              Les nouveaux guichets seront assignes a tous les services actifs de l'agence.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || reductionBlocked || targetCount === currentCount}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: SG_COLORS.black }}
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                progress_activity
              </span>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
