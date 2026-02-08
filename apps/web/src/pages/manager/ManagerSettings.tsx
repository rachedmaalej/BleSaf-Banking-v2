import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { adminApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  green: '#10B981',
  amber: '#F59E0B',
};

interface DailyTarget {
  servedTarget: number;
  avgWaitTarget: number;
  slaTarget: number;
  slaThreshold: number;
}

interface BranchData {
  id: string;
  name: string;
  notifyAtPosition: number;
  autoQueueEnabled: boolean;
  openingTime: string | null;
  closingTime: string | null;
  closedOnWeekends: boolean;
}

export default function ManagerSettings() {
  const { t } = useTranslation();
  const { branch } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [branchData, setBranchData] = useState<BranchData | null>(null);
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>({
    servedTarget: 100,
    avgWaitTarget: 10,
    slaTarget: 90,
    slaThreshold: 15,
  });
  const [editingTargets, setEditingTargets] = useState(false);
  const [editedTarget, setEditedTarget] = useState<DailyTarget>(dailyTarget);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch branch data and targets
  useEffect(() => {
    if (!branch?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [branchRes, targetRes] = await Promise.all([
          adminApi.getBranch(branch.id),
          adminApi.getBranchTarget(branch.id),
        ]);

        setBranchData(branchRes.data.data);
        if (targetRes.data.data) {
          const target = {
            servedTarget: targetRes.data.data.servedTarget || 100,
            avgWaitTarget: targetRes.data.data.avgWaitTarget || 10,
            slaTarget: targetRes.data.data.slaTarget || 90,
            slaThreshold: targetRes.data.data.slaThreshold || 15,
          };
          setDailyTarget(target);
          setEditedTarget(target);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setToast({ message: 'Erreur lors du chargement des parametres', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [branch?.id]);

  const handleSaveTargets = async () => {
    if (!branch?.id) return;

    setIsSaving(true);
    try {
      await adminApi.updateBranchTarget(branch.id, editedTarget);
      setDailyTarget(editedTarget);
      setEditingTargets(false);
      setToast({ message: 'Objectifs mis a jour avec succes', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Failed to update targets:', error);
      setToast({ message: 'Erreur lors de la mise a jour', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTarget(dailyTarget);
    setEditingTargets(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: '24px', color: SG_COLORS.gray }}
          >
            progress_activity
          </span>
          <span style={{ color: SG_COLORS.gray }}>Chargement...</span>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="text-center">
          <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '48px' }}>
            store_off
          </span>
          <p className="mt-2 text-gray-600">{t('manager.noBranchAssigned')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: SG_COLORS.black }}>
              settings
            </span>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: SG_COLORS.black }}>
                Parametres de l'agence
              </h1>
              <p className="text-sm" style={{ color: SG_COLORS.gray }}>
                {branch.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Daily Targets Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: SG_COLORS.red, fontSize: '22px' }}>
                target
              </span>
              <h2 className="font-semibold" style={{ color: SG_COLORS.black }}>
                Objectifs du jour
              </h2>
            </div>
            {!editingTargets ? (
              <button
                onClick={() => setEditingTargets(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: SG_COLORS.black }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  edit
                </span>
                Modifier
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-gray-100"
                  style={{ color: SG_COLORS.gray }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTargets}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: SG_COLORS.black }}
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      check
                    </span>
                  )}
                  Enregistrer
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Served Target */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                <label className="block text-sm font-medium mb-2" style={{ color: SG_COLORS.gray }}>
                  Clients servis
                </label>
                {editingTargets ? (
                  <input
                    type="number"
                    value={editedTarget.servedTarget}
                    onChange={(e) =>
                      setEditedTarget({ ...editedTarget, servedTarget: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    max={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                ) : (
                  <p className="text-2xl font-semibold" style={{ color: SG_COLORS.black }}>
                    {dailyTarget.servedTarget} <span className="text-sm font-normal" style={{ color: SG_COLORS.gray }}>/ jour</span>
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                  Objectif de clients a servir aujourd'hui
                </p>
              </div>

              {/* Avg Wait Target */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                <label className="block text-sm font-medium mb-2" style={{ color: SG_COLORS.gray }}>
                  Temps d'attente cible
                </label>
                {editingTargets ? (
                  <input
                    type="number"
                    value={editedTarget.avgWaitTarget}
                    onChange={(e) =>
                      setEditedTarget({ ...editedTarget, avgWaitTarget: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    max={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                ) : (
                  <p className="text-2xl font-semibold" style={{ color: SG_COLORS.black }}>
                    {dailyTarget.avgWaitTarget} <span className="text-sm font-normal" style={{ color: SG_COLORS.gray }}>min</span>
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                  Temps d'attente moyen souhaite
                </p>
              </div>

              {/* SLA Target */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                <label className="block text-sm font-medium mb-2" style={{ color: SG_COLORS.gray }}>
                  Objectif SLA
                </label>
                {editingTargets ? (
                  <input
                    type="number"
                    value={editedTarget.slaTarget}
                    onChange={(e) =>
                      setEditedTarget({ ...editedTarget, slaTarget: parseInt(e.target.value) || 0 })
                    }
                    min={50}
                    max={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                ) : (
                  <p className="text-2xl font-semibold" style={{ color: SG_COLORS.black }}>
                    {dailyTarget.slaTarget}<span className="text-sm font-normal" style={{ color: SG_COLORS.gray }}>%</span>
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                  % de clients servis dans le delai
                </p>
              </div>

              {/* SLA Threshold */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
                <label className="block text-sm font-medium mb-2" style={{ color: SG_COLORS.gray }}>
                  Seuil SLA
                </label>
                {editingTargets ? (
                  <input
                    type="number"
                    value={editedTarget.slaThreshold}
                    onChange={(e) =>
                      setEditedTarget({ ...editedTarget, slaThreshold: parseInt(e.target.value) || 0 })
                    }
                    min={5}
                    max={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                ) : (
                  <p className="text-2xl font-semibold" style={{ color: SG_COLORS.black }}>
                    {dailyTarget.slaThreshold} <span className="text-sm font-normal" style={{ color: SG_COLORS.gray }}>min</span>
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: SG_COLORS.gray }}>
                  Delai maximum acceptable
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section (Read-only) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: SG_COLORS.amber, fontSize: '22px' }}>
                notifications
              </span>
              <h2 className="font-semibold" style={{ color: SG_COLORS.black }}>
                Notifications
              </h2>
            </div>
            <span
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
              style={{ backgroundColor: '#F3F4F6', color: SG_COLORS.gray }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                lock
              </span>
              Admin
            </span>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium" style={{ color: SG_COLORS.black }}>
                  Position de notification
                </p>
                <p className="text-sm" style={{ color: SG_COLORS.gray }}>
                  Notifier le client X positions avant son tour
                </p>
              </div>
              <p className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
                {branchData?.notifyAtPosition || 2} positions
              </p>
            </div>

            <div
              className="mt-3 flex items-start gap-2 p-3 rounded-lg"
              style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#92400E' }}>
                info
              </span>
              <p className="text-sm" style={{ color: '#92400E' }}>
                Contactez l'administrateur de la banque pour modifier ce parametre.
              </p>
            </div>
          </div>
        </div>

        {/* Operating Hours Section (Read-only) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: SG_COLORS.green, fontSize: '22px' }}>
                schedule
              </span>
              <h2 className="font-semibold" style={{ color: SG_COLORS.black }}>
                Horaires d'ouverture
              </h2>
            </div>
            <span
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
              style={{ backgroundColor: '#F3F4F6', color: SG_COLORS.gray }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                lock
              </span>
              Admin
            </span>
          </div>

          <div className="p-4">
            {branchData?.autoQueueEnabled ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <p style={{ color: SG_COLORS.gray }}>Ouverture</p>
                  <p className="font-medium" style={{ color: SG_COLORS.black }}>
                    {branchData.openingTime || '08:30'}
                  </p>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <p style={{ color: SG_COLORS.gray }}>Fermeture</p>
                  <p className="font-medium" style={{ color: SG_COLORS.black }}>
                    {branchData.closingTime || '16:30'}
                  </p>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <p style={{ color: SG_COLORS.gray }}>Ferme le weekend</p>
                  <p className="font-medium" style={{ color: SG_COLORS.black }}>
                    {branchData.closedOnWeekends ? 'Oui' : 'Non'}
                  </p>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <p style={{ color: SG_COLORS.gray }}>Gestion automatique</p>
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
                  >
                    Activee
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '36px' }}>
                  schedule_off
                </span>
                <p className="mt-2" style={{ color: SG_COLORS.gray }}>
                  Gestion automatique desactivee
                </p>
                <p className="text-sm" style={{ color: SG_COLORS.gray }}>
                  Les horaires sont geres manuellement
                </p>
              </div>
            )}

            <div
              className="mt-4 flex items-start gap-2 p-3 rounded-lg"
              style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#92400E' }}>
                info
              </span>
              <p className="text-sm" style={{ color: '#92400E' }}>
                Contactez l'administrateur de la banque pour modifier les horaires.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
