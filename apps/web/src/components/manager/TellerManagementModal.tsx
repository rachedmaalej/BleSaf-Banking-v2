import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { adminApi } from '@/lib/api';
import { TellerFormModal } from './TellerFormModal';
import { useAuthStore } from '@/stores/authStore';

// SG Brand Colors - V1 Monochrome
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  roseBg: 'rgba(214, 104, 116, 0.1)',
  blackBg: 'rgba(26, 26, 26, 0.05)',
};

interface Teller {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface TellerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onTellerUpdated: () => void;
}

export function TellerManagementModal({
  isOpen,
  onClose,
  branchId,
  onTellerUpdated,
}: TellerManagementModalProps) {
  const { user } = useAuthStore();
  const isBankAdmin = user?.role === 'bank_admin';

  const [tellers, setTellers] = useState<Teller[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTeller, setEditingTeller] = useState<Teller | null>(null);

  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'reactivate';
    teller: Teller;
  } | null>(null);

  // Fetch tellers when modal opens
  useEffect(() => {
    if (isOpen && branchId) {
      fetchTellers();
    }
  }, [isOpen, branchId]);

  const fetchTellers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.listTellers(branchId);
      setTellers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des guichetiers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (teller: Teller) => {
    setActionLoading(teller.id);
    try {
      await adminApi.deactivateTeller(teller.id);
      await fetchTellers();
      onTellerUpdated();
      setConfirmAction(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la désactivation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (teller: Teller) => {
    setActionLoading(teller.id);
    try {
      await adminApi.reactivateTeller(teller.id);
      await fetchTellers();
      onTellerUpdated();
      setConfirmAction(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la réactivation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (teller: Teller) => {
    setEditingTeller(teller);
    setFormModalOpen(true);
  };

  const handleAdd = () => {
    setEditingTeller(null);
    setFormModalOpen(true);
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setEditingTeller(null);
    fetchTellers();
    onTellerUpdated();
  };

  const activeTellers = tellers.filter((t) => t.status === 'active');
  const inactiveTellers = tellers.filter((t) => t.status !== 'active');

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                  {/* Header */}
                  <div
                    className="px-6 py-4 border-b"
                    style={{ backgroundColor: SG_COLORS.blackBg }}
                  >
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                        <span
                          className="material-symbols-outlined"
                          style={{ color: SG_COLORS.black }}
                        >
                          manage_accounts
                        </span>
                        <span style={{ color: SG_COLORS.black }}>
                          Gestion des guichetiers
                        </span>
                      </Dialog.Title>
                      {isBankAdmin && (
                        <button
                          onClick={handleAdd}
                          className="px-3 py-1.5 text-sm font-medium text-white rounded-lg flex items-center gap-1"
                          style={{ backgroundColor: SG_COLORS.black }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            person_add
                          </span>
                          Ajouter
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                      </div>
                    ) : error ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    ) : tellers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucun guichetier dans cette agence
                      </div>
                    ) : (
                      <>
                        {/* Active Tellers */}
                        {activeTellers.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">
                              Actifs ({activeTellers.length})
                            </h3>
                            <div className="space-y-2">
                              {activeTellers.map((teller) => (
                                <TellerRow
                                  key={teller.id}
                                  teller={teller}
                                  onEdit={() => handleEdit(teller)}
                                  onDeactivate={isBankAdmin ? () =>
                                    setConfirmAction({ type: 'deactivate', teller })
                                  : undefined}
                                  isLoading={actionLoading === teller.id}
                                  canDelete={isBankAdmin}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inactive Tellers */}
                        {inactiveTellers.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-400 mb-2">
                              Inactifs ({inactiveTellers.length})
                            </h3>
                            <div className="space-y-2">
                              {inactiveTellers.map((teller) => (
                                <TellerRow
                                  key={teller.id}
                                  teller={teller}
                                  onEdit={() => handleEdit(teller)}
                                  onReactivate={isBankAdmin ? () =>
                                    setConfirmAction({ type: 'reactivate', teller })
                                  : undefined}
                                  isLoading={actionLoading === teller.id}
                                  inactive
                                  canDelete={isBankAdmin}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() =>
            confirmAction.type === 'deactivate'
              ? handleDeactivate(confirmAction.teller)
              : handleReactivate(confirmAction.teller)
          }
          type={confirmAction.type}
          tellerName={confirmAction.teller.name}
          isLoading={actionLoading === confirmAction.teller.id}
        />
      )}

      {/* Form Modal */}
      <TellerFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingTeller(null);
        }}
        branchId={branchId}
        teller={editingTeller}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}

// Teller Row Component
function TellerRow({
  teller,
  onEdit,
  onDeactivate,
  onReactivate,
  isLoading,
  inactive,
  canDelete,
}: {
  teller: Teller;
  onEdit: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  isLoading: boolean;
  inactive?: boolean;
  canDelete?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border"
      style={{
        backgroundColor: inactive ? '#F9FAFB' : 'white',
        borderColor: inactive ? '#E5E7EB' : SG_COLORS.black,
        opacity: inactive ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{
            backgroundColor: inactive ? '#E5E7EB' : SG_COLORS.blackBg,
            color: inactive ? '#9CA3AF' : SG_COLORS.black,
          }}
        >
          {teller.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium" style={{ color: SG_COLORS.black }}>
            {teller.name}
          </div>
          <div className="text-xs text-gray-500">{teller.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Modifier"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            edit
          </span>
        </button>
        {canDelete && (
          inactive ? (
            <button
              onClick={onReactivate}
              disabled={isLoading}
              className="p-2 rounded-lg transition-colors"
              style={{ color: SG_COLORS.black, backgroundColor: SG_COLORS.blackBg }}
              title="Réactiver"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  person_add
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={onDeactivate}
              disabled={isLoading}
              className="p-2 rounded-lg transition-colors"
              style={{ color: SG_COLORS.rose, backgroundColor: SG_COLORS.roseBg }}
              title="Désactiver"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  person_remove
                </span>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// Confirmation Dialog
function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  tellerName,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'deactivate' | 'reactivate';
  tellerName: string;
  isLoading: boolean;
}) {
  const isDeactivate = type === 'deactivate';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      backgroundColor: isDeactivate ? SG_COLORS.roseBg : SG_COLORS.blackBg,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '24px',
                        color: isDeactivate ? SG_COLORS.rose : SG_COLORS.black,
                      }}
                    >
                      {isDeactivate ? 'person_remove' : 'person_add'}
                    </span>
                  </div>
                  <Dialog.Title className="text-lg font-semibold text-center mb-2">
                    {isDeactivate ? 'Désactiver le guichetier ?' : 'Réactiver le guichetier ?'}
                  </Dialog.Title>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    {isDeactivate
                      ? `${tellerName} ne pourra plus se connecter ni servir des clients.`
                      : `${tellerName} pourra à nouveau se connecter et servir des clients.`}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={onConfirm}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: isDeactivate ? SG_COLORS.rose : SG_COLORS.black,
                      }}
                    >
                      {isLoading ? (
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                          progress_activity
                        </span>
                      ) : (
                        <span>{isDeactivate ? 'Désactiver' : 'Réactiver'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
