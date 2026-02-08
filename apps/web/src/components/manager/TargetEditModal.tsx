import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
};

interface TargetEditModalProps {
  branchId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentTarget?: {
    servedTarget: number;
    avgWaitTarget: number;
    slaTarget: number;
    slaThreshold: number;
  };
}

export function TargetEditModal({
  branchId,
  isOpen,
  onClose,
  onSaved,
  currentTarget,
}: TargetEditModalProps) {
  const [servedTarget, setServedTarget] = useState(100);
  const [avgWaitTarget, setAvgWaitTarget] = useState(10);
  const [slaTarget, setSlaTarget] = useState(90);
  const [slaThreshold, setSlaThreshold] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentTarget) {
      setServedTarget(currentTarget.servedTarget);
      setAvgWaitTarget(currentTarget.avgWaitTarget);
      setSlaTarget(currentTarget.slaTarget);
      setSlaThreshold(currentTarget.slaThreshold);
    }
  }, [currentTarget]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await adminApi.updateBranchTarget(branchId, {
        servedTarget,
        avgWaitTarget,
        slaTarget,
        slaThreshold,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la mise a jour');
    } finally {
      setIsLoading(false);
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
            Objectifs du jour
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

          {/* Served Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif clients servis
            </label>
            <input
              type="number"
              value={servedTarget}
              onChange={(e) => setServedTarget(parseInt(e.target.value) || 0)}
              min={1}
              max={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
            <p className="text-xs text-gray-500 mt-1">Nombre de clients a servir aujourd'hui</p>
          </div>

          {/* Avg Wait Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temps d'attente moyen cible (min)
            </label>
            <input
              type="number"
              value={avgWaitTarget}
              onChange={(e) => setAvgWaitTarget(parseInt(e.target.value) || 0)}
              min={1}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
            <p className="text-xs text-gray-500 mt-1">Temps d'attente moyen souhaite</p>
          </div>

          {/* SLA Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif SLA (%)
            </label>
            <input
              type="number"
              value={slaTarget}
              onChange={(e) => setSlaTarget(parseInt(e.target.value) || 0)}
              min={50}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
            <p className="text-xs text-gray-500 mt-1">% de clients servis dans le delai</p>
          </div>

          {/* SLA Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seuil SLA (min)
            </label>
            <input
              type="number"
              value={slaThreshold}
              onChange={(e) => setSlaThreshold(parseInt(e.target.value) || 0)}
              min={5}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
            />
            <p className="text-xs text-gray-500 mt-1">Delai maximum acceptable (minutes)</p>
          </div>
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
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
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
